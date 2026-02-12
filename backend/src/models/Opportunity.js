const Oportunidad = require('./Oportunidad');

const mapStatusToStage = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'won') return 'CIERRE_GANADO';
    if (normalized === 'lost') return 'CIERRE_PERDIDO';
    if (normalized === 'active') return 'NUEVO_LEAD';
    return null;
};

const mapStatusToEstadoCierre = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'lost') return 'No interesado';
    if (normalized === 'active') return 'Activo';
    if (normalized === 'won') return 'Activo';
    return null;
};

const create = async (data) => {
    const payload = { ...data };

    if (data.status && !data.etapa && !data.stage) {
        const mappedStage = mapStatusToStage(data.status);
        if (mappedStage) {
            payload.etapa = mappedStage;
        }
    }

    if (data.status && !data.estadoCierre) {
        const mappedStatus = mapStatusToEstadoCierre(data.status);
        if (mappedStatus) {
            payload.estadoCierre = mappedStatus;
        }
    }

    if (data.stage && !data.etapa) {
        payload.etapa = data.stage;
    }

    if (data.assignedTo && !data.ownerUserId && !data.assignedToUserId) {
        payload.ownerUserId = data.assignedTo;
    }

    return await Oportunidad.create(payload);
};

module.exports = {
    create,
    mapStatusToStage,
    mapStatusToEstadoCierre
};
