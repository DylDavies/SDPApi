// __tests__/routes/documents.routes.test.ts

// Set up necessary environment variables before any imports
process.env.DO_SPACES_ACCESS_KEY_ID = 'test-key';
process.env.DO_SPACES_SECRET_ACCESS_KEY = 'test-secret';
process.env.DO_SPACES_ENDPOINT = 'test-endpoint';
process.env.DO_SPACES_REGION = 'test-region';
process.env.DO_SPACES_BUCKET_NAME = 'test-bucket';

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import documentsRouter from '../../src/app/routes/documents/router';
import FileService from '../../src/app/services/FileService';

// Mock the dependencies
jest.mock('../../src/app/services/FileService');
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: (req: Request, res: Response, next: NextFunction) => {
        (req as any).user = { id: 'test-user-id' };
        next();
    },
}));

const app = express();
app.use(express.json());
app.use('/api/documents', documentsRouter);

describe('Documents Router', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/documents/upload-url', () => {
        it('should return a pre-signed URL for a valid file type', async () => {
            (FileService.getPresignedUploadUrl as jest.Mock).mockResolvedValue({ url: 'http://example.com/upload', fileKey: '123' });

            const response = await request(app)
                .post('/api/documents/upload-url')
                .send({ filename: 'test.pdf', contentType: 'application/pdf' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url');
            expect(response.body).toHaveProperty('fileKey');
        });

        it('should return 400 for an invalid file type', async () => {
            const response = await request(app)
                .post('/api/documents/upload-url')
                .send({ filename: 'test.txt', contentType: 'text/plain' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid file type.');
        });

        it('should return 400 when filename is missing', async () => {
            const response = await request(app)
                .post('/api/documents/upload-url')
                .send({ contentType: 'application/pdf' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Filename and contentType are required.');
        });

        it('should return 500 when service throws error', async () => {
            (FileService.getPresignedUploadUrl as jest.Mock).mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .post('/api/documents/upload-url')
                .send({ filename: 'test.pdf', contentType: 'application/pdf' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error generating upload URL');
        });
    });

    describe('POST /api/documents/upload-complete', () => {
        it('should create a document record and return 201', async () => {
            (FileService.createDocumentRecord as jest.Mock).mockResolvedValue({ _id: 'doc1' });

            const response = await request(app)
                .post('/api/documents/upload-complete')
                .send({ fileKey: '123', originalFilename: 'test.pdf', contentType: 'application/pdf' });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id', 'doc1');
        });

        it('should return 400 when required fields are missing', async () => {
            const response = await request(app)
                .post('/api/documents/upload-complete')
                .send({ fileKey: '123' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('fileKey, originalFilename, and contentType are required.');
        });

        it('should return 500 when service throws error', async () => {
            (FileService.createDocumentRecord as jest.Mock).mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/documents/upload-complete')
                .send({ fileKey: '123', originalFilename: 'test.pdf', contentType: 'application/pdf' });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error finalizing upload');
        });
    });

    describe('GET /api/documents/:id/download-url', () => {
        it('should return a download URL for a valid document ID', async () => {
            (FileService.getPresignedDownloadUrl as jest.Mock).mockResolvedValue('http://example.com/download');

            const response = await request(app).get('/api/documents/doc1/download-url');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url', 'http://example.com/download');
        });

        it('should return 404 if the document is not found', async () => {
            (FileService.getPresignedDownloadUrl as jest.Mock).mockRejectedValue(new Error('Document not found.'));

            const response = await request(app).get('/api/documents/non-existent-id/download-url');

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/documents', () => {
        it('should return a list of documents', async () => {
            (FileService.getDocuments as jest.Mock).mockResolvedValue([{ _id: 'doc1' }, { _id: 'doc2' }]);

            const response = await request(app).get('/api/documents');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
        });

        it('should return 500 when service throws error', async () => {
            (FileService.getDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/documents');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching documents');
        });
    });
});