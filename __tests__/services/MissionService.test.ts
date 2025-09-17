import { MissionService } from '../../src/app/services/MissionsService';
import MMission, { IMissions } from '../../src/app/db/models/MMissions.model';
import { EMissionStatus } from '../../src/app/models/enums/EMissions.enum';
import { Types } from 'mongoose';

// Mock the entire MMission model
jest.mock('../db/models/MMissions.model', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
  save: jest.fn(),
}));

// Helper function to create a mock mission object
const createMockMission = (id: string, studentId: string, commissionedById: string): IMissions => ({
  _id: new Types.ObjectId(id),
  document: `doc_${id}.pdf`,
  student: new Types.ObjectId(studentId),
  remuneration: 100,
  commissionedBy: new Types.ObjectId(commissionedById),
  dateCompleted: new Date('2025-10-01T00:00:00.000Z'),
  hoursCompleted: 5,
  status: EMissionStatus.Active,
  createdAt: new Date(),
  updatedAt: new Date(),
} as IMissions);

describe('MissionService', () => {
  let missionService: MissionService;

  beforeEach(() => {
    // Before each test, create a new instance of the service
    // and reset all mocks to ensure test isolation.
    missionService = new MissionService();
    (MMission.find as jest.Mock).mockClear();
    (MMission.findById as jest.Mock).mockClear();
    (MMission.findByIdAndUpdate as jest.Mock).mockClear();
    (MMission.deleteOne as jest.Mock).mockClear();
  });

  // Test suite for the getMission method
  describe('getMission', () => {
    it('should retrieve all missions and populate student and commissionedBy fields', async () => {
      const mockMissions = [createMockMission('1', 'student1', 'commissioner1')];
      const exec = jest.fn().mockResolvedValue(mockMissions);
      const populate = jest.fn().mockReturnThis();
      (MMission.find as jest.Mock).mockReturnValue({ populate });

      const missions = await missionService.getMission();

      expect(MMission.find).toHaveBeenCalled();
      expect(populate).toHaveBeenCalledWith('student', 'displayName');
      expect(populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(missions).toEqual(mockMissions);
    });
  });

  // Test suite for the getMissionById method
  describe('getMissionById', () => {
    it('should retrieve a single mission by its ID', async () => {
      const mockMission = createMockMission('1', 'student1', 'commissioner1');
      const exec = jest.fn().mockResolvedValue(mockMission);
      const populate = jest.fn().mockReturnThis();
      (MMission.findById as jest.Mock).mockReturnValue({ populate });
      
      const mission = await missionService.getMissionById('1');

      expect(MMission.findById).toHaveBeenCalledWith('1');
      expect(populate).toHaveBeenCalledWith('student', 'displayName');
      expect(populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(mission).toEqual(mockMission);
    });
  });

  // Test suite for the createMission method
  describe('createMission', () => {
    it('should create and save a new mission', async () => {
        const missionData = {
            document: 'mission_doc.pdf',
            studentId: new Types.ObjectId().toHexString(),
            remuneration: 150,
            commissionedById: new Types.ObjectId().toHexString(),
            dateCompleted: new Date(),
        };

        // We have to mock the constructor and the save method
        const saveMock = jest.fn().mockResolvedValue(true);
        const missionInstance = { ...missionData, save: saveMock };
        (MMission as any).mockImplementation(() => missionInstance);

        const newMission = await missionService.createMission(missionData);

        expect(saveMock).toHaveBeenCalled();
        // Check a few properties to ensure the object was created correctly
        expect(newMission).toHaveProperty('document', missionData.document);
        expect(newMission).toHaveProperty('status', EMissionStatus.Active);
    });
  });

  // Test suite for the updateMission method
  describe('updateMission', () => {
    it('should find and update a mission with new data', async () => {
      const updateData: Partial<IMissions> = { remuneration: 200, status: EMissionStatus.Completed };
      (MMission.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...createMockMission('1', 's1', 'c1'), ...updateData });

      const updatedMission = await missionService.updateMission('1', updateData);

      expect(MMission.findByIdAndUpdate).toHaveBeenCalledWith('1', { $set: updateData }, { new: true });
      expect(updatedMission?.remuneration).toBe(200);
      expect(updatedMission?.status).toBe(EMissionStatus.Completed);
    });
  });

  // Test suite for the setMissionStatus method
  describe('setMissionStatus', () => {
    it('should update only the status of a mission', async () => {
      const newStatus = EMissionStatus.Completed;
      (MMission.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...createMockMission('1', 's1', 'c1'), status: newStatus });
      
      const updatedMission = await missionService.setMissionStatus('1', newStatus);

      expect(MMission.findByIdAndUpdate).toHaveBeenCalledWith('1', { $set: { status: newStatus } }, { new: true });
      expect(updatedMission?.status).toBe(newStatus);
    });
  });

  // Test suite for the deleteMission method
  describe('deleteMission', () => {
    it('should delete a mission and return the deleted count', async () => {
        const exec = jest.fn().mockResolvedValue({ deletedCount: 1 });
        (MMission.deleteOne as jest.Mock).mockReturnValue({ exec });

        const result = await missionService.deleteMission('1');

        expect(MMission.deleteOne).toHaveBeenCalledWith({ _id: '1' });
        expect(result.deletedCount).toBe(1);
    });
  });
});