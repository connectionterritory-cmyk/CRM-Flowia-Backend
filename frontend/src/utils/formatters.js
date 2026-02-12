import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PA', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        // Handle SQLite format if needed or direct ISO
        return format(parseISO(dateString), 'dd MMM yyyy', { locale: es });
    } catch (e) {
        return dateString;
    }
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
        return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: es });
    } catch (e) {
        return dateString;
    }
};

export const getStatusColor = (status) => {
    const map = {
        'Activo': 'bg-green-100 text-green-800',
        'Inactivo': 'bg-gray-100 text-gray-800',
        'Moroso': 'bg-red-100 text-red-800',
        'Pendiente': 'bg-yellow-100 text-yellow-800',
        'Completada': 'bg-green-100 text-green-800',
        'Entregado': 'bg-green-100 text-green-800',
        'Enviado': 'bg-blue-100 text-blue-800',
        'Servicio': 'bg-blue-50 text-blue-700',
        'Venta': 'bg-purple-50 text-purple-700'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
};

export const normalizeNoDice = (value) => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).trim();
    if (!normalized) return '';
    if (normalized.toUpperCase() === 'NO_DICE') return '';
    return normalized;
};

export const formatOptional = (value, fallback = '-') => {
    const normalized = normalizeNoDice(value);
    return normalized || fallback;
};
