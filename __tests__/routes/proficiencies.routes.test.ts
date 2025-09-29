import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import proficienciesRouter from '../../src/app/routes/proficiencies/router';
import ProficiencyService from '../../src/app/services/ProficiencyService';
import ISubject from '../../src/app/models/interfaces/ISubject.interface';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock dependencies
jest.mock('../../src/app/services/ProficiencyService');
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        // Attach a mock user to the request for the handler to use
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'test@tutor.com',
            displayName: 'Test User',
            firstLogin: false,
            permissions: [EPermission.PROFICIENCIES_MANAGE],
            type: EUserType.Admin,
        };
        next();
    }),
}));

const app = express();
app.use(express.json());
app.use('/api/proficiencies', proficienciesRouter);

describe('Proficiencies Router', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/proficiencies', () => {
        // When sending data via HTTP, a Map will be serialized to a plain object.
        // This object reflects the actual data received by the Express router.
        const profData = { name: 'Math', subjects: {} };

        it('should create or update a proficiency and return 201', async () => {
            (ProficiencyService.addOrUpdateProficiency as jest.Mock).mockResolvedValue({ ...profData, _id: 'profId' });

            const response = await request(app).post('/api/proficiencies').send(profData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            // The service should be called with the plain object from the request body.
            expect(ProficiencyService.addOrUpdateProficiency).toHaveBeenCalledWith(profData);
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app).post('/api/proficiencies').send({ name: 'Incomplete' });
            expect(response.status).toBe(400);
        });

        it('should return 500 on service error', async () => {
            (ProficiencyService.addOrUpdateProficiency as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).post('/api/proficiencies').send(profData);
            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/proficiencies/fetchAll', () => {
        it('should return 200 and a list of proficiencies', async () => {
            (ProficiencyService.getProficiencies as jest.Mock).mockResolvedValue([{ name: 'Math' }]);
            const response = await request(app).get('/api/proficiencies/fetchAll');
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });

        it('should return 500 on service error', async () => {
            (ProficiencyService.getProficiencies as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).get('/api/proficiencies/fetchAll');
            expect(response.status).toBe(500);
        });
    });

    describe('PATCH /api/proficiencies/:profId', () => {
        it('should update proficiency name and return 200', async () => {
            (ProficiencyService.updateProficiencyName as jest.Mock).mockResolvedValue({ name: 'Mathematics' });
            const response = await request(app)
                .patch('/api/proficiencies/profId123')
                .send({ newName: 'Mathematics' });
            
            expect(response.status).toBe(200);
            expect(ProficiencyService.updateProficiencyName).toHaveBeenCalledWith('profId123', 'Mathematics');
        });

        it('should return 400 if newName is missing', async () => {
            const response = await request(app).patch('/api/proficiencies/profId123').send({});
            expect(response.status).toBe(400);
        });

        it('should return 500 on service error', async () => {
            (ProficiencyService.updateProficiencyName as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).patch('/api/proficiencies/profId123').send({ newName: 'Mathematics' });
            expect(response.status).toBe(500);
        });
    });

    describe('DELETE /api/proficiencies/:profId', () => {
        it('should delete a proficiency and return 200', async () => {
            (ProficiencyService.deleteProficiency as jest.Mock).mockResolvedValue({ deletedCount: 1 });
            const response = await request(app).delete('/api/proficiencies/profId123');
            expect(response.status).toBe(200);
        });

        it('should return 400 on service error', async () => {
            (ProficiencyService.deleteProficiency as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).delete('/api/proficiencies/profId123');
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/proficiencies/:profId/subjects/:subjectKey', () => {
        const subjectData: ISubject = { name: 'Algebra', grades: ["A", "B"] };

        it('should add/update a subject and return 200', async () => {
            (ProficiencyService.addOrUpdateSubject as jest.Mock).mockResolvedValue({ name: 'Math' });
            const response = await request(app)
                .post('/api/proficiencies/profId123/subjects/alg1')
                .send(subjectData);
            
            expect(response.status).toBe(200);
            expect(ProficiencyService.addOrUpdateSubject).toHaveBeenCalledWith('profId123', 'alg1', subjectData);
        });

        it('should return 400 if subject data is incomplete', async () => {
            const response = await request(app)
                .post('/api/proficiencies/profId123/subjects/alg1')
                .send({ name: 'Algebra' }); // Missing grades
            
            expect(response.status).toBe(400);
        });

        it('should return 500 on service error', async () => {
            (ProficiencyService.addOrUpdateSubject as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app)
                .post('/api/proficiencies/profId123/subjects/alg1')
                .send(subjectData);
            expect(response.status).toBe(500);
        });
    });

    describe('DELETE /api/proficiencies/:profId/subjects/:subjectKey', () => {
        it('should delete a subject and return 200', async () => {
            (ProficiencyService.deleteSubject as jest.Mock).mockResolvedValue({ name: 'Math' });
            const response = await request(app).delete('/api/proficiencies/profId123/subjects/alg1');
            
            expect(response.status).toBe(200);
            expect(ProficiencyService.deleteSubject).toHaveBeenCalledWith('profId123', 'alg1');
        });

        it('should return 500 on service error', async () => {
            (ProficiencyService.deleteSubject as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).delete('/api/proficiencies/profId123/subjects/alg1');
            expect(response.status).toBe(500);
        });
    });
});

