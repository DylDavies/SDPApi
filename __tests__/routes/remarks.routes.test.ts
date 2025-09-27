import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

const mockRemarkService = {
    getActiveTemplate: jest.fn(),
    createRemark: jest.fn(),
};

jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'RemarkService') {
                return mockRemarkService;
            }
            return {};
        })
    }
}));

jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: 'test-user-id',
            email: 'test@tutor.com',
            displayName: 'Test User',
            firstLogin: false,
            permissions: [EPermission.REMARKS_MANAGE],
            type: EUserType.Admin,
        };
        next();
    })
}));

const app = express();
app.use(express.json());

const remarksRouter = require('../../src/app/routes/remarks/router').default;
app.use('/api/remarks', remarksRouter);

describe('Remarks Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/remarks/templates/active', () => {
        it('should return the active remark template', async () => {
            const mockTemplate = { name: 'Active Template' };
            mockRemarkService.getActiveTemplate.mockResolvedValue(mockTemplate);

            const response = await request(app).get('/api/remarks/templates/active');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockTemplate);
        });
    });

    describe('POST /api/remarks/:eventId', () => {
        it('should create a remark for an event', async () => {
            const eventId = 'some-event-id';
            const remarkData = { entries: [{ field: 'notes', value: 'Excellent work!' }] };
            mockRemarkService.createRemark.mockResolvedValue({ _id: 'new-remark-id', ...remarkData });

            const response = await request(app)
                .post(`/api/remarks/${eventId}`)
                .send(remarkData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id', 'new-remark-id');
        });
    });
});