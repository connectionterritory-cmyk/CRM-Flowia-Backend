const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const role = req.user.Rol;
        const aliases = {
            ASESOR: 'VENDEDOR',
            ADMIN: 'DISTRIBUIDOR',
            GERENTE: 'DISTRIBUIDOR'
        };
        const normalizedRole = aliases[role] || role;

        if (!roles.includes(role) && !roles.includes(normalizedRole)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        next();
    };
};

module.exports = checkRole;
