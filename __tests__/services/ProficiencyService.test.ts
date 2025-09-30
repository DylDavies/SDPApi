import { ProficiencyService } from '../../src/app/services/ProficiencyService';
import MProficiencies from '../../src/app/db/models/MProficiencies.model';
import ISubject from '../../src/app/models/interfaces/ISubject.interface';
import { Types } from 'mongoose';

// Mock all external dependencies
jest.mock('../../src/app/db/models/MProficiencies.model');
jest.mock('../../src/app/services/LoggingService');

describe('ProficiencyService', () => {
    let proficiencyService: ProficiencyService;

    const mockSubject: ISubject = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011') as any,
        name: 'Algebra',
        grades: ['9', '10', '11']
    };

    const mockProficiencyData: any = {
        name: 'Mathematics',
        subjects: {
            'algebra': mockSubject,
            'calculus': {
                _id: new Types.ObjectId('507f1f77bcf86cd799439012') as any,
                name: 'Calculus',
                grades: ['11', '12']
            }
        }
    };

    const mockProficiencyDocument = {
        _id: 'prof-123',
        name: 'Mathematics',
        subjects: new Map(Object.entries(mockProficiencyData.subjects)),
        save: jest.fn().mockResolvedValue(true)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        proficiencyService = new ProficiencyService();
    });

    describe('init', () => {
        it('should initialize successfully', async () => {
            await expect(proficiencyService.init()).resolves.toBeUndefined();
        });
    });

    describe('addOrUpdateProficiency', () => {
        it('should create a new proficiency when it does not exist', async () => {
            (MProficiencies.findOne as jest.Mock).mockResolvedValue(null);
            const saveMock = jest.fn().mockResolvedValue(mockProficiencyDocument);
            (MProficiencies as any).mockImplementation(() => ({
                save: saveMock
            }));

            const result = await proficiencyService.addOrUpdateProficiency(mockProficiencyData);

            expect(MProficiencies.findOne).toHaveBeenCalledWith({ name: mockProficiencyData.name });
            expect(saveMock).toHaveBeenCalled();
            expect(result).toBeTruthy();
        });

        it('should update an existing proficiency by merging subjects', async () => {
            const existingProf = {
                name: 'Mathematics',
                subjects: new Map(),
                save: jest.fn().mockResolvedValue(mockProficiencyDocument)
            };
            (MProficiencies.findOne as jest.Mock).mockResolvedValue(existingProf);

            const result = await proficiencyService.addOrUpdateProficiency(mockProficiencyData);

            expect(MProficiencies.findOne).toHaveBeenCalledWith({ name: mockProficiencyData.name });
            expect(existingProf.subjects.size).toBe(2);
            expect(existingProf.save).toHaveBeenCalled();
            expect(result).toEqual(mockProficiencyDocument);
        });

        it('should merge new subjects with existing subjects', async () => {
            const existingSubject: ISubject = {
                _id: new Types.ObjectId('507f1f77bcf86cd799439013') as any,
                name: 'Geometry',
                grades: ['9', '10']
            };
            const existingProf = {
                name: 'Mathematics',
                subjects: new Map([['geometry', existingSubject]]),
                save: jest.fn().mockResolvedValue(mockProficiencyDocument)
            };
            (MProficiencies.findOne as jest.Mock).mockResolvedValue(existingProf);

            await proficiencyService.addOrUpdateProficiency(mockProficiencyData);

            // Should have all three subjects: existing geometry + new algebra + new calculus
            expect(existingProf.subjects.size).toBe(3);
            expect(existingProf.subjects.has('geometry')).toBe(true);
            expect(existingProf.subjects.has('algebra')).toBe(true);
            expect(existingProf.subjects.has('calculus')).toBe(true);
        });

        it('should return null when an error occurs', async () => {
            (MProficiencies.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await proficiencyService.addOrUpdateProficiency(mockProficiencyData);

            expect(result).toBeNull();
        });

        it('should handle proficiency with empty subjects', async () => {
            const emptyProfData: any = {
                name: 'Empty Proficiency',
                subjects: {}
            };
            (MProficiencies.findOne as jest.Mock).mockResolvedValue(null);
            const saveMock = jest.fn().mockResolvedValue({ ...mockProficiencyDocument, subjects: new Map() });
            (MProficiencies as any).mockImplementation(() => ({
                save: saveMock
            }));

            const result = await proficiencyService.addOrUpdateProficiency(emptyProfData);

            expect(result).toBeTruthy();
            expect(saveMock).toHaveBeenCalled();
        });
    });

    describe('updateProficiencyName', () => {
        it('should update proficiency name by ID', async () => {
            const profId = 'prof-123';
            const newName = 'Advanced Mathematics';
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue({
                ...mockProficiencyDocument,
                name: newName
            });

            const result = await proficiencyService.updateProficiencyName(profId, newName);

            expect(MProficiencies.findByIdAndUpdate).toHaveBeenCalledWith(
                profId,
                { $set: { name: newName } },
                { new: true }
            );
            expect(result?.name).toBe(newName);
        });

        it('should return null when proficiency is not found', async () => {
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

            const result = await proficiencyService.updateProficiencyName('invalid-id', 'New Name');

            expect(result).toBeNull();
        });
    });

    describe('deleteProficiency', () => {
        it('should delete a proficiency by ID', async () => {
            const profId = 'prof-123';
            (MProficiencies.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

            const result = await proficiencyService.deleteProficiency(profId);

            expect(MProficiencies.deleteOne).toHaveBeenCalledWith({ _id: profId });
            expect(result.deletedCount).toBe(1);
        });

        it('should return deletedCount 0 when proficiency does not exist', async () => {
            (MProficiencies.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 0 });

            const result = await proficiencyService.deleteProficiency('non-existent-id');

            expect(result.deletedCount).toBe(0);
        });
    });

    describe('addOrUpdateSubject', () => {
        it('should add a new subject to a proficiency', async () => {
            const profId = 'prof-123';
            const subjectKey = 'trigonometry';
            const subjectData: ISubject = {
                _id: new Types.ObjectId('507f1f77bcf86cd799439014') as any,
                name: 'Trigonometry',
                grades: ['10', '11', '12']
            };
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProficiencyDocument);

            const result = await proficiencyService.addOrUpdateSubject(profId, subjectKey, subjectData);

            expect(MProficiencies.findByIdAndUpdate).toHaveBeenCalledWith(
                profId,
                { $set: { [`subjects.${subjectKey}`]: subjectData } },
                { new: true }
            );
            expect(result).toEqual(mockProficiencyDocument);
        });

        it('should update an existing subject in a proficiency', async () => {
            const profId = 'prof-123';
            const subjectKey = 'algebra';
            const updatedSubjectData: ISubject = {
                _id: new Types.ObjectId('507f1f77bcf86cd799439011') as any,
                name: 'Advanced Algebra',
                grades: ['10', '11', '12']
            };
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProficiencyDocument);

            const result = await proficiencyService.addOrUpdateSubject(profId, subjectKey, updatedSubjectData);

            expect(MProficiencies.findByIdAndUpdate).toHaveBeenCalledWith(
                profId,
                { $set: { [`subjects.${subjectKey}`]: updatedSubjectData } },
                { new: true }
            );
            expect(result).toEqual(mockProficiencyDocument);
        });

        it('should return null when proficiency is not found', async () => {
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

            const result = await proficiencyService.addOrUpdateSubject('invalid-id', 'key', mockSubject);

            expect(result).toBeNull();
        });
    });

    describe('deleteSubject', () => {
        it('should delete a subject from a proficiency', async () => {
            const profId = 'prof-123';
            const subjectKey = 'algebra';
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProficiencyDocument);

            const result = await proficiencyService.deleteSubject(profId, subjectKey);

            expect(MProficiencies.findByIdAndUpdate).toHaveBeenCalledWith(
                profId,
                { $unset: { [`subjects.${subjectKey}`]: "" } },
                { new: true }
            );
            expect(result).toEqual(mockProficiencyDocument);
        });

        it('should return null when proficiency is not found', async () => {
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

            const result = await proficiencyService.deleteSubject('invalid-id', 'algebra');

            expect(result).toBeNull();
        });

        it('should handle deleting a non-existent subject key', async () => {
            const profId = 'prof-123';
            const nonExistentKey = 'non-existent-subject';
            (MProficiencies.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProficiencyDocument);

            const result = await proficiencyService.deleteSubject(profId, nonExistentKey);

            expect(MProficiencies.findByIdAndUpdate).toHaveBeenCalledWith(
                profId,
                { $unset: { [`subjects.${nonExistentKey}`]: "" } },
                { new: true }
            );
            expect(result).toEqual(mockProficiencyDocument);
        });
    });

    describe('getProficiencies', () => {
        it('should retrieve all proficiencies', async () => {
            const mockProficiencies = [
                mockProficiencyDocument,
                {
                    _id: 'prof-456',
                    name: 'Science',
                    subjects: new Map()
                }
            ];
            (MProficiencies.find as jest.Mock).mockResolvedValue(mockProficiencies);

            const result = await proficiencyService.getProficiencies();

            expect(MProficiencies.find).toHaveBeenCalled();
            expect(result).toEqual(mockProficiencies);
            expect(result.length).toBe(2);
        });

        it('should return an empty array when no proficiencies exist', async () => {
            (MProficiencies.find as jest.Mock).mockResolvedValue([]);

            const result = await proficiencyService.getProficiencies();

            expect(result).toEqual([]);
            expect(result.length).toBe(0);
        });
    });
});