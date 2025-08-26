import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { LoggingService } from './LoggingService';
import { Singleton } from '../models/classes/Singleton';
import { ESocketMessage } from '../models/enums/ESocketMessage.enum';

/**
 * Manages the WebSocket server instance using Socket.IO.
 * This service provides a way to broadcast real-time events to all connected clients.
 */
export class SocketService {
    private io: Server | null = null;
    private logger = Singleton.getInstance(LoggingService);

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

            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
            });
        });

        this.logger.info('Socket.IO server initialized.');
    }

    /**
     * Broadcasts an event and its payload to all connected clients.
     * @param eventName The name of the event to emit (e.g., 'users-updated').
     * @param payload The data to send with the event.
     */
    public broadcast(eventName: ESocketMessage, payload: unknown): void {
        if (this.io) {
            this.io.emit(eventName, payload);
            this.logger.info(`Broadcasting event: ${eventName}`);
        } else {
            this.logger.warn('Attempted to broadcast an event, but Socket.IO is not initialized.');
        }
    }
}

export default Singleton.getInstance(SocketService);
