import { MissionService } from '../../src/app/services/MissionsService';
import MMission from '../../src/app/db/models/MMissions.model';
import { Types } from 'mongoose';
import { EMissionStatus } from '../../src/app/models/enums/EMissions.enum';

// Mock the entire module
jest.mock('../../src/app/db/models/MMissions.model');

// Create a mock query object that supports method chaining
const createMockQuery = (mockData: any) => {
  return {
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(mockData)
  };
};

describe('MissionService', () => {
  let missionService: MissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    missionService = new MissionService();
  });

  describe('getMission', () => {
    it('should retrieve all missions with populated user data', async () => {
      const mockMissions = [
        { _id: new Types.ObjectId(), documentName: 'Mission 1' },
        { _id: new Types.ObjectId(), documentName: 'Mission 2' }
      ];

      // Mock the method chain
      const mockQuery = createMockQuery(mockMissions);
      (MMission.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await missionService.getMission();

      expect(MMission.find).toHaveBeenCalled();
      expect(mockQuery.populate).toHaveBeenCalledWith('student', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('document');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMissions);
    });
  });

  describe('getMissionById', () => {
    it('should retrieve a mission by ID with populated user data', async () => {
      const missionId = new Types.ObjectId().toHexString();
      const mockMission = { _id: missionId, documentName: 'Test Mission' };

      const mockQuery = createMockQuery(mockMission);
      (MMission.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await missionService.getMissionById(missionId);

      expect(MMission.findById).toHaveBeenCalledWith(missionId);
      expect(mockQuery.populate).toHaveBeenCalledWith('student', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
       expect(mockQuery.populate).toHaveBeenCalledWith('document');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMission);
    });
  });

  describe('getMissionsByStudentId', () => {
    it('should retrieve missions for a specific student', async () => {
      const studentId = new Types.ObjectId().toHexString();
      const mockMissions = [
        { _id: new Types.ObjectId(), student: studentId, documentName: 'Student Mission' }
      ];

      const mockQuery = createMockQuery(mockMissions);
      (MMission.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await missionService.getMissionsByStudentId(studentId);

      expect(MMission.find).toHaveBeenCalledWith({ student: studentId });
      expect(mockQuery.populate).toHaveBeenCalledWith('student', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('tutor', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('document');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMissions);
    });
  });

  describe('getMissionsByBundleId', () => {
    it('should retrieve missions for a specific bundle', async () => {
      const bundleId = new Types.ObjectId().toHexString();
      const mockMissions = [
        { _id: new Types.ObjectId(), bundleId: bundleId, documentName: 'Bundle Mission' }
      ];

      const mockQuery = createMockQuery(mockMissions);
      (MMission.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await missionService.getMissionsByBundleId(bundleId);

      expect(MMission.find).toHaveBeenCalledWith({ bundleId: bundleId });
      expect(mockQuery.populate).toHaveBeenCalledWith('student', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('tutor', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('commissionedBy', 'displayName');
      expect(mockQuery.populate).toHaveBeenCalledWith('document');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMissions);
    });
  });

  describe('createMission', () => {
    it('should create a new mission with valid data', async () => {
        const missionData = {
            bundleId: new Types.ObjectId().toHexString(),
            documentId: new Types.ObjectId().toHexString(),
            studentId: new Types.ObjectId().toHexString(),
            tutorId: new Types.ObjectId().toHexString(),
            remuneration: 100,
            commissionedById: new Types.ObjectId().toHexString(),
            dateCompleted: new Date()
        };
  
        const mockMission = {
            ...missionData,
            _id: new Types.ObjectId(),
            save: jest.fn().mockResolvedValue(true)
        };
  
        // Mock the constructor
        (MMission as unknown as jest.Mock).mockImplementation(() => mockMission);
  
        const result = await missionService.createMission(missionData);
  
        expect(MMission).toHaveBeenCalledWith({
            bundleId: new Types.ObjectId(missionData.bundleId),
            document: new Types.ObjectId(missionData.documentId),
            student: new Types.ObjectId(missionData.studentId),
            tutor: new Types.ObjectId(missionData.tutorId),
            remuneration: missionData.remuneration,
            commissionedBy: new Types.ObjectId(missionData.commissionedById),
            dateCompleted: missionData.dateCompleted,
            status: EMissionStatus.Active
        });
        expect(mockMission.save).toHaveBeenCalled();
        expect(result).toEqual(mockMission);
    });
  });


  describe('deleteMission', () => {
    it('should delete a mission and return deletion count', async () => {
      const missionId = new Types.ObjectId().toHexString();
      const deleteResult = { deletedCount: 1 };

      // Mock the exec method for deleteOne
      const mockDeleteQuery = {
        exec: jest.fn().mockResolvedValue(deleteResult)
      };
      (MMission.deleteOne as jest.Mock).mockReturnValue(mockDeleteQuery);

      const result = await missionService.deleteMission(missionId);

      expect(MMission.deleteOne).toHaveBeenCalledWith({ _id: missionId });
      expect(mockDeleteQuery.exec).toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 1 });
    });
  });
  describe('findMissionByBundleAndTutor', () => {
     it('should find a mission by bundle and tutor ID', async () => {
      const bundleId = new Types.ObjectId();
      const tutorId = new Types.ObjectId();
      const mockMission = { _id: new Types.ObjectId(), bundleId, tutor: tutorId };

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockMission)
      };
        (MMission.findOne as jest.Mock).mockReturnValue(mockQuery);

      const result = await missionService.findMissionByBundleAndTutor(bundleId.toHexString(), tutorId.toHexString());

        expect(MMission.findOne).toHaveBeenCalledWith({
          bundleId: bundleId,
          tutor: tutorId
        });
        expect(mockQuery.exec).toHaveBeenCalled();
        expect(result).toEqual(mockMission);
  });
 });
 describe('updateMissionHours', () => {
   it('should update the hours of a mission', async () => {
      const missionId = new Types.ObjectId().toHexString();
      const hours = 5;
      const mockUpdatedMission = { _id: missionId, hoursCompleted: hours };

      (MMission.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedMission);

      const result = await missionService.updateMissionHours(missionId, hours);

      expect(MMission.findByIdAndUpdate).toHaveBeenCalledWith(
        missionId,
        { $set: { hoursCompleted: hours } },
        { new: true }
      );
      expect(result).toEqual(mockUpdatedMission);
    });
  });
});