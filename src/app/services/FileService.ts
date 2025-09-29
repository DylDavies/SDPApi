import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Singleton } from "../models/classes/Singleton";
import { IService } from "../models/interfaces/IService.interface";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { LoggingService } from "./LoggingService";
import crypto from 'crypto';
import MDocument from "../db/models/MDocument.model";
import { Types } from "mongoose";

export class FileService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    private logger = Singleton.getInstance(LoggingService);
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        const accessKeyId = process.env.DO_SPACES_ACCESS_KEY_ID;
        const secretAccessKey = process.env.DO_SPACES_SECRET_ACCESS_KEY;
        const endpoint = process.env.DO_SPACES_ENDPOINT;
        const region = process.env.DO_SPACES_REGION;
        this.bucketName = process.env.DO_SPACES_BUCKET_NAME as string;

        if (!accessKeyId || !secretAccessKey || !endpoint || !this.bucketName || !region) {
            this.logger.error("DigitalOcean Spaces environment variables are not set.");
            throw new Error("Missing DO Spaces credentials in environment variables.");
        }

        this.s3Client = new S3Client({
            endpoint: `https://${endpoint}`,
            region: region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    public async init(): Promise<void> {
        this.logger.info("FileService initialized and connected to DigitalOcean Spaces.");
        return Promise.resolve();
    }

    /**
     * Generates a secure, temporary URL for uploading a file directly to Spaces.
     * @param originalFilename The original name of the file being uploaded.
     * @param contentType The MIME type of the file.
     * @returns The pre-signed URL and the unique file key.
     */
    public async getPresignedUploadUrl(originalFilename: string, contentType: string) {
        // Using a folder structure within the bucket is good practice
        const fileKey = `documents/${crypto.randomBytes(16).toString('hex')}-${originalFilename}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
            ContentType: contentType,
            ACL: 'private', // Explicitly set object as private
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // URL is valid for 1 hour

        return { url, fileKey };
    }

    /**
     * Creates a document record in MongoDB after a file has been successfully uploaded to Spaces.
     * @param fileKey The unique key of the file in Spaces.
     * @param originalFilename The original name of the file.
     * @param contentType The file's MIME type.
     * @param userId The ID of the user who uploaded the file.
     * @returns The newly created document from MongoDB.
     */
    public async createDocumentRecord(fileKey: string, originalFilename: string, contentType: string, userId: string) {
        const newDocument = new MDocument({
            fileKey,
            originalFilename,
            contentType,
            uploadedBy: new Types.ObjectId(userId)
        });
        await newDocument.save();
        return newDocument;
    }

    /**
     * Retrieves all document records from the database.
     * @returns A promise that resolves to an array of all documents.
     */
    public async getDocuments() {
        // Find all documents and sort them by the creation date in descending order
        return MDocument.find().sort({ createdAt: -1 });
    }

    /**
     * Generates a secure, temporary URL for downloading a private file from Spaces.
     * @param documentId The ID of the document in MongoDB.
     * @returns The pre-signed URL for downloading.
     */
    public async getPresignedDownloadUrl(documentId: string): Promise<string> {
        const document = await MDocument.findById(documentId);
        if (!document) {
            throw new Error("Document not found.");
        }

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: document.fileKey,
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // URL is valid for 1 hour

        return url;
    }
}

export default Singleton.getInstance(FileService);