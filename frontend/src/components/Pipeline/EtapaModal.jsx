import React, { useState } from 'react';
import { RAZONES_PERDIDA } from '../../utils/etapas';

function EtapaModal({ etapa, oportunidad, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        fechaCita: '',
        proximaAccion: '',
        fechaProximaAccion: '',
        razonPerdida: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (etapa === 'CITA_AGENDADA' && !formData.fechaCita) {
            setError('La fecha de cita es obligatoria.');
            return;
        }

        if (etapa === 'SEGUIMIENTO') {
            if (!formData.proximaAccion || !formData.fechaProximaAccion) {
                setError('La próxima acción y su fecha son obligatorias.');
                return;
            }
        }

        if (etapa === 'CIERRE_PERDIDO' && !formData.razonPerdida) {
            setError('Selecciona una razón de pérdida.');
            return;
        }

        onSubmit(formData);
    };

    const renderFormFields = () => {
        if (etapa === 'CITA_AGENDADA') {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Cita *
                    </label>
                    <input
                        type="datetime-local"
                        required
                        value={formData.fechaCita}
                        onChange={(e) => setFormData({ ...formData, fechaCita: e.target.value })}
                        className="w-full h-11 px-4 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            );
        }

        if (etapa === 'SEGUIMIENTO') {
            return (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Próxima Acción
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Llamar para seguimiento"
                            required
                            value={formData.proximaAccion}
                            onChange={(e) => setFormData({ ...formData, proximaAccion: e.target.value })}
                            className="w-full h-11 px-4 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha Próxima Acción *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.fechaProximaAccion}
                            onChange={(e) => setFormData({ ...formData, fechaProximaAccion: e.target.value })}
                            className="w-full h-11 px-4 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </>
            );
        }

        if (etapa === 'CIERRE_PERDIDO') {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Razón de Pérdida *
                    </label>
                    <select
                        required
                        value={formData.razonPerdida}
                        onChange={(e) => setFormData({ ...formData, razonPerdida: e.target.value })}
                        className="w-full h-11 px-4 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Seleccionar...</option>
                        {RAZONES_PERDIDA.map(razon => (
                            <option key={razon} value={razon}>{razon}</option>
                        ))}
                    </select>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Completar Información
                </h3>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                        <strong>{oportunidad.ContactoNombre}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {oportunidad.ProductoInteres || 'Sin producto especificado'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {renderFormFields()}

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EtapaModal;
