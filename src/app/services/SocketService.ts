import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { LoggingService } from './LoggingService';
import { Singleton } from '../models/classes/Singleton';
import { ESocketMessage } from '../models/enums/ESocketMessage.enum';
import IPayloadUser from '../models/interfaces/IPayloadUser.interface';
import jwt from 'jsonwebtoken';
import { EPermission } from '../models/enums/EPermission.enum';
import UserService from './UserService';
import { EUserType } from '../models/enums/EUserType.enum';

/**
 * Manages the WebSocket server instance using Socket.IO.
 * This service provides a way to broadcast real-time events to all connected clients.
 */
export class SocketService {
    private io: Server | null = null;
    private logger = Singleton.getInstance(LoggingService);

    private topicPermissions: { [topic in ESocketMessage]?: EPermission } = {
        [ESocketMessage.UsersUpdated]: EPermission.USERS_VIEW
    };

    /**
     * Initializes the Socket.IO server and attaches it to the existing HTTP server.
     * @param httpServer The core Node.js HTTP server instance from your Express app.
     */
    public init(httpServer: HttpServer): void {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL,
                methods: ["GET", "POST"]
            }
        });

        this.io.on('connection', (socket: Socket) => {
            this.logger.info(`New client connected: ${socket.id}`);
            let user: IPayloadUser | null = null;

            socket.on('authenticate', (token: string) => {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IPayloadUser;
                    user = decoded;
                    socket.join(user.id);
                    this.logger.info(`Client ${socket.id} authenticated and joined room ${user.id}`);
                } catch (error) {
                    this.logger.error('Socket authentication error:', error);
                    socket.disconnect();
                }
            });

            socket.on('subscribe', async (topic: ESocketMessage) => {
                if (user) {
                    if (await this.hasPermission(user, topic)) {
                        socket.join(topic);
                        this.logger.info(`Client ${socket.id} subscribed to topic: ${topic}`);
                    } else {
                        this.logger.warn(`Client ${socket.id} failed to subscribe to topic: ${topic} due to lack of permissions`);
                    }
                }
            });

            socket.on('unsubscribe', (topic: string) => {
                socket.leave(topic);
                this.logger.info(`Client ${socket.id} unsubscribed from topic: ${topic}`);
            });

            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
            });
        });

        this.logger.info('Socket.IO server initialized.');
    }

    /**
     * Checks if a user has the required permission to subscribe to a topic.
     * @param user The user object from the JWT payload.
     * @param topic The topic the user is trying to subscribe to.
     * @returns True if the user has permission, false otherwise.
     */
    private async hasPermission(user: IPayloadUser, topic: ESocketMessage): Promise<boolean> {
        const requiredPermission = this.topicPermissions[topic];

        if (!requiredPermission) {
            return true; // No permission required for this topic
        }

        const userWithPermissions = await UserService.getUser(user.id);

        if (userWithPermissions && userWithPermissions.type == EUserType.Admin) return true;

        if (!userWithPermissions || !userWithPermissions.permissions) return false;

        return userWithPermissions.permissions.includes(requiredPermission);
    }

    /**
     * Emits an event to a specific user's room.
     * @param room The room to emit the event to (user ID).
     * @param eventName The name of the event to emit.
     * @param payload The data to send with the event.
     */
    public emitToUser(room: string, eventName: ESocketMessage, payload: unknown): void {
        if (this.io) {
            this.io.to(room).emit(eventName, payload);
            this.logger.info(`Emitting event to room ${room}: ${eventName}`);
        } else {
            this.logger.warn('Attempted to emit an event, but Socket.IO is not initialized.');
        }
    }

    /**
     * Broadcasts an event and its payload to all clients subscribed to a specific topic.
     * @param topic The topic to broadcast to.
     * @param eventName The name of the event to emit.
     * @param payload The data to send with the event.
     */
    public broadcastToTopic(topic: ESocketMessage, payload: unknown): void {
        if (this.io) {
            this.io.to(topic).emit(topic, payload);
            this.logger.info(`Broadcasting event to topic ${topic}`);
        } else {
            this.logger.warn('Attempted to broadcast an event, but Socket.IO is not initialized.');
        }
    }
}

export default Singleton.getInstance(SocketService);
