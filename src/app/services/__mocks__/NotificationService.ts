export const NotificationService = {
    createNotification: jest.fn().mockResolvedValue({}),
    getNotificationsForUser: jest.fn().mockResolvedValue([]),
    markAsRead: jest.fn().mockResolvedValue({}),
    deleteNotification: jest.fn().mockResolvedValue({}),
    markAllAsReadForUser: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 0 }),
    deleteAllReadForUser: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 0 }),
    restoreNotification: jest.fn().mockResolvedValue({}),
};

export default NotificationService;
