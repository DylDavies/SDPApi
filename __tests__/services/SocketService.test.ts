import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SocketService } from '../../src/app/services/SocketService';
import { Singleton } from '../../src/app/models/classes/Singleton';
import { ESocketMessage } from '../../src/app/models/enums/ESocketMessage.enum';
import UserService from '../../src/app/services/UserService';
import jwt from 'jsonwebtoken';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';

// Mock dependencies
jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('../../src/app/models/classes/Singleton');
jest.mock('../../src/app/services/UserService', () => ({
    __esModule: true,
    default: {
        getUser: jest.fn()
    }
}));

const MockedSingleton = Singleton as jest.Mocked<typeof Singleton>;
const MockedServer = Server as jest.MockedClass<typeof Server>;

describe('SocketService', () => {
    let socketService: SocketService;
    let mockLogger: any;
    let mockHttpServer: HttpServer;
    let mockIo: jest.Mocked<Server>;
    let mockSocket: jest.Mocked<Partial<Socket>>;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.JWT_SECRET = 'test-secret';

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        (MockedSingleton.getInstance as jest.Mock).mockReturnValue(mockLogger);

        mockSocket = {
            id: 'socket-123',
            on: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
            disconnect: jest.fn()
        };

        mockIo = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as any;

        MockedServer.mockImplementation(() => mockIo);

        mockHttpServer = {} as HttpServer;
        socketService = new SocketService();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('init', () => {
        it('should initialize Socket.IO server with CORS configuration', () => {
            socketService.init(mockHttpServer);

            expect(Server).toHaveBeenCalledWith(mockHttpServer, {
                cors: {
                    origin: 'http://localhost:3000',
                    methods: ['GET', 'POST']
                }
            });

            expect(mockLogger.info).toHaveBeenCalledWith('Socket.IO server initialized.');
        });

        it('should set up connection event handler', () => {
            socketService.init(mockHttpServer);

            expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
        });

        it('should handle client connection', () => {
            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            expect(mockLogger.info).toHaveBeenCalledWith('New client connected: socket-123');
            expect(mockSocket.on).toHaveBeenCalledWith('authenticate', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        });

        it('should handle successful authentication', () => {
            const token = 'valid-token';
            const decodedUser = { id: 'user-123', email: 'test@example.com' };

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const authenticateHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'authenticate'
            )[1];
            authenticateHandler(token);

            expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
            expect(mockSocket.join).toHaveBeenCalledWith('user-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Client socket-123 authenticated and joined room user-123');
        });

        it('should handle authentication error and disconnect socket', () => {
            const token = 'invalid-token';
            const authError = new Error('Invalid token');

            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw authError;
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const authenticateHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'authenticate'
            )[1];
            authenticateHandler(token);

            expect(mockLogger.error).toHaveBeenCalledWith('Socket authentication error:', authError);
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should handle successful subscription with permission', async () => {
            const token = 'valid-token';
            const decodedUser = { id: 'user-123', email: 'test@example.com' };
            const topic = ESocketMessage.UsersUpdated;

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
            (UserService.getUser as jest.Mock).mockResolvedValue({
                _id: 'user-123',
                type: EUserType.Admin,
                permissions: [EPermission.USERS_VIEW]
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockSocket.join).toHaveBeenCalledWith(topic);
            expect(mockLogger.info).toHaveBeenCalledWith(`Client socket-123 subscribed to topic: ${topic}`);
        });

        it('should reject subscription without permission', async () => {
            const token = 'valid-token';
            const decodedUser = { id: 'user-123', email: 'test@example.com' };
            const topic = ESocketMessage.UsersUpdated;

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
            (UserService.getUser as jest.Mock).mockResolvedValue({
                _id: 'user-123',
                type: EUserType.Client,
                permissions: [] // No permissions
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockSocket.join).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Client socket-123 failed to subscribe to topic: ${topic} due to lack of permissions`
            );
        });

        it('should handle subscription error and disconnect socket', async () => {
            const token = 'invalid-token';
            const topic = ESocketMessage.UsersUpdated;
            const subscribeError = new Error('Invalid token');

            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw subscribeError;
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockLogger.error).toHaveBeenCalledWith('Socket subscribe error:', subscribeError);
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should allow subscription to topics with no required permissions', async () => {
            const token = 'valid-token';
            const decodedUser = { id: 'user-123', email: 'test@example.com' };
            const topic = 'UnrestrictedTopic' as ESocketMessage;

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
            (UserService.getUser as jest.Mock).mockResolvedValue({
                _id: 'user-123',
                type: EUserType.Client,
                permissions: []
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockSocket.join).toHaveBeenCalledWith(topic);
        });

        it('should handle unsubscribe', () => {
            const topic = 'test-topic';

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const unsubscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'unsubscribe'
            )[1];
            unsubscribeHandler(topic);

            expect(mockSocket.leave).toHaveBeenCalledWith(topic);
            expect(mockLogger.info).toHaveBeenCalledWith(`Client socket-123 unsubscribed from topic: ${topic}`);
        });

        it('should handle disconnect', () => {
            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'disconnect'
            )[1];
            disconnectHandler();

            expect(mockLogger.info).toHaveBeenCalledWith('Client disconnected: socket-123');
        });
    });

    describe('emitToUser', () => {
        it('should emit event to specific user room', () => {
            socketService.init(mockHttpServer);

            const room = 'user-123';
            const eventName = ESocketMessage.UsersUpdated;
            const payload = { data: 'test' };

            socketService.emitToUser(room, eventName, payload);

            expect(mockIo.to).toHaveBeenCalledWith(room);
            expect(mockIo.emit).toHaveBeenCalledWith(eventName, payload);
            expect(mockLogger.info).toHaveBeenCalledWith(`Emitting event to room ${room}: ${eventName}`);
        });

        it('should warn when attempting to emit without initialization', () => {
            const room = 'user-123';
            const eventName = ESocketMessage.UsersUpdated;
            const payload = { data: 'test' };

            socketService.emitToUser(room, eventName, payload);

            expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to emit an event, but Socket.IO is not initialized.');
        });
    });

    describe('broadcastToTopic', () => {
        it('should broadcast event to all clients in topic', () => {
            socketService.init(mockHttpServer);

            const topic = ESocketMessage.UsersUpdated;
            const payload = { data: 'test' };

            socketService.broadcastToTopic(topic, payload);

            expect(mockIo.to).toHaveBeenCalledWith(topic);
            expect(mockIo.emit).toHaveBeenCalledWith(topic, payload);
            expect(mockLogger.info).toHaveBeenCalledWith(`Broadcasting event to topic ${topic}`);
        });

        it('should warn when attempting to broadcast without initialization', () => {
            const topic = ESocketMessage.UsersUpdated;
            const payload = { data: 'test' };

            socketService.broadcastToTopic(topic, payload);

            expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to broadcast an event, but Socket.IO is not initialized.');
        });
    });

    describe('hasPermission', () => {
        it('should allow admin users regardless of permissions', async () => {
            const token = 'valid-token';
            const decodedUser = { id: 'admin-123', email: 'admin@example.com' };
            const topic = ESocketMessage.UsersUpdated;

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
            (UserService.getUser as jest.Mock).mockResolvedValue({
                _id: 'admin-123',
                type: EUserType.Admin,
                permissions: []
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockSocket.join).toHaveBeenCalledWith(topic);
        });

        it('should reject subscription when user not found', async () => {
            const token = 'valid-token';
            const decodedUser = { id: 'user-123', email: 'test@example.com' };
            const topic = ESocketMessage.UsersUpdated;

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
            (UserService.getUser as jest.Mock).mockResolvedValue(null);

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockSocket.join).not.toHaveBeenCalled();
        });

        it('should reject subscription when user has no permissions property', async () => {
            const token = 'valid-token';
            const decodedUser = { id: 'user-123', email: 'test@example.com' };
            const topic = ESocketMessage.UsersUpdated;

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);
            (UserService.getUser as jest.Mock).mockResolvedValue({
                _id: 'user-123',
                type: EUserType.Client,
                permissions: undefined
            });

            socketService.init(mockHttpServer);

            const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
            connectionHandler(mockSocket);

            const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                call => call[0] === 'subscribe'
            )[1];

            await subscribeHandler({ topic, token });

            expect(mockSocket.join).not.toHaveBeenCalled();
        });
    });
});
