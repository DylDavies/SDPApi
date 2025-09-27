/**
 * Defines all possible granular permissions available in the system.
 * These are the fundamental building blocks for roles.
 * Using a string enum makes them readable in the database and JWTs.
 */
export enum EPermission {
    // Role Management Permissions
    ROLES_CREATE = 'roles:create',
    ROLES_VIEW = 'roles:view',
    ROLES_EDIT = 'roles:edit',
    ROLES_DELETE = 'roles:delete',

    // User Management Permissions
    USERS_VIEW = 'users:view',
    USERS_MANAGE_ROLES = 'users:manage_roles', // Assign/remove roles from users
    USERS_EDIT = 'users:edit',
    USERS_DELETE = 'users:delete',
    VIEW_USER_PROFILE = 'users:view_profile',

    // Page/Feature Access Permissions
    DASHBOARD_VIEW = 'dashboard:view',
    ADMIN_DASHBOARD_VIEW = 'admin_dashboard:view',
    PROFILE_PAGE_VIEW = 'profile_page:view',

    // Bundle Management Permissions
    BUNDLES_CREATE = 'bundles:create',
    BUNDLES_VIEW = 'bundles:view',
    BUNDLES_EDIT = 'bundles:edit',
    BUNDLES_DELETE = 'bundles:delete',
    BUNDLES_APPROVE = 'bundles:approve',

    //Leave Management Permissions
    LEAVE_MANAGE = "leave:manage",

    // Proficiency Management Permissions
    PROFICIENCIES_MANAGE = 'proficiencies:manage',
    // Extra Work Permissions
    EXTRA_WORK_CREATE = 'extra_work:create',
    EXTRA_WORK_VIEW = 'extra_work:view',
    EXTRA_WORK_VIEW_ALL = 'extra_work:view_all',
    EXTRA_WORK_EDIT = 'extra_work:edit',
    EXTRA_WORK_APPROVE = 'extra_work:approve',


    //Missions Management Permissions
    MISSIONS_CREATE = 'missions:create',
    MISSIONS_VIEW = 'missions:view',
    MISSIONS_EDIT = 'missions:edit',
    MISSIONS_DELETE = 'missions:delete',
    MISSIONS_APPROVE = 'missions:approve',


    // Sidebar Management
    SIDEBAR_MANAGE = 'sidebar:manage',

    // Badge Management Permissions
    BADGES_CREATE = 'badges:create',
    BADGES_MANAGE = 'badges:manage',
    BADGES_VIEW = 'badges:view',
    BADGES_VIEW_REQUIREMENTS = 'badges:view_requirements',
    BADGES_MANAGE_REQUIREMENTS = 'badges:manage_requirements',

    CAN_MANAGE_PAYSLIPS = 'payslips:manage',
    CAN_VIEW_OWN_PAYSLIP = 'payslips:view_own',
    CAN_MANAGE_PREAPPROVED_ITEMS = 'payslips:preapproved_items_manage',
    CAN_ADJUST_RATES = 'payslips:rate_adjustment'

    // Notifications View Permissions
    NOTIFICATIONS_VIEW = 'notifications:view',
    
    // Remark management Permission
    REMARKS_MANAGE = 'remarks:manage',
}