import express from 'express';
import { keyAuth } from '../../middleware/keyAuth.middleware';
import { IRole } from '../../db/models/MRole.model';
import { EUserType } from '../../models/enums/EUserType.enum';
import ProficiencyService from '../../services/ProficiencyService';
import UserService from '../../services/UserService';
import { Singleton } from '../../models/classes/Singleton';
import { LoggingService } from '../../services/LoggingService';

const router = express.Router();

const logger = Singleton.getInstance(LoggingService);

/**
 * @desc    Get a list of tutors members (stripped of sensitive data)
 * @access  Private (requires API Key)
 */
router.get('/tutors', keyAuth, async (req, res) => {
  try {
    // Fetch all users from your database
    const allUsers = (await UserService.getAllUsers()).filter(u => u.type == EUserType.Staff || u.type == EUserType.Admin);

    const strippedStaffData = allUsers.map(user => ({
      id: user._id,
      name: user.displayName,
      email: user.email,
      roles: user.roles.map(r => (r as unknown as IRole).name),
      proficiencies: user.proficiencies
    }));

    res.json(strippedStaffData);

  } catch (error) {
    logger.error('Error fetching staff data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @desc    Get a list of proficiencies
 * @access  Private (requires API Key)
 */
router.get('/proficiencies', keyAuth, async (req, res) => {
  try {
    // Fetch all proficiencies from your database
    const allProfs = await ProficiencyService.getProficiencies();

    res.json(allProfs);
  } catch (error) {
    logger.error('Error fetching staff data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
