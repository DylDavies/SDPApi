import { MatchmakingService, MatchmakingCriteria } from '../../src/app/services/MatchmakingService';
import UserService from '../../src/app/services/UserService';
import GoogleMapsService from '../../src/app/services/GoogleMapsService';
import { Singleton } from '../../src/app/models/classes/Singleton';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { IUser } from '../../src/app/db/models/MUser.model';
import { IAddress } from '../../src/app/models/interfaces/IAddress.interface';

// Mock the Singleton class
jest.mock('../../src/app/models/classes/Singleton');

// Mock UserService
jest.mock('../../src/app/services/UserService', () => ({
    __esModule: true,
    default: {
        getAllUsers: jest.fn()
    }
}));

// Mock GoogleMapsService
jest.mock('../../src/app/services/GoogleMapsService', () => ({
    __esModule: true,
    default: {
        calculateDistance: jest.fn()
    }
}));

const MockedSingleton = Singleton as jest.Mocked<typeof Singleton>;

describe('MatchmakingService', () => {
    let matchmakingService: MatchmakingService;
    let mockLogger: any;

    const mockAddress: IAddress = {
        streetAddress: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country'
    };

    const mockTutor1: Partial<IUser> = {
        _id: '1' as any,
        displayName: 'John Doe',
        email: 'john@test.com',
        type: EUserType.Staff,
        disabled: false,
        pending: false,
        availability: 10,
        address: mockAddress,
        proficiencies: [{
            name: 'Math',
            subjects: {
                'Algebra': {
                    name: 'Algebra',
                    grades: ['10', '11']
                }
            }
        }] as any
    };

    const mockTutor2: Partial<IUser> = {
        _id: '2' as any,
        displayName: 'Jane Smith',
        email: 'jane@test.com',
        type: EUserType.Admin,
        disabled: false,
        pending: false,
        availability: 20,
        address: mockAddress,
        proficiencies: [{
            name: 'Science',
            subjects: {
                'Physics': {
                    name: 'Physics',
                    grades: ['12']
                }
            }
        }] as any
    };

    const mockTutor3: Partial<IUser> = {
        _id: '3' as any,
        displayName: 'Bob Johnson',
        email: 'bob@test.com',
        type: EUserType.Staff,
        disabled: false,
        pending: false,
        availability: 5,
        address: mockAddress,
        proficiencies: [{
            name: 'Math',
            subjects: {
                'Algebra': {
                    name: 'Algebra',
                    grades: ['10']
                }
            }
        }] as any
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        (MockedSingleton.getInstance as jest.Mock).mockReturnValue(mockLogger);

        matchmakingService = new MatchmakingService();
    });

    describe('init', () => {
        it('should initialize successfully', async () => {
            await matchmakingService.init();
            expect(mockLogger.info).toHaveBeenCalledWith('MatchmakingService initialized');
        });
    });

    describe('findMatchingTutors', () => {
        it('should return matching tutors sorted by match score', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor2, mockTutor3]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(2); // mockTutor1 and mockTutor3 have Algebra
            expect(result[0].matchScore).toBeGreaterThanOrEqual(result[1].matchScore);
        });

        it('should filter out disabled and pending tutors', async () => {
            const disabledTutor: Partial<IUser> = {
                ...mockTutor1,
                _id: '4' as any,
                disabled: true
            };

            const pendingTutor: Partial<IUser> = {
                ...mockTutor1,
                _id: '5' as any,
                pending: true
            };

            (UserService.getAllUsers as jest.Mock).mockResolvedValue([
                mockTutor1,
                disabledTutor,
                pendingTutor
            ]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1); // Only mockTutor1 should be returned
            expect(result[0]._id).toBe('1');
        });

        it('should filter tutors without required subject', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor2]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Physics',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1); // Only mockTutor2 has Physics
            expect(result[0]._id).toBe('2');
        });

        it('should filter tutors without sufficient availability', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor3]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 8
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1); // Only mockTutor1 has 10 hours availability
            expect(result[0]._id).toBe('1');
        });

        it('should filter tutors beyond max distance', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor3]);
            (GoogleMapsService.calculateDistance as jest.Mock)
                .mockResolvedValueOnce(50)
                .mockResolvedValueOnce(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5,
                maxDistance: 10
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1); // Only mockTutor3 is within 10km
            expect(result[0]._id).toBe('3');
        });

        it('should handle distance calculation errors gracefully', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockRejectedValue(new Error('Distance calculation failed'));

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1);
            expect(result[0].distance).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should return all staff when no subject is specified', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor2, mockTutor3]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(3); // All tutors have sufficient availability
        });

        it('should handle tutors without addresses', async () => {
            const tutorNoAddress: Partial<IUser> = {
                ...mockTutor1,
                address: undefined
            };

            (UserService.getAllUsers as jest.Mock).mockResolvedValue([tutorNoAddress]);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1);
            expect(result[0].distance).toBeNull();
        });

        it('should filter by proficiency and grade when specified', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor3]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                proficiency: 'Math',
                grade: '11',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1); // Only mockTutor1 has grade 11
            expect(result[0]._id).toBe('1');
        });

        it('should handle tutors without proficiencies', async () => {
            const tutorNoProficiencies: Partial<IUser> = {
                ...mockTutor1,
                proficiencies: undefined
            };

            (UserService.getAllUsers as jest.Mock).mockResolvedValue([tutorNoProficiencies]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(0); // Tutor without proficiencies shouldn't match
        });

        it('should handle empty proficiencies array', async () => {
            const tutorEmptyProficiencies: Partial<IUser> = {
                ...mockTutor1,
                proficiencies: []
            };

            (UserService.getAllUsers as jest.Mock).mockResolvedValue([tutorEmptyProficiencies]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(0);
        });

        it('should handle subjects as Map', async () => {
            const tutorWithMapSubjects: Partial<IUser> = {
                ...mockTutor1,
                proficiencies: [{
                    name: 'Math',
                    subjects: new Map([
                        ['Algebra', {
                            name: 'Algebra',
                            grades: ['10', '11']
                        }]
                    ]) as any
                }] as any
            };

            (UserService.getAllUsers as jest.Mock).mockResolvedValue([tutorWithMapSubjects]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(5);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result.length).toBe(1);
            expect(result[0]._id).toBe('1');
        });
    });

    describe('calculateMatchScore', () => {
        it('should give higher scores to tutors with more availability', async () => {
            const highAvailabilityTutor: Partial<IUser> = {
                ...mockTutor1,
                _id: 'high' as any,
                availability: 40
            };

            const lowAvailabilityTutor: Partial<IUser> = {
                ...mockTutor1,
                _id: 'low' as any,
                availability: 6
            };

            (UserService.getAllUsers as jest.Mock).mockResolvedValue([
                highAvailabilityTutor,
                lowAvailabilityTutor
            ]);
            (GoogleMapsService.calculateDistance as jest.Mock).mockResolvedValue(10);

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result[0]._id).toBe('high'); // Higher availability should rank first
            expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore);
        });

        it('should give higher scores to tutors closer in distance', async () => {
            (UserService.getAllUsers as jest.Mock).mockResolvedValue([mockTutor1, mockTutor3]);
            (GoogleMapsService.calculateDistance as jest.Mock)
                .mockResolvedValueOnce(3)  // Close
                .mockResolvedValueOnce(60); // Far

            const criteria: MatchmakingCriteria = {
                lessonLocation: mockAddress,
                subject: 'Algebra',
                hoursPerWeek: 5
            };

            const result = await matchmakingService.findMatchingTutors(criteria);

            expect(result[0]._id).toBe('1'); // Closer tutor should rank first
        });
    });
});
