import { Router } from 'express';
import { authenticationMiddleware } from '../../../middleware/auth.middleware';
import NotificationService from '../../../services/NotificationService';

const router = Router();

// Get all notifications for the logged-in user
router.get('/', authenticationMiddleware, async (req, res) => {
    try {
        const notifications = await NotificationService.getNotificationsForUser(req.user!.id);
        res.json(notifications);
    } catch (_) {
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
    } catch (_) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// Delete all read notifications for the logged-in user
router.delete('/read', authenticationMiddleware, async (req, res) => {
    try {
        const result = await NotificationService.deleteAllReadForUser(req.user!.id);
        res.json(result);
    } catch (_) {
        res.status(500).json({ message: 'Error deleting read notifications' });
    }
});

router.delete('/:id', authenticationMiddleware, async (req, res) => {
    try {
        const notification = await NotificationService.deleteNotification(req.params.id);
        if (notification) {
            res.json({ message: 'Notification deleted successfully' });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (_) {
        res.status(500).json({ message: 'Error deleting notification' });
    }
});

// Mark all notifications as read for the logged-in user
router.patch('/read-all', authenticationMiddleware, async (req, res) => {
    try {
        const result = await NotificationService.markAllAsReadForUser(req.user!.id);
        res.json(result);
    } catch (_) {
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
});

// Restore a soft-deleted notification
router.patch('/:id/restore', authenticationMiddleware, async (req, res) => {
    try {
        const notification = await NotificationService.restoreNotification(req.params.id);
        if (notification) {
            res.json(notification);
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (_) {
        res.status(500).json({ message: 'Error restoring notification' });
    }
});

export default router;
