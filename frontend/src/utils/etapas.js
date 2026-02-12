export const ETAPAS = {
    NUEVO_LEAD: {
        nombre: 'Nuevo contacto',
        // Text styling for header
        textColor: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        icon: '🆕'
    },
    CONTACTO_INICIADO: {
        nombre: 'Contacto iniciado',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: '📞'
    },
    CALIFICACION: {
        nombre: 'Calificado',
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        icon: '⭐'
    },
    CITA_AGENDADA: {
        nombre: 'Cita agendada',
        textColor: 'text-fuchsia-700',
        bgColor: 'bg-fuchsia-50',
        borderColor: 'border-fuchsia-200',
        icon: '🗓️'
    },
    DEMO_REALIZADA: {
        nombre: 'Demostración realizada',
        textColor: 'text-sky-700',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
        icon: '💻'
    },
    CIERRE_GANADO: {
        nombre: 'Venta cerrada',
        textColor: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: '🎉'
    }
};

export const ETAPAS_ACTIVAS = [
    'NUEVO_LEAD',
    'CONTACTO_INICIADO',
    'CALIFICACION',
    'CITA_AGENDADA',
    'DEMO_REALIZADA',
    'CIERRE_GANADO'
];

export const RAZONES_PERDIDA = [
    'Precio muy alto',
    'No hay presupuesto',
    'Eligió competidor',
    'No es el momento',
    'No respondió',
    'No califica',
    'Otro'
];
