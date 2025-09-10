import { Router } from 'express';
import { authenticationMiddleware } from '../../../middleware/auth.middleware';
import NotificationService from '../../../services/NotificationService';

const router = Router();

// Get all notifications for the logged-in user
router.get('/', authenticationMiddleware, async (req, res) => {
    try {
        const notifications = await NotificationService.getNotificationsForUser(req.user!.id);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

router.post("/mock", authenticationMiddleware, async (req, res) => {
    await NotificationService.createNotification(req.user!.id, "Mock Notification", "Hello World");
    
    res.sendStatus(200);
});

// Mark a notification as read
router.patch('/:id/read', authenticationMiddleware, async (req, res) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id);
        if (notification) {
            res.json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

export default router;
