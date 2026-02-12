import { useEffect, useState } from 'react';
import api from '../../services/api';
import { ETAPAS } from '../../utils/etapas';

const ESTADOS_CIERRE = ['Activo', 'Seguimiento', 'No interesado'];

function OportunidadEditModal({ oportunidad, onClose, onSave }) {
    const [owners, setOwners] = useState([]);
    const [origenes, setOrigenes] = useState([]);
    const normalizeDate = (value) => {
        if (!value) return '';
        if (typeof value === 'string' && value.includes('T')) {
            return value.split('T')[0];
        }
        return value;
    };

    const [formData, setFormData] = useState({
        etapa: oportunidad.Etapa || 'NUEVO_LEAD',
        owner_id: oportunidad.OwnerUserID || '',
        origen_id: oportunidad.OrigenID || '',
        cierre_estado: oportunidad.EstadoCierre || 'Activo',
        proximoContactoFecha: normalizeDate(oportunidad.ProximoContactoFecha),
        motivoNoInteresado: oportunidad.MotivoNoInteresado || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [origRes, ownerRes] = await Promise.all([
                    api.get('/catalogos/origenes'),
                    api.get('/oportunidades/owners'),
                ]);
                setOrigenes(origRes.data || []);
                setOwners(ownerRes.data || []);
            } catch (err) {
                console.error('Error cargando opciones de oportunidad:', err);
                setOrigenes([]);
                setOwners([]);
            }
        };
        loadOptions();
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        if (formData.cierre_estado === 'Seguimiento' && !formData.proximoContactoFecha) {
            setError('Proximo contacto es requerido para seguimiento');
            setLoading(false);
            return;
        }

        if (formData.cierre_estado === 'No interesado' && !formData.motivoNoInteresado) {
            // Motivo opcional
        }

        try {
            await onSave({
                etapa: formData.etapa,
                owner_id: formData.owner_id || null,
                origen_id: formData.origen_id || null,
                cierre_estado: formData.cierre_estado,
                proximoContactoFecha: formData.proximoContactoFecha || null,
                motivoNoInteresado: formData.motivoNoInteresado || null,
            });
        } catch (err) {
            setError(err?.response?.data?.error || 'No se pudo guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Editar oportunidad</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cambios explícitos</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Etapa</label>
                            <select
                                name="etapa"
                                value={formData.etapa}
                                onChange={handleChange}
                                className="input-field bg-white mt-2 h-11 px-4"
                            >
                                {Object.keys(ETAPAS).map((etapaKey) => (
                                    <option key={etapaKey} value={etapaKey}>
                                        {ETAPAS[etapaKey]?.nombre || etapaKey}
                                    </option>
                                ))}
                            </select>
                        </div>


                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Owner</label>
                            <select
                                name="owner_id"
                                value={formData.owner_id}
                                onChange={handleChange}
                                className="input-field bg-white mt-2 h-11 px-4"
                            >
                                <option value="">Sin asignar</option>
                                {owners.map((owner) => (
                                    <option key={owner.id || owner.UsuarioID} value={owner.id || owner.UsuarioID}>
                                        {owner.nombre || owner.Nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Origen</label>
                            <select
                                name="origen_id"
                                value={formData.origen_id}
                                onChange={handleChange}
                                className="input-field bg-white mt-2 h-11 px-4"
                            >
                                <option value="">Sin origen</option>
                                {origenes.map((origen) => (
                                    <option key={origen.id || origen.OrigenID} value={origen.id || origen.OrigenID}>
                                        {origen.nombre || origen.Nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Estado cierre</label>
                            <select
                                name="cierre_estado"
                                value={formData.cierre_estado}
                                onChange={handleChange}
                                className="input-field bg-white mt-2 h-11 px-4"
                            >
                                {ESTADOS_CIERRE.map((estado) => (
                                    <option key={estado} value={estado}>{estado}</option>
                                ))}
                            </select>
                        </div>

                        {formData.cierre_estado === 'Seguimiento' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Proximo contacto</label>
                                <input
                                    type="date"
                                    name="proximoContactoFecha"
                                    value={formData.proximoContactoFecha || ''}
                                    onChange={handleChange}
                                    className="input-field mt-2 h-11 px-4"
                                />
                            </div>
                        )}

                        {formData.cierre_estado === 'No interesado' && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo</label>
                                <input
                                    type="text"
                                    name="motivoNoInteresado"
                                    value={formData.motivoNoInteresado || ''}
                                    onChange={handleChange}
                                    className="input-field mt-2 h-11 px-4"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default OportunidadEditModal;
