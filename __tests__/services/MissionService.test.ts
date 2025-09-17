import { MissionService } from '../../src/app/services/MissionsService';
import { IMissions } from '../../src/app/db/models/MMissions.model';
import { EMissionStatus } from '../../src/app/models/enums/EMissions.enum';
import { Types } from 'mongoose';

// 1. Correct the path to the model file for the mock
jest.mock('../../src/app/db/models/MMissions.model');

// 2. Import the model AFTER it has been mocked.
// It will now be a Jest mock constructor, not the actual Mongoose model.
import MMission from '../../src/app/db/models/MMissions.model';

// 3. Cast the mocked import to the correct Jest type to resolve TypeScript errors
const MockMMission = MMission as unknown as jest.Mock;

// 4. Update the helper to generate valid ObjectIds automatically
const createMockMission = (): IMissions => ({
  _id: new Types.ObjectId(),
  document: 'mission_doc.pdf',
  student: new Types.ObjectId(),
  remuneration: 100,
  commissionedBy: new Types.ObjectId(),
  dateCompleted: new Date('2025-10-01T00:00:00.000Z'),
  hoursCompleted: 5,
  status: EMissionStatus.Active,
  createdAt: new Date(),
  updatedAt: new Date(),
} as IMissions);

describe('MissionService', () => {
  let missionService: MissionService;

  beforeEach(() => {
    missionService = new MissionService();
    // Clear all mock history and implementations before each test
    jest.clearAllMocks();
  });

  // Test suite for getMission method
  describe('getMission', () => {
    it('should retrieve all missions and populate related fields', async () => {
      const mockMissions = [createMockMission()];

        // Create a reusable "query" mock object
        const exec = jest.fn().mockResolvedValue(mockMissions);
        const query = {
        populate: jest.fn().mockReturnThis(), // every call returns the same query
        exec,
        };

        // Make find() return the query object
        (MMission.find as jest.Mock).mockReturnValue(query);

        const missions = await missionService.getMission();

        expect(MMission.find).toHaveBeenCalled();
        expect(query.populate).toHaveBeenCalledWith('student', 'displayName');
        expect(query.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
        expect(exec).toHaveBeenCalled();
        expect(missions).toEqual(mockMissions);
    });
  });

  // Test suite for getMissionById method
  describe('getMissionById', () => {
    it('should retrieve a single mission by its ID', async () => {
        const mockMission = createMockMission();
        const exec = jest.fn().mockResolvedValue(mockMission);
        const query = {
        populate: jest.fn().mockReturnThis(),
        exec,
        };

        (MMission.findById as jest.Mock).mockReturnValue(query);

        const mission = await missionService.getMissionById(mockMission._id.toHexString());

        expect(MMission.findById).toHaveBeenCalledWith(mockMission._id.toHexString());
        expect(query.populate).toHaveBeenCalledWith('student', 'displayName');
        expect(query.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
        expect(exec).toHaveBeenCalled();
        expect(mission).toEqual(mockMission);
    });
  });

  // Test suite for createMission method
  describe('createMission', () => {
    it('should create and save a new mission', async () => {
      const missionData = {
        document: 'new_doc.pdf',
        studentId: new Types.ObjectId().toHexString(),
        remuneration: 150,
        commissionedById: new Types.ObjectId().toHexString(),
        dateCompleted: new Date(),
      };
      const saveMock = jest.fn().mockResolvedValue(true);
      const missionInstance = { ...missionData, save: saveMock, status: EMissionStatus.Active };
      // 6. Use the casted MockMMission to call mockImplementation
      MockMMission.mockImplementation(() => missionInstance);

      const newMission = await missionService.createMission(missionData);

      expect(MMission).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(newMission).toHaveProperty('document', missionData.document);
    });
  });

  // Test suite for updateMission method
  describe('updateMission', () => {
    it('should find and update a mission with new data', async () => {
        const missionId = new Types.ObjectId().toHexString();
        const updateData: Partial<IMissions> = { remuneration: 200 };
        (MMission.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...createMockMission(), ...updateData });

        const updatedMission = await missionService.updateMission(missionId, updateData);

        expect(MMission.findByIdAndUpdate).toHaveBeenCalledWith(missionId, { $set: updateData }, { new: true });
        expect(updatedMission?.remuneration).toBe(200);
    });
  });

  // Test suite for deleteMission method
  describe('deleteMission', () => {
      it('should delete a mission and return the deleted count', async () => {
          const missionId = new Types.ObjectId().toHexString();
          const exec = jest.fn().mockResolvedValue({ deletedCount: 1 });
          (MMission.deleteOne as jest.Mock).mockReturnValue({ exec });

          const result = await missionService.deleteMission(missionId);

          expect(MMission.deleteOne).toHaveBeenCalledWith({ _id: missionId });
          expect(result.deletedCount).toBe(1);
      });
  });
});