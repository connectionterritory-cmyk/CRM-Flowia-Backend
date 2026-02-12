const AuthService = require('../services/AuthService');

const auditLog = (accion, options = {}) => {
    return (req, res, next) => {
        const onFinish = () => {
            res.removeListener('finish', onFinish);
            if (res.statusCode >= 400) return;

            const usuarioId = req.user?.UsuarioID || null;
            AuthService.logAudit({
                usuarioId,
                accion,
                entidad: options.entidad,
                entidadId: options.getEntidadId ? options.getEntidadId(req) : null,
                detalles: options.getDetalles ? options.getDetalles(req) : null,
                ip: req.ip,
            });
        };

        res.on('finish', onFinish);
        next();
    };
};

module.exports = auditLog;
