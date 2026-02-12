export const ROLE_LABEL_KEYS = {
    ADMIN: 'roles.admin',
    TELEMARKETING: 'roles.telemarketing',
    GERENTE: 'roles.manager',
    ASESOR: 'roles.asesor',
    VENDEDOR: 'roles.asesor',
    DISTRIBUIDOR: 'roles.distributor'
};

export const ROLE_ROUTES = {
    ADMIN: '/dashboard/overview',
    TELEMARKETING: '/dashboard/telemarketing',
    GERENTE: '/dashboard/overview',
    ASESOR: '/dashboard/asesor',
    VENDEDOR: '/dashboard/asesor',
    DISTRIBUIDOR: '/dashboard/distribuidor'
};

export const getUserRole = (user) => user?.role || user?.Rol || null;

export const getRoleLabelKey = (role) => ROLE_LABEL_KEYS[role] || 'roles.user';

export const getDefaultRouteForRole = (role) => ROLE_ROUTES[role] || '/dashboard/overview';
