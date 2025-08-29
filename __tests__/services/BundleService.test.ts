import { BundleService } from '../../src/app/services/BundleService';
import MBundle from '../../src/app/db/models/MBundle.model';
import { Types } from 'mongoose';
import { EBundleStatus } from '../../src/app/models/enums/EBundleStatus.enum';
import { mocked } from 'jest-mock';


jest.mock('../../src/app/db/models/MBundle.model');

const MBundleMock = mocked(MBundle);

describe('BundleService', () => {
    let bundleService: BundleService;

    beforeEach(() => {
        MBundleMock.mockClear();
        
        MBundleMock.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(true),
        }) as any);

        bundleService = new BundleService();
    });


    describe('createBundle', () => {
        it('should correctly create a new bundle with valid data', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const subjects = [{
                subject: 'Calculus I',
                tutor: new Types.ObjectId().toHexString(),
                hours: 15
            }];

            await bundleService.createBundle(studentId, subjects, creatorId);

            expect(MBundleMock).toHaveBeenCalledWith({
                student: new Types.ObjectId(studentId),
                subjects: subjects,
                createdBy: new Types.ObjectId(creatorId)
            });
        });
    });


    describe('addSubjectToBundle', () => {
        it('should call findByIdAndUpdate with a $push operator', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const newSubject = { subject: 'History', tutor: new Types.ObjectId().toHexString(), hours: 5 };
            
            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId, ...newSubject } as any);

            await bundleService.addSubjectToBundle(bundleId, newSubject);

            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalledWith(
                bundleId,
                { $push: { subjects: newSubject } },
                { new: true }
            );
        });
    });


    describe('removeSubjectFromBundle', () => {
        it('should remove a subject by name and save the bundle', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const subjectNameToRemove = 'Math';
            const mockBundle = {
                _id: bundleId,
                subjects: [
                    { subject: 'Math', tutor: new Types.ObjectId(), hours: 10 },
                    { subject: 'Science', tutor: new Types.ObjectId(), hours: 8 }
                ],
                save: jest.fn().mockResolvedValue(true)
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);

            const result = await bundleService.removeSubjectFromBundle(bundleId, subjectNameToRemove);

            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
            expect(mockBundle.save).toHaveBeenCalled();
            expect(result?.subjects.some(s => s.subject === subjectNameToRemove)).toBe(false);
            expect(result?.subjects.length).toBe(1);
        });

        it('should throw an error if the subject is not found', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const subjectNameToRemove = 'History';
            const mockBundle = {
                _id: bundleId,
                subjects: [{ subject: 'Math', tutor: new Types.ObjectId(), hours: 10 }],
                save: jest.fn()
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);

            await expect(bundleService.removeSubjectFromBundle(bundleId, subjectNameToRemove))
                .rejects.toThrow(`Subject "${subjectNameToRemove}" not found in this bundle.`);
        });
    });


    describe('setBundleActiveStatus', () => {
        it('should call findByIdAndUpdate with $set for isActive', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId, isActive: true } as any);

            await bundleService.setBundleActiveStatus(bundleId, true);

            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalledWith(
                bundleId,
                { $set: { isActive: true } },
                { new: true }
            );
        });
    });


    describe('setBundleStatus', () => {
        it('should call findByIdAndUpdate with $set for status', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const newStatus = EBundleStatus.Approved;

            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId, status: newStatus } as any);

            await bundleService.setBundleStatus(bundleId, newStatus);
            
            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalledWith(
                bundleId,
                { $set: { status: newStatus } },
                { new: true }
            );
        });
    });
});