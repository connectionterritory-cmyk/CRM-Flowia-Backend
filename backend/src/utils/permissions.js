const ROLES = {
    DISTRIBUIDOR: 'DISTRIBUIDOR',
    VENDEDOR: 'VENDEDOR',
    TELEMARKETING: 'TELEMARKETING',
};

const canManageUsers = (role) => role === ROLES.DISTRIBUIDOR;

module.exports = {
    ROLES,
    canManageUsers,
};
