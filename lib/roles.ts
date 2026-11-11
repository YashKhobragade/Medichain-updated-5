export const USER_ROLES = {
    MANUFACTURER: 'manufacturer',
    DISTRIBUTOR: 'distributor',
    PHARMACY: 'vendor',
    HOSPITAL: 'hospital',
    CUSTOMER: 'customer',
    ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
    [USER_ROLES.MANUFACTURER]: 'Manufacturer',
    [USER_ROLES.DISTRIBUTOR]: 'Distributor',
    [USER_ROLES.PHARMACY]: 'Pharmacy',
    [USER_ROLES.HOSPITAL]: 'Hospital',
    [USER_ROLES.CUSTOMER]: 'Customer',
    [USER_ROLES.ADMIN]: 'Admin',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    [USER_ROLES.MANUFACTURER]: 'Create medicine batches and generate QR codes',
    [USER_ROLES.DISTRIBUTOR]: 'Transfer medicine batches in supply chain',
    [USER_ROLES.PHARMACY]: 'Receive and dispense medicines',
    [USER_ROLES.HOSPITAL]: 'Bulk verify deliveries and manage pharmacy stock',
    [USER_ROLES.CUSTOMER]: 'Verify medicine authenticity',
    [USER_ROLES.ADMIN]: 'Full access to all portals and analytics',
};

export const ROLE_PORTALS: Record<UserRole, string[]> = {
    [USER_ROLES.MANUFACTURER]: ['/manufacturer', '/distributor'],
    [USER_ROLES.DISTRIBUTOR]: ['/distributor'],
    [USER_ROLES.PHARMACY]: ['/distributor', '/inventory', '/bulk-verify'],
    [USER_ROLES.HOSPITAL]: ['/bulk-verify', '/inventory', '/distributor'],
    [USER_ROLES.CUSTOMER]: ['/verify'],
    [USER_ROLES.ADMIN]: ['/manufacturer', '/distributor', '/vendor', '/inventory', '/bulk-verify', '/verify', '/admin'],
};

export const ROLE_COLORS: Record<UserRole, string> = {
    [USER_ROLES.MANUFACTURER]: 'green',
    [USER_ROLES.DISTRIBUTOR]: 'yellow',
    [USER_ROLES.PHARMACY]: 'blue',
    [USER_ROLES.HOSPITAL]: 'purple',
    [USER_ROLES.CUSTOMER]: 'pink',
    [USER_ROLES.ADMIN]: 'red',
};

export function hasPortalAccess(userRole: UserRole | null, portalPath: string): boolean {
    if (!userRole) return false;
    if (userRole === USER_ROLES.ADMIN) return true;

    const allowedPortals = ROLE_PORTALS[userRole] || [];
    return allowedPortals.some(portal => portalPath.startsWith(portal));
}
