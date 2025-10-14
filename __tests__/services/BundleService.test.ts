import { BundleService } from '../../src/app/services/BundleService';
import MBundle from '../../src/app/db/models/MBundle.model';
import { Types } from 'mongoose';
import { EBundleStatus } from '../../src/app/models/enums/EBundleStatus.enum';
import { EServiceLoadPriority } from '../../src/app/models/enums/EServiceLoadPriority.enum';
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

    describe('init', () => {
        it('should initialize successfully', async () => {
            await expect(bundleService.init()).resolves.toBeUndefined();
        });
    });

    describe('loadPriority', () => {
        it('should have Low load priority', () => {
            expect(BundleService.loadPriority).toBe(EServiceLoadPriority.Low);
        });
    });


    describe('createBundle', () => {
        it('should correctly create a new bundle with valid data', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const subjects = [{
                subject: 'Calculus I',
                grade: 'A',
                tutor: new Types.ObjectId().toHexString(),
                durationMinutes: 900 // 15 hours * 60 minutes
            }];

            await bundleService.createBundle(studentId, subjects, creatorId);

            expect(MBundleMock).toHaveBeenCalledWith({
                student: new Types.ObjectId(studentId),
                subjects: expect.any(Array),
                createdBy: new Types.ObjectId(creatorId),
                stakeholders: []
            });
        });

        it('should create a bundle with lessonLocation when provided', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const lessonLocation = {
                streetAddress: '123 Main St',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
                country: 'USA',
                formattedAddress: '123 Main St, New York, NY 10001, USA'
            };
            const subjects = [{
                subject: 'Calculus I',
                grade: 'A',
                tutor: new Types.ObjectId().toHexString(),
                durationMinutes: 900
            }];

            await bundleService.createBundle(studentId, subjects, creatorId, lessonLocation);

            expect(MBundleMock).toHaveBeenCalledWith(expect.objectContaining({
                lessonLocation: expect.objectContaining({
                    streetAddress: '123 Main St',
                    city: 'New York'
                })
            }));
        });

        it('should create a bundle with manager when provided', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const managerId = new Types.ObjectId().toHexString();
            const subjects = [{
                subject: 'Calculus I',
                grade: 'A',
                tutor: new Types.ObjectId().toHexString(),
                durationMinutes: 900
            }];

            await bundleService.createBundle(studentId, subjects, creatorId, undefined, managerId);

            expect(MBundleMock).toHaveBeenCalledWith(expect.objectContaining({
                manager: new Types.ObjectId(managerId)
            }));
        });

        it('should create a bundle with stakeholders when provided', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const stakeholderIds = [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()];
            const subjects = [{
                subject: 'Calculus I',
                grade: 'A',
                tutor: new Types.ObjectId().toHexString(),
                durationMinutes: 900
            }];

            await bundleService.createBundle(studentId, subjects, creatorId, undefined, undefined, stakeholderIds);

            expect(MBundleMock).toHaveBeenCalledWith(expect.objectContaining({
                stakeholders: expect.arrayContaining([
                    expect.any(Types.ObjectId),
                    expect.any(Types.ObjectId)
                ])
            }));
        });

        it('should create a bundle with all optional fields when provided', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const lessonLocation = {
                streetAddress: '456 Oak Ave',
                city: 'Boston',
                state: 'MA',
                postalCode: '02101',
                country: 'USA',
                formattedAddress: '456 Oak Ave, Boston, MA 02101, USA'
            };
            const managerId = new Types.ObjectId().toHexString();
            const stakeholderIds = [new Types.ObjectId().toHexString()];
            const subjects = [{
                subject: 'Calculus I',
                grade: 'A',
                tutor: new Types.ObjectId().toHexString(),
                durationMinutes: 900
            }];

            await bundleService.createBundle(studentId, subjects, creatorId, lessonLocation, managerId, stakeholderIds);

            expect(MBundleMock).toHaveBeenCalledWith(expect.objectContaining({
                student: new Types.ObjectId(studentId),
                subjects: expect.any(Array),
                createdBy: new Types.ObjectId(creatorId),
                lessonLocation: expect.objectContaining({
                    streetAddress: '456 Oak Ave'
                }),
                manager: new Types.ObjectId(managerId),
                stakeholders: expect.any(Array)
            }));
        });

        it('should throw error when creating bundle with duplicate tutor-subject combination', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const tutorId = new Types.ObjectId().toHexString();
            const subjects = [
                {
                    subject: 'Math',
                    grade: 'A',
                    tutor: tutorId,
                    durationMinutes: 900
                },
                {
                    subject: 'Math',
                    grade: 'B',
                    tutor: tutorId,
                    durationMinutes: 600
                }
            ];

            await expect(bundleService.createBundle(studentId, subjects, creatorId))
                .rejects.toThrow(`Duplicate tutor-subject combination found: tutor ${tutorId} is already assigned to subject Math in this bundle.`);
        });

        it('should allow same tutor with different subjects', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const tutorId = new Types.ObjectId().toHexString();
            const subjects = [
                {
                    subject: 'Math',
                    grade: 'A',
                    tutor: tutorId,
                    durationMinutes: 900
                },
                {
                    subject: 'Science',
                    grade: 'B',
                    tutor: tutorId,
                    durationMinutes: 600
                }
            ];

            await bundleService.createBundle(studentId, subjects, creatorId);

            expect(MBundleMock).toHaveBeenCalledWith(expect.objectContaining({
                student: new Types.ObjectId(studentId),
                subjects: expect.any(Array),
                createdBy: new Types.ObjectId(creatorId)
            }));
        });

        it('should allow same subject with different tutors', async () => {
            const studentId = new Types.ObjectId().toHexString();
            const creatorId = new Types.ObjectId().toHexString();
            const tutor1Id = new Types.ObjectId().toHexString();
            const tutor2Id = new Types.ObjectId().toHexString();
            const subjects = [
                {
                    subject: 'Math',
                    grade: 'A',
                    tutor: tutor1Id,
                    durationMinutes: 900
                },
                {
                    subject: 'Math',
                    grade: 'B',
                    tutor: tutor2Id,
                    durationMinutes: 600
                }
            ];

            await bundleService.createBundle(studentId, subjects, creatorId);

            expect(MBundleMock).toHaveBeenCalledWith(expect.objectContaining({
                student: new Types.ObjectId(studentId),
                subjects: expect.any(Array),
                createdBy: new Types.ObjectId(creatorId)
            }));
        });
    });


    describe('addSubjectToBundle', () => {
        it('should call findByIdAndUpdate with a $push operator', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const tutorId = new Types.ObjectId().toHexString();
            const newSubject = { subject: 'History', grade: 'A', tutor: tutorId, durationMinutes: 300 };

            const mockBundle = {
                _id: bundleId,
                subjects: [
                    { subject: 'Math', tutor: new Types.ObjectId(), durationMinutes: 600 }
                ]
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);
            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId, ...newSubject } as any);

            await bundleService.addSubjectToBundle(bundleId, newSubject);

            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalledWith(
                bundleId,
                { $push: { subjects: expect.any(Object) } },
                { new: true }
            );
        });

        it('should throw error when adding duplicate tutor-subject combination', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const tutorId = new Types.ObjectId();
            const mockBundle = {
                _id: bundleId,
                subjects: [
                    { subject: 'Math', tutor: tutorId, durationMinutes: 600 }
                ]
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);

            const duplicateSubject = { subject: 'Math', grade: 'B', tutor: tutorId.toHexString(), durationMinutes: 300 };

            await expect(bundleService.addSubjectToBundle(bundleId, duplicateSubject))
                .rejects.toThrow(`Duplicate tutor-subject combination: tutor ${tutorId.toHexString()} is already assigned to subject Math in this bundle.`);
        });

        it('should allow adding same subject with different tutor', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const tutor1Id = new Types.ObjectId();
            const tutor2Id = new Types.ObjectId();
            const mockBundle = {
                _id: bundleId,
                subjects: [
                    { subject: 'Math', tutor: tutor1Id, durationMinutes: 600 }
                ]
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);
            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId } as any);

            const newSubject = { subject: 'Math', grade: 'B', tutor: tutor2Id.toHexString(), durationMinutes: 300 };

            await bundleService.addSubjectToBundle(bundleId, newSubject);

            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalled();
        });

        it('should allow adding different subject with same tutor', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const tutorId = new Types.ObjectId();
            const mockBundle = {
                _id: bundleId,
                subjects: [
                    { subject: 'Math', tutor: tutorId, durationMinutes: 600 }
                ]
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);
            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId } as any);

            const newSubject = { subject: 'Science', grade: 'A', tutor: tutorId.toHexString(), durationMinutes: 300 };

            await bundleService.addSubjectToBundle(bundleId, newSubject);

            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalled();
        });

        it('should return null when bundle not found', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const newSubject = { subject: 'History', grade: 'A', tutor: new Types.ObjectId().toHexString(), durationMinutes: 300 };

            MBundleMock.findById.mockResolvedValue(null);

            const result = await bundleService.addSubjectToBundle(bundleId, newSubject);

            expect(result).toBeNull();
            expect(MBundleMock.findByIdAndUpdate).not.toHaveBeenCalled();
        });
    });


    describe('removeSubjectFromBundle', () => {
        it('should remove a subject by name and save the bundle', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const subjectIdToRemove = new Types.ObjectId();
            const mockBundle = {
                _id: bundleId,
                subjects: [
                    { _id: subjectIdToRemove, subject: 'Math', tutor: new Types.ObjectId(), durationMinutes: 600 },
                    { _id: new Types.ObjectId(), subject: 'Science', tutor: new Types.ObjectId(), durationMinutes: 480 }
                ],
                save: jest.fn().mockResolvedValue(true)
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);

            const result = await bundleService.removeSubjectFromBundle(bundleId, subjectIdToRemove.toHexString());

            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
            expect(mockBundle.save).toHaveBeenCalled();
            expect(result?.subjects.some(s => s._id === subjectIdToRemove)).toBe(false);
            expect(result?.subjects.length).toBe(1);
        });

        it('should throw an error if the subject is not found', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const subjectIdToRemove = new Types.ObjectId().toHexString();
            const mockBundle = {
                _id: bundleId,
                subjects: [{  _id: new Types.ObjectId(), subject: 'Math', tutor: new Types.ObjectId(), durationMinutes: 600 }],
                save: jest.fn()
            };

            MBundleMock.findById.mockResolvedValue(mockBundle as any);

            await expect(bundleService.removeSubjectFromBundle(bundleId, subjectIdToRemove))
                .rejects.toThrow(`Subject with id "${subjectIdToRemove}" not found in this bundle.`);
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

    describe('getBundles', () => {
        it('should retrieve all bundles with populated fields', async () => {
            const mockBundles = [
                { _id: 'bundle1', student: 'student1', subjects: [] },
                { _id: 'bundle2', student: 'student2', subjects: [] }
            ];

            const mockChain = {
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockBundles)
            };

            MBundleMock.find = jest.fn().mockReturnValue(mockChain) as any;

            const result = await bundleService.getBundles();

            expect(result).toEqual(mockBundles);
            expect(MBundleMock.find).toHaveBeenCalled();
            expect(mockChain.populate).toHaveBeenCalledWith('student', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('subjects.tutor', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('createdBy', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('manager', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('stakeholders', 'displayName');
        });
    });

    describe('getBundleById', () => {
        it('should retrieve a bundle by ID with populated fields', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const mockBundle = { _id: bundleId, student: 'student1', subjects: [] };

            const mockChain = {
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockBundle)
            };

            MBundleMock.findById = jest.fn().mockReturnValue(mockChain) as any;

            const result = await bundleService.getBundleById(bundleId);

            expect(result).toEqual(mockBundle);
            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
            expect(mockChain.populate).toHaveBeenCalledWith('student', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('subjects.tutor', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('createdBy', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('manager', 'displayName');
            expect(mockChain.populate).toHaveBeenCalledWith('stakeholders', 'displayName');
        });

        it('should return null when bundle not found', async () => {
            const bundleId = new Types.ObjectId().toHexString();

            const mockChain = {
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null)
            };

            MBundleMock.findById = jest.fn().mockReturnValue(mockChain) as any;

            const result = await bundleService.getBundleById(bundleId);

            expect(result).toBeNull();
            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
        });
    });

    describe('updateBundle', () => {
        it('should update bundle with new fields', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const updateData: any = {
                lessonLocation: {
                    streetAddress: '789 Pine Rd',
                    city: 'Chicago',
                    state: 'IL',
                    postalCode: '60601',
                    country: 'USA',
                    formattedAddress: '789 Pine Rd, Chicago, IL 60601, USA'
                },
                manager: new Types.ObjectId().toHexString(),
                stakeholders: [new Types.ObjectId().toHexString()]
            };

            MBundleMock.findByIdAndUpdate.mockResolvedValue({ _id: bundleId, ...updateData } as any);

            await bundleService.updateBundle(bundleId, updateData);

            expect(MBundleMock.findByIdAndUpdate).toHaveBeenCalledWith(
                bundleId,
                { $set: updateData },
                { new: true }
            );
        });

        it('should return null when bundle not found', async () => {
            const bundleId = new Types.ObjectId().toHexString();
            const updateData: any = {
                lessonLocation: {
                    streetAddress: '321 Elm St',
                    city: 'Seattle',
                    state: 'WA',
                    formattedAddress: '321 Elm St, Seattle, WA, USA'
                }
            };

            MBundleMock.findByIdAndUpdate.mockResolvedValue(null);

            const result = await bundleService.updateBundle(bundleId, updateData);

            expect(result).toBeNull();
        });
    });
});