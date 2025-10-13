import { Router } from 'express';
import PayslipService from '../../services/PayslipService';
import { authenticationMiddleware } from '../../middleware/auth.middleware';
import { hasPermission } from '../../middleware/permission.middleware';
import { EPermission } from '../../models/enums/EPermission.enum';
import { EPayslipStatus } from '../../models/enums/EPayslipStatus.enum';
import { Types } from 'mongoose';
import IPayloadUser from '../../models/interfaces/IPayloadUser.interface';
import UserService from '../../services/UserService';

const router = Router();
const payslipService = PayslipService;

router.use(authenticationMiddleware);

// ===== ADMIN ROUTES =====

// Get all payslips (admin only)
router.get(
    '/',
    hasPermission(EPermission.CAN_MANAGE_PAYSLIPS),
    async (req, res) => {
        try {
            const { status, userId, payPeriod } = req.query;
            const filters: { status?: EPayslipStatus; userId?: Types.ObjectId; payPeriod?: string } = {};

            if (status) filters.status = status as EPayslipStatus;
            if (userId) filters.userId = new Types.ObjectId(userId as string);
            if (payPeriod) filters.payPeriod = payPeriod as string;

            const payslips = await payslipService.getAllPayslips(filters);
            res.status(200).json(payslips);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error fetching all payslips', error: err.message });
        }
    }
);

// Approve payslip (change from StaffApproved to Locked)
router.post(
    '/:id/approve',
    hasPermission(EPermission.CAN_MANAGE_PAYSLIPS),
    async (req, res) => {
        try {
            const { id } = req.params;
            const user = req.user as IPayloadUser;

            const updatedPayslip = await payslipService.updatePayslipStatus(
                new Types.ObjectId(id),
                EPayslipStatus.LOCKED,
                new Types.ObjectId(user.id)
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error approving payslip', error: err.message });
        }
    }
);

// Reject payslip (change from StaffApproved back to Draft)
router.post(
    '/:id/reject',
    hasPermission(EPermission.CAN_MANAGE_PAYSLIPS),
    async (req, res) => {
        try {
            const { id } = req.params;
            const user = req.user as IPayloadUser;

            const updatedPayslip = await payslipService.updatePayslipStatus(
                new Types.ObjectId(id),
                EPayslipStatus.DRAFT,
                new Types.ObjectId(user.id)
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error rejecting payslip', error: err.message });
        }
    }
);

// Mark payslip as paid (change from Locked to Paid)
router.post(
    '/:id/mark-paid',
    hasPermission(EPermission.CAN_MANAGE_PAYSLIPS),
    async (req, res) => {
        try {
            const { id } = req.params;
            const user = req.user as IPayloadUser;

            const updatedPayslip = await payslipService.updatePayslipStatus(
                new Types.ObjectId(id),
                EPayslipStatus.PAID,
                new Types.ObjectId(user.id)
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error marking payslip as paid', error: err.message });
        }
    }
);

// Add item to payslip (admin only)
router.post(
    '/:id/add-item',
    hasPermission(EPermission.CAN_MANAGE_PAYSLIPS),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { itemType, itemData } = req.body;

            if (!itemType || !itemData) {
                return res.status(400).json({ message: 'itemType and itemData are required' });
            }

            const validTypes = ['earning', 'miscEarning', 'bonus', 'deduction'];
            if (!validTypes.includes(itemType)) {
                return res.status(400).json({ message: 'Invalid itemType' });
            }

            const updatedPayslip = await payslipService.addItemToPayslip(
                new Types.ObjectId(id),
                itemType,
                itemData
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error adding item to payslip', error: err.message });
        }
    }
);

// Remove item from payslip (admin only)
router.delete(
    '/:id/item/:itemId',
    hasPermission(EPermission.CAN_MANAGE_PAYSLIPS),
    async (req, res) => {
        try {
            const { id, itemId } = req.params;

            const updatedPayslip = await payslipService.removeItemFromPayslip(
                new Types.ObjectId(id),
                itemId
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error removing item from payslip', error: err.message });
        }
    }
);

// ===== USER ROUTES =====

// NEW ROUTE: Get all payslips for the logged-in user
router.get(
    '/my-history',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const user = req.user as IPayloadUser;
            const payslips = await payslipService.getPayslipHistory(new Types.ObjectId(user.id));
            res.status(200).json(payslips);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching payslip history', error });
        }
    }
);

// Get the current user's payslip for the current month (without auto-creating)
router.get(
    '/me',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const user = req.user as IPayloadUser;
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const payPeriod = `${year}-${month}`;

            const userId = new Types.ObjectId(user.id);
            let payslip = await payslipService.getDraftPayslip(userId, payPeriod);

            if (!payslip) {
                // Check for other existing payslips
                payslip = await payslipService.getPayslip(userId, payPeriod);
            }

            res.status(200).json(payslip); // Will be null if no payslip exists
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error fetching payslip', error: err.message });
        }
    }
);

// Generate a new draft payslip for the current month
router.post(
    '/generate',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const user = req.user as IPayloadUser;
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const payPeriod = `${year}-${month}`;

            const userId = new Types.ObjectId(user.id);

            // Check if a payslip already exists for this period
            const existingPayslip = await payslipService.getDraftPayslip(userId, payPeriod);
            if (existingPayslip) {
                return res.status(400).json({ message: 'Payslip already exists for this period' });
            }

            const payslip = await payslipService.getOrCreateDraftPayslip(userId, payPeriod);
            res.status(201).json(payslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error generating payslip', error: err.message });
        }
    }
);

router.get(
    '/preapproved-items',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const items = await PayslipService.getPreapprovedItems();
            res.status(200).json(items || []);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error fetching pre-approved items', error: err.message });
        }
    }
)

// Get a specific payslip
router.get(
    '/:id',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP), // Permission needs to be updated here to check for whether this payslip can be accessed
    async (req, res) => {
        try {
            const { id } = req.params;
            const user = req.user as IPayloadUser;

            const payslip = await payslipService.getPayslipById(id);

            if (!payslip) {
                res.status(200).json(null);
                return;
            }

            if (user.id == payslip.userId.toHexString()) {
                res.status(200).json(payslip);
                return;
            }

            const userWithPermissions = await UserService.getUser(user.id);

            if (!userWithPermissions || !(new Set(userWithPermissions.permissions).has(EPermission.CAN_MANAGE_PAYSLIPS))) {
                res.sendStatus(403);
                return;
            }

            res.send(200).json(payslip);

        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating payslip status', error: err.message });
        }
    }
);

// Update the status of a payslip
router.put(
    '/:id/status',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP), 
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = req.user as IPayloadUser;

            const updatedPayslip = await payslipService.updatePayslipStatus(
                new Types.ObjectId(id), 
                status, 
                new Types.ObjectId(user.id)
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating payslip status', error: err.message });
        }
    }
);

// Add a query note to a payslip item
router.post(
    '/:id/query',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { itemId, note } = req.body;
            const user = req.user as IPayloadUser;

            if (!itemId || !note) {
                return res.status(400).json({ message: 'itemId and note are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip or has permission to manage payslips
            if (payslip.userId.toString() !== user.id) {
                const userWithPermissions = await UserService.getUser(user.id);
                if (!userWithPermissions || !userWithPermissions.permissions.includes(EPermission.CAN_MANAGE_PAYSLIPS)) {
                    return res.status(403).json({ message: 'Unauthorized' });
                }
            }

            const updatedPayslip = await payslipService.addQueryNote(
                new Types.ObjectId(id),
                itemId,
                note
            );

            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error adding query note', error: err.message });
        }
    }
);

// Update an existing query note on a payslip item
router.put(
    '/:id/query/:queryId',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, queryId } = req.params;
            const { note } = req.body;
            const user = req.user as IPayloadUser;

            if (!note) {
                return res.status(400).json({ message: 'note is required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip or has permission to manage payslips
            if (payslip.userId.toString() !== user.id) {
                const userWithPermissions = await UserService.getUser(user.id);
                if (!userWithPermissions || !userWithPermissions.permissions.includes(EPermission.CAN_MANAGE_PAYSLIPS)) {
                    return res.status(403).json({ message: 'Unauthorized' });
                }
            }

            const updatedPayslip = await payslipService.updateQueryNote(
                new Types.ObjectId(id),
                queryId,
                note
            );

            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating query note', error: err.message });
        }
    }
);

// Delete a query note from a payslip item
router.delete(
    '/:id/query/:queryId',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, queryId } = req.params;
            const user = req.user as IPayloadUser;

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip or has permission to manage payslips
            if (payslip.userId.toString() !== user.id) {
                const userWithPermissions = await UserService.getUser(user.id);
                if (!userWithPermissions || !userWithPermissions.permissions.includes(EPermission.CAN_MANAGE_PAYSLIPS)) {
                    return res.status(403).json({ message: 'Unauthorized' });
                }
            }

            const updatedPayslip = await payslipService.deleteQueryNote(
                new Types.ObjectId(id),
                queryId
            );

            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error deleting query note', error: err.message });
        }
    }
);

// Resolve a query note on a payslip item (existing endpoint exists, updating to be explicit)
router.post(
    '/:id/query/:queryId/resolve',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, queryId } = req.params;
            const { resolutionNote } = req.body;
            const user = req.user as IPayloadUser;

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip or has permission to manage payslips
            if (payslip.userId.toString() !== user.id) {
                const userWithPermissions = await UserService.getUser(user.id);
                if (!userWithPermissions || !userWithPermissions.permissions.includes(EPermission.CAN_MANAGE_PAYSLIPS)) {
                    return res.status(403).json({ message: 'Unauthorized' });
                }
            }

            const updatedPayslip = await payslipService.resolveQueryNote(
                new Types.ObjectId(id),
                queryId,
                resolutionNote
            );

            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error resolving query note', error: err.message });
        }
    }
);

// Add a bonus to a payslip
router.post(
    '/:id/bonuses',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { description, amount } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || amount === undefined || amount === null) {
                return res.status(400).json({ message: 'description and amount are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const updatedPayslip = await payslipService.addBonus(
                new Types.ObjectId(id),
                description,
                amount
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error adding bonus', error: err.message });
        }
    }
);

// Update a bonus in a payslip
router.put(
    '/:id/bonuses/:bonusIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, bonusIndex } = req.params;
            const { description, amount } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || amount === undefined || amount === null) {
                return res.status(400).json({ message: 'description and amount are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(bonusIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid bonus index' });
            }

            const updatedPayslip = await payslipService.updateBonus(
                new Types.ObjectId(id),
                index,
                description,
                amount
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating bonus', error: err.message });
        }
    }
);

// Remove a bonus from a payslip
router.delete(
    '/:id/bonuses/:bonusIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, bonusIndex } = req.params;
            const user = req.user as IPayloadUser;

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(bonusIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid bonus index' });
            }

            const updatedPayslip = await payslipService.removeBonus(
                new Types.ObjectId(id),
                index
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error removing bonus', error: err.message });
        }
    }
);

// ===== EARNINGS CRUD OPERATIONS =====

// Update an earning in a payslip
router.put(
    '/:id/earnings/:earningIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, earningIndex } = req.params;
            const { description, baseRate, hours, rate, date, total } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || baseRate === undefined || hours === undefined || rate === undefined || !date || total === undefined) {
                return res.status(400).json({ message: 'description, baseRate, hours, rate, date, and total are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(earningIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid earning index' });
            }

            const updatedPayslip = await payslipService.updateEarning(
                new Types.ObjectId(id),
                index,
                description,
                baseRate,
                hours,
                rate,
                date,
                total
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating earning', error: err.message });
        }
    }
);

// ===== DEDUCTION CRUD OPERATIONS =====

// Add a deduction to a payslip
router.post(
    '/:id/deductions',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { description, amount } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || amount === undefined || amount === null) {
                return res.status(400).json({ message: 'description and amount are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const updatedPayslip = await payslipService.addDeduction(
                new Types.ObjectId(id),
                description,
                amount
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error adding deduction', error: err.message });
        }
    }
);

// Update a deduction in a payslip
router.put(
    '/:id/deductions/:deductionIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, deductionIndex } = req.params;
            const { description, amount } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || amount === undefined || amount === null) {
                return res.status(400).json({ message: 'description and amount are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(deductionIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid deduction index' });
            }

            const updatedPayslip = await payslipService.updateDeduction(
                new Types.ObjectId(id),
                index,
                description,
                amount
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating deduction', error: err.message });
        }
    }
);

// Remove a deduction from a payslip
router.delete(
    '/:id/deductions/:deductionIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, deductionIndex } = req.params;
            const user = req.user as IPayloadUser;

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(deductionIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid deduction index' });
            }

            const updatedPayslip = await payslipService.removeDeduction(
                new Types.ObjectId(id),
                index
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error removing deduction', error: err.message });
        }
    }
);

// ===== MISC EARNINGS CRUD OPERATIONS =====

// Add a misc earning to a payslip
router.post(
    '/:id/misc-earnings',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { description, amount } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || amount === undefined || amount === null) {
                return res.status(400).json({ message: 'description and amount are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const updatedPayslip = await payslipService.addMiscEarning(
                new Types.ObjectId(id),
                description,
                amount
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error adding misc earning', error: err.message });
        }
    }
);

// Update a misc earning in a payslip
router.put(
    '/:id/misc-earnings/:earningIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, earningIndex } = req.params;
            const { description, amount } = req.body;
            const user = req.user as IPayloadUser;

            if (!description || amount === undefined || amount === null) {
                return res.status(400).json({ message: 'description and amount are required' });
            }

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(earningIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid misc earning index' });
            }

            const updatedPayslip = await payslipService.updateMiscEarning(
                new Types.ObjectId(id),
                index,
                description,
                amount
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error updating misc earning', error: err.message });
        }
    }
);

// Remove a misc earning from a payslip
router.delete(
    '/:id/misc-earnings/:earningIndex',
    hasPermission(EPermission.CAN_VIEW_OWN_PAYSLIP),
    async (req, res) => {
        try {
            const { id, earningIndex } = req.params;
            const user = req.user as IPayloadUser;

            const payslip = await payslipService.getPayslipById(id);
            if (!payslip) {
                return res.status(404).json({ message: 'Payslip not found' });
            }

            // Check if user owns this payslip
            if (payslip.userId.toString() !== user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const index = parseInt(earningIndex, 10);
            if (isNaN(index)) {
                return res.status(400).json({ message: 'Invalid misc earning index' });
            }

            const updatedPayslip = await payslipService.removeMiscEarning(
                new Types.ObjectId(id),
                index
            );
            res.status(200).json(updatedPayslip);
        } catch (error) {
            const err = error as Error;
            res.status(500).json({ message: 'Error removing misc earning', error: err.message });
        }
    }
);

export default router;


