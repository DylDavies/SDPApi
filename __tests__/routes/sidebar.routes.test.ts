import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock the sidebar model
const mockMSidebar = {
    find: jest.fn(),
    deleteMany: jest.fn(),
    insertMany: jest.fn(),
};

jest.mock('../../src/app/db/models/MSidebar.model', () => ({
    __esModule: true,
    default: mockMSidebar,
}));

jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'test@tutor.com',
            displayName: 'Test User',
            firstLogin: false,
            permissions: [EPermission.SIDEBAR_MANAGE],
            type: EUserType.Admin,
        };
        next();
    }),
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
        next();
    }),
}));

const app = express();
app.use(express.json());

const sidebarRouter = require('../../src/app/routes/sidebar/router').default;
app.use('/api/sidebar', sidebarRouter);

describe('Sidebar Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/sidebar', () => {
        it('should return all sidebar items sorted by order', async () => {
            const mockSidebarItems = [
                { _id: new Types.ObjectId().toHexString(), name: 'Dashboard', order: 1, path: '/dashboard' },
                { _id: new Types.ObjectId().toHexString(), name: 'Users', order: 2, path: '/users' },
                { _id: new Types.ObjectId().toHexString(), name: 'Reports', order: 3, path: '/reports' }
            ];

            mockMSidebar.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSidebarItems),
            });

            const response = await request(app).get('/api/sidebar');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockSidebarItems);
            expect(mockMSidebar.find).toHaveBeenCalled();
        });

        it('should handle errors when fetching sidebar items', async () => {
            mockMSidebar.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('Database error')),
            });

            const response = await request(app).get('/api/sidebar');

            expect(response.status).toBe(500);
        });

        it('should return empty array when no sidebar items exist', async () => {
            mockMSidebar.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([]),
            });

            const response = await request(app).get('/api/sidebar');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('PUT /api/sidebar', () => {
        it('should update sidebar items successfully', async () => {
            const newSidebarItems = [
                { name: 'Dashboard', order: 1, path: '/dashboard' },
                { name: 'Users', order: 2, path: '/users' },
                { name: 'Settings', order: 3, path: '/settings' }
            ];

            mockMSidebar.deleteMany.mockResolvedValue({ deletedCount: 3 });
            mockMSidebar.insertMany.mockResolvedValue(newSidebarItems);

            const response = await request(app)
                .put('/api/sidebar')
                .send(newSidebarItems);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(newSidebarItems);
            expect(mockMSidebar.deleteMany).toHaveBeenCalledWith({});
            expect(mockMSidebar.insertMany).toHaveBeenCalledWith(newSidebarItems);
        });

        it('should handle errors during sidebar update', async () => {
            const newSidebarItems = [
                { name: 'Dashboard', order: 1, path: '/dashboard' }
            ];

            mockMSidebar.deleteMany.mockRejectedValue(new Error('Delete failed'));

            const response = await request(app)
                .put('/api/sidebar')
                .send(newSidebarItems);

            expect(response.status).toBe(500);
        });

        it('should handle empty sidebar items array', async () => {
            const emptySidebarItems: any[] = [];

            mockMSidebar.deleteMany.mockResolvedValue({ deletedCount: 0 });
            mockMSidebar.insertMany.mockResolvedValue([]);

            const response = await request(app)
                .put('/api/sidebar')
                .send(emptySidebarItems);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
            expect(mockMSidebar.deleteMany).toHaveBeenCalledWith({});
            expect(mockMSidebar.insertMany).toHaveBeenCalledWith([]);
        });

        it('should handle insertMany errors after successful deleteMany', async () => {
            const newSidebarItems = [
                { name: 'Dashboard', order: 1, path: '/dashboard' }
            ];

            mockMSidebar.deleteMany.mockResolvedValue({ deletedCount: 3 });
            mockMSidebar.insertMany.mockRejectedValue(new Error('Insert failed'));

            const response = await request(app)
                .put('/api/sidebar')
                .send(newSidebarItems);

            expect(response.status).toBe(500);
            expect(mockMSidebar.deleteMany).toHaveBeenCalledWith({});
            expect(mockMSidebar.insertMany).toHaveBeenCalledWith(newSidebarItems);
        });
    });
});