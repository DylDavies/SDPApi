// __tests__/services/FileService.test.ts

// Set up necessary environment variables BEFORE any imports
process.env.DO_SPACES_ACCESS_KEY_ID = 'test-key';
process.env.DO_SPACES_SECRET_ACCESS_KEY = 'test-secret';
process.env.DO_SPACES_ENDPOINT = 'test-endpoint';
process.env.DO_SPACES_REGION = 'test-region';
process.env.DO_SPACES_BUCKET_NAME = 'test-bucket';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileService } from '../../src/app/services/FileService';
import MDocument from '../../src/app/db/models/MDocument.model';
import { mocked } from 'jest-mock';
import { Types } from 'mongoose';

// Mock external dependencies
jest.mock('@aws-sdk/s3-request-presigner');

// --- THE FIX ---
// This mock factory correctly simulates the Mongoose model's behavior
const mockSave = jest.fn().mockResolvedValue(true);
jest.mock('../../src/app/db/models/MDocument.model', () => jest.fn().mockImplementation(() => ({
    save: mockSave,
})));


const getSignedUrlMock = mocked(getSignedUrl);
const MDocumentMock = MDocument as jest.Mocked<typeof MDocument>;

describe('FileService', () => {
    let fileService: FileService;

    beforeEach(() => {
        jest.clearAllMocks();
        fileService = new FileService();
    });

    describe('createDocumentRecord', () => {
        it('should create and save a new document record', async () => {
            const docData = {
                fileKey: 'test-key',
                originalFilename: 'test.pdf',
                contentType: 'application/pdf',
                userId: new Types.ObjectId().toHexString(), // Use a valid ObjectId string
            };

            await fileService.createDocumentRecord(docData.fileKey, docData.originalFilename, docData.contentType, docData.userId);
            
            expect(MDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
                fileKey: docData.fileKey,
                originalFilename: docData.originalFilename,
            }));
            expect(mockSave).toHaveBeenCalled();
        });
    });

    // The rest of the tests in this file were correct, only createDocumentRecord needed a fix
    describe('getDocuments', () => {
        it('should return a list of documents', async () => {
            const mockDocuments = [{ originalFilename: 'doc1.pdf' }];
            // To test static methods, we attach the mock to the mocked class itself
            (MDocument as any).find = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockDocuments),
            });

            const result = await fileService.getDocuments();
            expect(result).toEqual(mockDocuments);
        });
    });

    describe('getPresignedDownloadUrl', () => {
        it('should return a pre-signed URL for a valid document', async () => {
            const docId = new Types.ObjectId().toHexString();
            const mockDocument = { fileKey: 'test-key' };
            (MDocument as any).findById = jest.fn().mockResolvedValue(mockDocument);
            getSignedUrlMock.mockResolvedValue('http://signed-url.com');

            const result = await fileService.getPresignedDownloadUrl(docId);
            expect(result).toBe('http://signed-url.com');
        });

        it('should throw an error if the document is not found', async () => {
            (MDocument as any).findById = jest.fn().mockResolvedValue(null);
            await expect(fileService.getPresignedDownloadUrl('non-existent-id')).rejects.toThrow('Document not found.');
        });
    });
});