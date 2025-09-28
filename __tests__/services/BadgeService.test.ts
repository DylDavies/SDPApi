import mongoose from 'mongoose';
import { BadgeService } from '../../src/app/services/BadgeService';
import MBadge from '../../src/app/db/models/MBadge.model';
import MBadgeRequirement from '../../src/app/db/models/MBadgeRequirement.model';
import { IBadgeWithRequirements } from '../../src/app/models/interfaces/IBadgeWithRequirements.interface';


jest.mock('../../src/app/db/models/MBadge.model');
jest.mock('../../src/app/db/models/MBadgeRequirement.model');

describe('BadgeService', () => {
  let badgeService: BadgeService;

  beforeEach(() => {
    badgeService = new BadgeService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addOrUpdatebadge', () => {
    it('should create a new badge and its requirements if no _id is provided', async () => {
      const newBadgeData = {
        name: 'New Badge', TLA: 'NEW', image: 'star', summary: 'A new badge.',
        description: 'Details here.', permanent: true, bonus: 10,
        requirements: 'Do the thing.'
      };
      const mockSavedBadge = { ...newBadgeData, _id: new mongoose.Types.ObjectId() };

      (MBadge.prototype.save as jest.Mock).mockResolvedValue(mockSavedBadge);
      (MBadgeRequirement.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await badgeService.addOrUpdatebadge(newBadgeData as IBadgeWithRequirements);

      expect(MBadge.prototype.save).toHaveBeenCalledTimes(1);
      expect(MBadgeRequirement.findOneAndUpdate).toHaveBeenCalledWith(
        { badgeId: mockSavedBadge._id },
        { badgeId: mockSavedBadge._id, requirements: newBadgeData.requirements },
        expect.anything()
      );
      expect(result).toEqual(mockSavedBadge);
    });

    it('should update an existing badge and its requirements if an _id is provided', async () => {
      const badgeId = new mongoose.Types.ObjectId();
      const badgeDataToUpdate: IBadgeWithRequirements = {
        _id: badgeId,
        name: 'Updated Badge', TLA: 'UPD', image: 'verified', summary: 'An updated badge.',
        description: 'Updated details.', permanent: false, bonus: 20,
        requirements: 'Do the new thing.'
      };
      const mockUpdatedBadge = { ...badgeDataToUpdate };

      (MBadge.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedBadge);
      (MBadgeRequirement.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await badgeService.addOrUpdatebadge(badgeDataToUpdate);

      expect(MBadge.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(MBadgeRequirement.findOneAndUpdate).toHaveBeenCalledWith(
        { badgeId: mockUpdatedBadge._id },
        { badgeId: mockUpdatedBadge._id, requirements: badgeDataToUpdate.requirements },
        expect.anything()
      );
      expect(result).toEqual(mockUpdatedBadge);
    });
  });

  describe('deleteBadge', () => {
    it('should delete both the badge and its requirement', async () => {
      const badgeId = new mongoose.Types.ObjectId();
      (MBadgeRequirement.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
      (MBadge.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await badgeService.deleteBadge(badgeId.toHexString());

      expect(MBadgeRequirement.deleteOne).toHaveBeenCalledWith({ badgeId: badgeId.toHexString() });
      expect(MBadge.deleteOne).toHaveBeenCalledWith({ _id: badgeId.toHexString() });
    });
  });

  describe('getBadgesByIds', () => {
    it('should retrieve multiple badges by an array of badge IDs', async () => {
        const ids = [new mongoose.Types.ObjectId().toHexString(), new mongoose.Types.ObjectId().toHexString()];
        await badgeService.getBadgesByIds(ids);
        expect(MBadge.find).toHaveBeenCalledWith({ '_id': { $in: ids } });
    });
  });
});