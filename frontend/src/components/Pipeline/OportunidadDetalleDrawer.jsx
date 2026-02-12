import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';
import { ETAPAS } from '../../utils/etapas';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatOptional } from '../../utils/formatters';

const parseDateSafe = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const formatDateSafe = (value, fallback = 'Sin fecha') => {
    const parsed = parseDateSafe(value);
    if (!parsed) return fallback;
    return format(parsed, 'd MMM yyyy', { locale: es });
};

function OportunidadDetalleDrawer({ oportunidad, onClose, onEditContacto, onEditOportunidad, onRefresh }) {
    const [visitData, setVisitData] = useState({
        romperHielo: Boolean(oportunidad.RomperHielo),
        regaloVisitaEntregado: Boolean(oportunidad.RegaloVisitaEntregado),
        demoCompletada: Boolean(oportunidad.DemoCompletada),
    });
    const [showProgramaModal, setShowProgramaModal] = useState(false);
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [origenes, setOrigenes] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const mapEtapaToForm = (etapaValue) => {
        if (['CONTACTADO', 'INTENTO_CONTACTO'].includes(etapaValue)) return 'CONTACTO_INICIADO';
        return etapaValue || 'NUEVO_LEAD';
    };

    const mapEtapaToPayload = (etapaValue) => {
        if (etapaValue === 'CONTACTO_INICIADO') return 'CONTACTADO';
        return etapaValue;
    };

    const normalizeDateValue = (value) => {
        if (!value) return '';
        if (String(value).includes('T')) return String(value).split('T')[0];
        return value;
    };

    const reset = (data) => {
        setFormData({
            ...data,
            etapa: mapEtapaToForm(data.Etapa || data.etapa),
            estadoCierre: data.EstadoCierre || data.estadoCierre || 'Activo',
            origenId: data.OrigenID || data.origenId || '',
            source: data.source || 'OTRO',
            custom_source: data.source_name || '',
            assignedToUserId: data.assignedTo?._id || data.assignedTo || data.OwnerUserID || '',
            proximoContactoFecha: normalizeDateValue(data.ProximoContactoFecha || data.proximoContactoFecha),
        });
    };

    const [formData, setFormData] = useState(() => {
        const initial = {
            Etapa: oportunidad.Etapa,
            EstadoCierre: oportunidad.EstadoCierre,
            OrigenID: oportunidad.OrigenID,
            source: oportunidad.source,
            source_name: oportunidad.source_name,
            OwnerUserID: oportunidad.OwnerUserID,
            ProximoContactoFecha: oportunidad.ProximoContactoFecha,
        };
        return {
            ...initial,
            etapa: mapEtapaToForm(oportunidad.Etapa),
            estadoCierre: oportunidad.EstadoCierre || 'Activo',
            origenId: oportunidad.OrigenID || '',
            source: oportunidad.source || 'OTRO',
            custom_source: oportunidad.source_name || '',
            assignedToUserId: oportunidad.OwnerUserID || '',
            proximoContactoFecha: normalizeDateValue(oportunidad.ProximoContactoFecha),
        };
    });
    useEffect(() => {
        setVisitData({
            romperHielo: Boolean(oportunidad.RomperHielo),
            regaloVisitaEntregado: Boolean(oportunidad.RegaloVisitaEntregado),
            demoCompletada: Boolean(oportunidad.DemoCompletada),
        });
        reset(oportunidad);
    }, [oportunidad]);

    useEffect(() => {
        const loadCatalogs = async () => {
            try {
                const [origenesRes, asesoresRes] = await Promise.all([
                    api.get('/catalogos/origenes'),
                    api.get('/asesores')
                ]);
                setOrigenes(origenesRes.data || []);
                setAsesores(asesoresRes.data || []);
            } catch (error) {
                setOrigenes([]);
                setAsesores([]);
            }
        };
        loadCatalogs();
    }, []);
    const stageLabel = ETAPAS[oportunidad.Etapa]?.nombre || oportunidad.Etapa;
    const fields = useMemo(() => ([
        { label: 'Contacto', value: formatOptional(oportunidad.ContactoNombre, '-') },
        { label: 'Telefono', value: formatOptional(oportunidad.ContactoTelefono, '-') },
        { label: 'Email', value: formatOptional(oportunidad.ContactoEmail, '-') },
        { label: 'Producto', value: formatOptional(oportunidad.ProductoInteres, 'Sin definir') },
        { label: 'Etapa', value: formatOptional(stageLabel, '-') },
        { label: 'Estado cierre', value: formatOptional(oportunidad.EstadoCierre, 'Activo') },
        { label: 'Origen', value: formatOptional(oportunidad.source_name || oportunidad.source || oportunidad.OrigenNombre, '-') },
        { label: 'Owner', value: formatOptional(oportunidad.OwnerNombre, '-') },
        { label: 'Proximo contacto', value: formatDateSafe(oportunidad.ProximoContactoFecha, 'Sin fecha') },
    ]), [oportunidad, stageLabel]);

    const origenesDedup = useMemo(() => {
        const seen = new Set();
        const normalized = (origenes || [])
            .map((item) => ({
                id: item.id || item.OrigenID,
                nombre: (item.nombre || item.Nombre || '').trim()
            }))
            .filter((item) => item.nombre);

        const unique = [];
        normalized.forEach((item) => {
            const key = item.nombre.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            unique.push(item);
        });

        return unique.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [origenes]);

    const handleVisitToggle = async (field) => {
        const nextValue = !visitData[field];
        setVisitData((prev) => ({
            ...prev,
            [field]: nextValue,
        }));

        try {
            await api.patch(`/oportunidades/${oportunidad.OportunidadID}`, {
                [field]: nextValue ? 1 : 0,
            });
            onRefresh?.();
            toast.success('Guardado');
        } catch (error) {
            console.error('Error al actualizar visita:', error);
            toast.error('Error al guardar');
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSave = async () => {
        const normalizedSource = String(formData.source || '').trim();
        const normalizedCustomSource = String(formData.custom_source || '').trim();
        const resolvedSourceName = normalizedSource === 'OTRO' ? normalizedCustomSource : normalizedSource;
        try {
            await api.patch(`/oportunidades/${oportunidad.OportunidadID}`, {
                etapa: mapEtapaToPayload(formData.etapa),
                cierre_estado: formData.estadoCierre,
                origen_id: formData.origenId || null,
                source: normalizedSource || null,
                source_name: resolvedSourceName || null,
                owner_id: formData.assignedToUserId || null,
                assigned_to_user_id: formData.assignedToUserId || null,
                proximoContactoFecha: formData.proximoContactoFecha || null,
            });
            toast.success('Guardado');
            setIsEditing(false);
            onRefresh?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al guardar');
        }
    };

    const handleCreatePrograma = async (tipo) => {
        try {
            const ownerType = oportunidad.ContactoID ? 'contacto' : 'cliente';
            const ownerId = oportunidad.ContactoID || oportunidad.ClienteID;
            if (!ownerId) {
                toast.error('No hay owner disponible');
                return;
            }

            const response = await api.post('/programas', {
                tipo,
                opportunity_id: oportunidad.OportunidadID,
                owner_type: ownerType,
                owner_id: ownerId,
                asesor_id: oportunidad.OwnerUserID,
            });

            setShowProgramaModal(false);
            if (response.data?.ProgramaID) {
                navigate(`/programas/${response.data.ProgramaID}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo activar el programa');
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex">
                <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
                <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Detalle de oportunidad</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {isEditing ? 'Editando' : 'Vista'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
                            >
                                Editar
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        reset(oportunidad);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                                >
                                    Guardar
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!isEditing && fields.map((field) => (
                        <div key={field.label} className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</p>
                            <p className="text-sm font-semibold text-slate-700 break-words">{field.value}</p>
                        </div>
                    ))}

                    {isEditing && (
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa</label>
                                <select
                                    name="etapa"
                                    value={formData.etapa}
                                    onChange={handleChange}
                                    className="input-field bg-white mt-2 h-11 px-4"
                                >
                                    {Object.keys(ETAPAS).map((etapa) => (
                                        <option key={etapa} value={etapa}>
                                            {ETAPAS[etapa]?.nombre || etapa}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado cierre</label>
                                <select
                                    name="estadoCierre"
                                    value={formData.estadoCierre}
                                    onChange={handleChange}
                                    className="input-field bg-white mt-2 h-11 px-4"
                                >
                                    {['Activo', 'Seguimiento', 'No interesado'].map((estado) => (
                                        <option key={estado} value={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen</label>
                                <select
                                    name="source"
                                    value={formData.source || ''}
                                    onChange={handleChange}
                                    className="input-field bg-white mt-2 h-11 px-4"
                                >
                                    <option value="">Seleccionar</option>
                                    {origenesDedup.map((origen) => (
                                        <option key={origen.id || origen.nombre} value={origen.nombre}>{origen.nombre}</option>
                                    ))}
                                    <option value="OTRO">OTRO</option>
                                </select>
                            </div>
                            {String(formData.source || '').toUpperCase() === 'OTRO' && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen personalizado</label>
                                    <input
                                        type="text"
                                        name="custom_source"
                                        value={formData.custom_source || ''}
                                        onChange={handleChange}
                                        className="input-field mt-2 h-11 px-4"
                                        placeholder="Escribir origen"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</label>
                                <select
                                    name="assignedToUserId"
                                    value={formData.assignedToUserId}
                                    onChange={handleChange}
                                    className="input-field bg-white mt-2 h-11 px-4"
                                >
                                    <option value="">Sin asignar</option>
                                    {asesores.map((asesor) => (
                                        <option key={asesor.id} value={asesor.id}>{asesor.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proximo contacto</label>
                                <input
                                    type="date"
                                    name="proximoContactoFecha"
                                    value={formData.proximoContactoFecha || ''}
                                    onChange={handleChange}
                                    className="input-field mt-2 h-11 px-4"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Visita / Demostracion</p>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={visitData.romperHielo}
                                    onChange={() => handleVisitToggle('romperHielo')}
                                />
                                Romper hielo
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={visitData.regaloVisitaEntregado}
                                    onChange={() => handleVisitToggle('regaloVisitaEntregado')}
                                />
                                Entrega regalo por visita
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={visitData.demoCompletada}
                                    onChange={() => handleVisitToggle('demoCompletada')}
                                />
                                Demostracion completada
                            </label>
                        </div>

                        {oportunidad.Etapa === 'DEMO_REALIZADA' && (
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowProgramaModal(true)}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                                >
                                    Activar programa
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                    <div className="p-6 border-t border-slate-100 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onEditContacto}
                        className="flex-1 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs py-2 hover:bg-slate-50"
                    >
                        Editar contacto
                    </button>
                    <button
                        type="button"
                        onClick={onEditOportunidad}
                        className="flex-1 rounded-xl bg-indigo-600 text-white font-bold text-xs py-2 hover:bg-indigo-700"
                    >
                        Editar oportunidad
                    </button>
                    </div>
                </div>
            </div>
            {showProgramaModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40" onClick={() => setShowProgramaModal(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                        <h4 className="text-lg font-black text-slate-800">Activar programa</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Demostracion</p>
                        <div className="mt-5 space-y-2">
                            <button
                                type="button"
                                onClick={() => handleCreatePrograma('20_Y_GANA')}
                                className="w-full px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                            >
                                20 y Gana
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCreatePrograma('4_EN_14')}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                            >
                                4 en 14
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default OportunidadDetalleDrawer;
