import { MissionService } from '../../src/app/services/MissionsService';
import MMission, { IMissions } from '../../src/app/db/models/MMissions.model';
import { Types } from 'mongoose';
import { EMissionStatus } from '../../src/app/models/enums/EMissions.enum';

// Mock the Mongoose model to isolate the service from the database
jest.mock('../../src/app/db/models/MMissions.model');

const mockMissionId = new Types.ObjectId();

// A sample mission object to be used in tests
const mockMission: IMissions = {
  _id: mockMissionId,
  bundleId: new Types.ObjectId(),
  documentPath: 'path/to/doc.pdf',
  documentName: 'doc.pdf',
  student: new Types.ObjectId(),
  tutor: new Types.ObjectId(),
  remuneration: 100,
  commissionedBy: new Types.ObjectId(),
  hoursCompleted: 2,
  dateCompleted: new Date(),
  status: EMissionStatus.Active,
  save: jest.fn().mockResolvedValue(this),
} as unknown as IMissions;

// A reusable mock for Mongoose's chainable query methods (e.g., .populate().exec())
const mockQuery = {
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([mockMission]),
};

describe('MissionService', () => {
  let missionService: MissionService;

  beforeEach(() => {
    // Reset all mocks before each test to ensure test isolation
    jest.clearAllMocks();
    
    // Configure the mock implementations for Mongoose static methods
    (MMission.find as jest.Mock).mockReturnValue(mockQuery);
    (MMission.findById as jest.Mock).mockReturnValue(mockQuery);
    (MMission.findByIdAndUpdate as jest.Mock).mockImplementation(() => Promise.resolve(mockMission)); // General mock
    (MMission.deleteOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) } as any);

    missionService = new MissionService();
  });

  it('should initialize without errors', async () => {
    await expect(missionService.init()).resolves.toBeUndefined();
  });

  describe('getMission', () => {
    it('should retrieve all missions with populated fields', async () => {
      mockQuery.exec.mockResolvedValue([mockMission]);
      const missions = await missionService.getMission();

      expect(MMission.find).toHaveBeenCalled();
      expect(mockQuery.populate).toHaveBeenCalledWith('student', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(missions).toEqual([mockMission]);
    });
  });

  describe('getMissionById', () => {
    it('should retrieve a single mission by its ID', async () => {
      mockQuery.exec.mockResolvedValue(mockMission);
      const mission = await missionService.getMissionById(mockMissionId.toHexString());

      expect(MMission.findById).toHaveBeenCalledWith(mockMissionId.toHexString());
      expect(mockQuery.populate).toHaveBeenCalledWith('student', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(mission).toEqual(mockMission);
    });

    it('should return null if no mission is found', async () => {
      mockQuery.exec.mockResolvedValue(null);
      const mission = await missionService.getMissionById(new Types.ObjectId().toHexString());
      expect(mission).toBeNull();
    });
  });

  describe('createMission', () => {
    it('should create and save a new mission', async () => {
      const missionData = {
        bundleId: new Types.ObjectId().toHexString(),
        documentPath: 'new/path/doc.pdf',
        documentName: 'new_doc.pdf',
        studentId: new Types.ObjectId().toHexString(),
        tutorId: new Types.ObjectId().toHexString(),
        remuneration: 200,
        commissionedById: new Types.ObjectId().toHexString(),
        dateCompleted: new Date(),
      };

      const saveSpy = jest.fn().mockResolvedValue(mockMission);
      (MMission as any).mockImplementation(() => ({
        save: saveSpy,
      }));

      await missionService.createMission(missionData);

      expect(MMission).toHaveBeenCalledWith(expect.objectContaining({
        documentPath: missionData.documentPath,
        remuneration: missionData.remuneration,
        status: EMissionStatus.Active,
      }));
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('updateMission', () => {
    it('should find and update a mission with the provided data', async () => {
      const updateData = { remuneration: 500 };
      const expectedUpdatedMission = { ...mockMission, ...updateData };
      (MMission.findByIdAndUpdate as jest.Mock).mockResolvedValue(expectedUpdatedMission);

      const updatedMission = await missionService.updateMission(mockMissionId.toHexString(), updateData);

      expect(MMission.findByIdAndUpdate).toHaveBeenCalledWith(
        mockMissionId.toHexString(),
        { $set: updateData },
        { new: true }
      );
      expect(updatedMission?.remuneration).toBe(500);
    });
  });

  describe('setMissionStatus', () => {
    it('should find a mission and update its status', async () => {
        const newStatus = EMissionStatus.Completed;
        const expectedUpdatedMission = { ...mockMission, status: newStatus };
        (MMission.findByIdAndUpdate as jest.Mock).mockResolvedValue(expectedUpdatedMission);
        
        const updatedMission = await missionService.setMissionStatus(mockMissionId.toHexString(), newStatus);

        expect(MMission.findByIdAndUpdate).toHaveBeenCalledWith(
            mockMissionId.toHexString(),
            { $set: { status: newStatus } },
            { new: true }
        );
        expect(updatedMission?.status).toBe(newStatus);
    });
  });

  describe('deleteMission', () => {
    it('should delete a mission and return the correct deleted count', async () => {
      const result = await missionService.deleteMission(mockMissionId.toHexString());

      expect(MMission.deleteOne).toHaveBeenCalledWith({ _id: mockMissionId.toHexString() });
      expect(result).toEqual({ deletedCount: 1 });
    });
  });
});
