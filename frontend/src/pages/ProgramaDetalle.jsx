import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Star, Users, Trash2, User, Gift, Target, Calendar, Hash, Search, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = ['NUEVO', 'CONTACTADO', 'CITA', 'DEMO', 'VENTA', 'NO_INTERESA'];

const parseLines = (text) => {
    if (!text) return [];
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
};

const formatDate = (value) => {
    if (!value) return '-';
    return String(value).split('T')[0];
};

const normalizePhoneDigits = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits;
};

const extractOcrPairs = (text) => {
    const lines = String(text || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const pairs = [];
    let pendingName = '';

    const pushPair = (name, phone) => {
        const cleanName = String(name || '').replace(/^nombre\s*[:\-]?\s*/i, '').trim();
        const digits = normalizePhoneDigits(phone);
        if (!cleanName || digits.length < 10) return;
        pairs.push({ name: cleanName, phone: digits });
    };

    lines.forEach((line) => {
        const nameMatch = line.match(/^nombre\s*[:\-]?\s*(.+)$/i);
        const phoneMatch = line.match(/tel[eé]fono\s*[:\-]?\s*([+\d][\d\s().-]+)/i);

        if (nameMatch && phoneMatch) {
            pushPair(nameMatch[1], phoneMatch[1]);
            pendingName = '';
            return;
        }

        if (nameMatch) {
            pendingName = nameMatch[1].trim();
            return;
        }

        if (phoneMatch) {
            pushPair(pendingName, phoneMatch[1]);
            pendingName = '';
        }
    });

    return pairs;
};

const ProgramaDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [programa, setPrograma] = useState(null);
    const [referidos, setReferidos] = useState([]);
    const [metricas, setMetricas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [manual, setManual] = useState({ nombre: '', telefono: '' });
    const [referencias, setReferencias] = useState([]);
    const [whats, setWhats] = useState(null);
    const [leadModal, setLeadModal] = useState(null);
    const [refModal, setRefModal] = useState(null);
    const [refModalOtherTime, setRefModalOtherTime] = useState('');
    const [giftChoice, setGiftChoice] = useState('');
    const [giftChoiceOther, setGiftChoiceOther] = useState('');
    const [ocrFile, setOcrFile] = useState(null);
    const [ocrPreviewUrl, setOcrPreviewUrl] = useState('');
    const [ocrPreviewType, setOcrPreviewType] = useState('');
    const [ocrZoom, setOcrZoom] = useState(1);
    const [referenciaFiles, setReferenciaFiles] = useState([]);
    const [referenciasInputKey, setReferenciasInputKey] = useState(0);

    const loadPrograma = async () => {
        try {
            const response = await api.get(`/programas/${id}`);
            setPrograma(response.data.program);
            setReferidos(response.data.referrals || []);
            const metricsResponse = await api.get(`/programas/${id}/metricas`);
            setMetricas(metricsResponse.data);
            setGiftChoice(response.data.program?.RegaloElegido || '');
            setGiftChoiceOther(response.data.program?.RegaloElegidoOtro || '');
            try {
                const refsResponse = await api.get(`/programas/${id}/referencias`);
                setReferencias(refsResponse.data || []);
            } catch (err) {
                setReferencias([]);
            }
        } catch (error) {
            console.error('Error cargando programa:', error);
            toast.error('No se pudo cargar el programa');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPrograma();
    }, [id]);

    useEffect(() => {
        return () => {
            if (ocrPreviewUrl) {
                URL.revokeObjectURL(ocrPreviewUrl);
            }
        };
    }, [ocrPreviewUrl]);

    const handleOcrFileChange = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const file = files[0];
        if (ocrPreviewUrl) {
            URL.revokeObjectURL(ocrPreviewUrl);
        }
        const url = URL.createObjectURL(file);
        setOcrFile(file);
        setOcrPreviewUrl(url);
        setOcrPreviewType(file.type || '');
        setOcrZoom(1);
        setReferenciaFiles((prev) => [...prev, ...files]);
    };

    const handleReferenciaUpload = async () => {
        const selectedFiles = Array.isArray(referenciaFiles) ? referenciaFiles : [];
        if (selectedFiles.length === 0) {
            toast.error('Selecciona archivos para guardar');
            return;
        }
        try {
            const formData = new FormData();
            selectedFiles.forEach((file) => formData.append('files', file));
            const response = await api.post(`/programas/${id}/referencias`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setReferencias((prev) => [...response.data.items, ...prev]);
            setReferenciaFiles([]);
            setReferenciasInputKey((prev) => prev + 1);
            toast.success('Referencias guardadas');
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo subir');
        }
    };

    const handleReferenciaDelete = async (refId) => {
        const confirmed = window.confirm('Eliminar archivo de referencia?');
        if (!confirmed) return;
        try {
            await api.delete(`/programas/${id}/referencias/${refId}`);
            setReferencias((prev) => prev.filter((item) => item.ReferenciaID !== refId));
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo eliminar');
        }
    };

    const handleReferenciaOpen = async (refId, fileName) => {
        try {
            const response = await api.get(`/programas/${id}/referencias/${refId}/file`, {
                responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo abrir el archivo');
        }
    };

    const handleAddManual = async () => {
        try {
            await api.post(`/programas/${id}/referidos`, {
                full_name: manual.nombre,
                phone: manual.telefono,
            });
            setManual({ nombre: '', telefono: '' });
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo agregar');
        }
    };

    const handleStatusUpdate = async (refId, status) => {
        await api.patch(`/programas/${id}/referidos/${refId}`, { status });
        loadPrograma();
    };

    const handleDeleteReferido = async (refId) => {
        const confirmed = window.confirm('Eliminar referido? Esta accion no se puede deshacer.');
        if (!confirmed) return;
        try {
            await api.delete(`/programas/${id}/referidos/${refId}`);
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo eliminar');
        }
    };

    const handleCreateLead = (ref) => {
        setLeadModal({
            refId: ref.ReferidoID,
            nombre: ref.NombreCompleto || '',
            telefono: ref.Telefono || ''
        });
    };

    const handleOpenRefModal = (ref) => {
        setRefModal({
            refId: ref.ReferidoID,
            nombre: ref.NombreCompleto || '',
            telefono: ref.Telefono || '',
            nombrePareja: ref.NombrePareja || '',
            estadoCivil: ref.EstadoCivil || '',
            direccion: ref.Direccion || '',
            ciudad: ref.Ciudad || '',
            estado: ref.EstadoLugar || '',
            zipcode: ref.Zipcode || '',
            relacion: ref.Relacion || '',
            trabajaActualmente: ref.TrabajaActualmente || '',
            mejorHoraContacto: ref.MejorHoraContacto || '',
            propietarioCasa: ref.PropietarioCasa || '',
            conoceRoyalPrestige: ref.ConoceRoyalPrestige || '',
            prioridad: Boolean(ref.Prioridad),
            prioridadNota: ref.PrioridadNota || '',
            notas: ref.Notas || ''
        });
        setRefModalOtherTime('');
    };

    const handleSaveRefModal = async () => {
        try {
            const bestTime = refModal.mejorHoraContacto === 'OTRO'
                ? refModalOtherTime
                : refModal.mejorHoraContacto;
            await api.patch(`/programas/${id}/referidos/${refModal.refId}`, {
                spouse_name: refModal.nombrePareja,
                marital_status: refModal.estadoCivil,
                address1: refModal.direccion,
                city: refModal.ciudad,
                state: refModal.estado,
                zipcode: refModal.zipcode,
                relationship: refModal.relacion,
                both_work: refModal.trabajaActualmente,
                best_contact_time: bestTime,
                home_ownership: refModal.propietarioCasa,
                knows_royal_prestige: refModal.conoceRoyalPrestige,
                priority: refModal.prioridad,
                priority_note: refModal.prioridadNota,
                notes: refModal.notas
            });
            setRefModal(null);
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo guardar');
        }
    };

    const handleLeadSave = async () => {
        try {
            const response = await api.post('/contactos', {
                full_name: leadModal.nombre,
                mobile_phone: leadModal.telefono,
                city: 'NO_DICE',
                state: 'NO_DICE',
                country: 'USA',
                origin_type: 'REFERIDO',
                referred_by_type: 'NO_DICE',
                referred_by_id: 0,
                relationship_to_referrer: 'NO_DICE',
                contact_status: 'NUEVO',
                contact_allowed: 1
            });
            const contactId = response.data.id || response.data.ContactoID;
            if (contactId) {
                await api.patch(`/programas/${id}/referidos/${leadModal.refId}`, {
                    created_lead_id: String(contactId),
                });
            }
            setLeadModal(null);
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo crear lead');
        }
    };

    const handleWhatsappGenerate = async () => {
        try {
            const response = await api.post(`/programas/${id}/whatsapp/generar`, {});
            setWhats(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo generar');
        }
    };

    const handleWhatsappSent = async () => {
        try {
            await api.post(`/programas/${id}/whatsapp/marcar-enviado`);
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo actualizar');
        }
    };

    const handleGiftDelivered = async () => {
        try {
            await api.patch(`/programas/${id}`, { gift_delivered: true });
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo actualizar');
        }
    };

    const handleGiftSave = async () => {
        try {
            await api.patch(`/programas/${id}`, {
                gift_choice: giftChoice,
                gift_choice_other: giftChoice === 'OTRO' ? giftChoiceOther : ''
            });
            toast.success('Regalo actualizado');
            await loadPrograma();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo guardar regalo');
        }
    };

    const headerTitle = useMemo(() => {
        if (!programa) return 'Programa';
        if (programa.Tipo === '20_Y_GANA') return 'Programa 20 y Gana';
        if (programa.Tipo === '4_EN_14') return 'Programa 4 en 14';
        return 'Referido simple';
    }, [programa]);

    if (loading) return <div className="p-8 text-slate-500 font-bold">Cargando...</div>;
    if (!programa) return <div className="p-8 text-slate-500 font-bold">Programa no encontrado</div>;

    const referralsTotal = metricas?.referrals_total || referidos.length;
    const demosCount = metricas?.demos_count || 0;
    const remainingDays = metricas?.remaining_days;
    const giftDisabled = programa.Tipo === '20_Y_GANA'
        ? !(referralsTotal >= 20 && programa.WhatsappEnviado === 1)
        : !(demosCount >= 4 && !metricas?.expired);

    const giftOptions = [
        'Set de utensilios de cocina de 6 piezas con recipiente',
        'Juego de 4 tazones para mezclar con tapa',
        'Tabla de bambu para cortar',
        'Cuchillo Santoku de 5"',
        'Hervidor de 1/2 cuarto',
        'OTRO'
    ];

    return (
        <div className="workspace-container pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{headerTitle}</h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                        Estado: {programa.Estado}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <User size={16} className="text-slate-400" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Datos</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p>Dueño: {programa.OwnerNombre || '-'}</p>
                        <p>Asesor: {programa.AsesorNombre || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-4 mt-6">
                        <Calendar size={16} className="text-slate-400" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Fechas</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p>Inicio: {formatDate(programa.FechaInicio)}</p>
                        <p>Fin: {formatDate(programa.FechaFin)}</p>
                        {remainingDays !== null && (
                            <p>Dias restantes: {remainingDays}</p>
                        )}
                    </div>
                </div>
                <div className="card-premium p-6 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Target size={16} className="text-slate-400" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Progreso</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Referidos</p>
                            </div>
                            <p className="text-lg font-black text-slate-800 mt-2">
                                {referralsTotal}/{programa.Tipo === '20_Y_GANA' ? 20 : 10}
                            </p>
                        </div>
                        {programa.Tipo === '4_EN_14' && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center gap-2">
                                    <Hash size={14} className="text-slate-400" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Demos</p>
                                </div>
                                <p className="text-lg font-black text-slate-800 mt-2">{demosCount}/4</p>
                            </div>
                        )}
                    </div>
                    {programa.Tipo === '20_Y_GANA' && (
                        <p className="mt-3 text-xs font-bold text-slate-500">
                            {referralsTotal < 20 ? `Pendiente por completar (${20 - referralsTotal} faltan)` : 'Elegible para entrega inmediata'}
                        </p>
                    )}
                    {programa.Tipo === '4_EN_14' && metricas?.expired && (
                        <p className="mt-3 text-xs font-bold text-rose-500">Programa expirado</p>
                    )}
                </div>
            </div>

            {programa.Tipo === '4_EN_14' && (
                <div className="card-premium p-6 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Gift size={16} className="text-slate-400" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Regalo elegido</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <select
                                value={giftChoice}
                                onChange={(event) => setGiftChoice(event.target.value)}
                                className="input-field bg-slate-50 border-slate-200 shadow-sm h-11 px-4"
                            >
                                <option value="">Selecciona un regalo</option>
                                {giftOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        {giftChoice === 'OTRO' && (
                            <input
                                type="text"
                                value={giftChoiceOther}
                                onChange={(event) => setGiftChoiceOther(event.target.value)}
                                className="input-field bg-slate-50 border-slate-200 shadow-sm h-11 px-4"
                                placeholder="Describe el regalo"
                            />
                        )}
                        <div>
                            <button
                                type="button"
                                onClick={handleGiftSave}
                                className="btn-secondary !py-2 !px-4"
                            >
                                Guardar regalo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card-premium p-6 mt-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-indigo-500" />
                        <div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Referidos</h3>
                            <p className="text-xs text-slate-400">{referidos.length} en total</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agregar manual</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Nombre
                                <input
                                    type="text"
                                    value={manual.nombre}
                                    onChange={(event) => setManual((prev) => ({ ...prev, nombre: event.target.value }))}
                                    className="input-field mt-2 h-11 px-4 bg-slate-50 border-slate-200 shadow-sm text-slate-700 placeholder:text-slate-400"
                                    placeholder="Nombre completo"
                                />
                            </label>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Telefono
                                <input
                                    type="text"
                                    value={manual.telefono}
                                    onChange={(event) => setManual((prev) => ({ ...prev, telefono: event.target.value }))}
                                    className="input-field mt-2 h-11 px-4 bg-slate-50 border-slate-200 shadow-sm text-slate-700 placeholder:text-slate-400"
                                    placeholder="(000) 000-0000"
                                />
                            </label>
                        </div>
                        <button className="btn-primary !py-2 !px-4" onClick={handleAddManual}>Agregar manual</button>
                    </div>
                    <details className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                        <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-bold text-slate-600">
                            <span>Pegar lista (opcional)</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Importacion rapida</span>
                        </summary>
                        <div className="mt-3 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir imagen o PDF (Referencia)</label>
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    key={referenciasInputKey}
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    multiple
                                    onChange={handleOcrFileChange}
                                    className="text-sm text-slate-600"
                                />
                                {ocrFile?.name && <span className="text-xs text-slate-500">{ocrFile.name}</span>}
                                {referenciaFiles.length > 0 && (
                                    <span className="text-[11px] text-slate-400">{referenciaFiles.length} seleccionados</span>
                                )}
                                {referenciaFiles.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleReferenciaUpload}
                                        className="btn-secondary !py-2 !px-4"
                                    >
                                        Guardar archivos
                                    </button>
                                )}
                            </div>
                            {ocrPreviewUrl && (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                            <Search size={12} className="text-slate-400" />
                                            Zoom
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setOcrZoom((prev) => Math.max(0.75, Number((prev - 0.25).toFixed(2))))}
                                                className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                                            >
                                                -
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOcrZoom(1)}
                                                className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                                            >
                                                100%
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOcrZoom((prev) => Math.min(2.5, Number((prev + 0.25).toFixed(2))))}
                                                className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-auto rounded-lg border border-slate-100 bg-slate-50">
                                        {ocrPreviewType.includes('pdf') ? (
                                            <iframe
                                                title="preview"
                                                src={ocrPreviewUrl}
                                                className="w-full h-64 rounded-lg"
                                                style={{ transform: `scale(${ocrZoom})`, transformOrigin: 'top left' }}
                                            />
                                        ) : (
                                            <img
                                                src={ocrPreviewUrl}
                                                alt="Referencia"
                                                className="w-full h-64 object-contain"
                                                style={{ transform: `scale(${ocrZoom})`, transformOrigin: 'top left' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                            {referencias.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Referencias guardadas</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {referencias.map((ref) => {
                                            const isPdf = String(ref.FileType || '').includes('pdf');
                                            const fileUrl = `/data/programas-referencias/${ref.FilePath}`;
                                            return (
                                                <div key={ref.ReferenciaID} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                        {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold text-slate-700 truncate">{ref.FileName}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReferenciaOpen(ref.ReferenciaID, ref.FileName)}
                                                            className="text-[11px] text-indigo-500"
                                                        >
                                                            Ver archivo
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReferenciaDelete(ref.ReferenciaID)}
                                                        className="text-rose-500 hover:text-rose-700"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <p className="text-[11px] text-slate-400">Guarda el archivo para verlo luego y usa el formulario manual arriba.</p>
                        </div>
                    </details>
                </div>

                {referidos.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">Aun no hay referidos.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="text-left py-2">Nombre</th>
                                    <th className="text-left py-2">Telefono</th>
                                    <th className="text-left py-2">Estado</th>
                                    <th className="text-left py-2">Top 4</th>
                                    <th className="text-right py-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referidos.map((ref) => (
                                    <tr key={ref.ReferidoID} className="border-t border-slate-100 hover:bg-slate-50/60">
                                        <td className="py-3 font-semibold text-slate-700">{ref.NombreCompleto}</td>
                                        <td className="py-3 text-slate-500">{ref.Telefono || '-'}</td>
                                        <td className="py-3">
                                            <select
                                                className="input-workspace !h-9 !py-1"
                                                value={ref.Estado}
                                                onChange={(event) => handleStatusUpdate(ref.ReferidoID, event.target.value)}
                                            >
                                                {STATUS_OPTIONS.map((estado) => (
                                                    <option key={estado} value={estado}>{estado}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-3">
                                            {ref.Prioridad ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                    <Star size={12} /> Top 4
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateLead(ref)}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                            >
                                                Crear Lead
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenRefModal(ref)}
                                                className="text-xs font-bold text-slate-500 hover:text-slate-700 ml-3"
                                            >
                                                Detalle
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteReferido(ref.ReferidoID)}
                                                className="text-xs font-bold text-rose-500 hover:text-rose-700 ml-3 inline-flex items-center gap-1"
                                                title="Eliminar referido"
                                            >
                                                <Trash2 size={14} />
                                                Borrar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {programa.Tipo === '20_Y_GANA' && (
                <div className="card-premium p-6 mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageCircle size={18} className="text-emerald-600" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">WhatsApp</h3>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary !py-2 !px-4" onClick={handleWhatsappGenerate}>Generar mensaje</button>
                        {whats?.wa_link && (
                            <a
                                href={whats.wa_link}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-primary !py-2 !px-4"
                            >
                                Abrir WhatsApp
                            </a>
                        )}
                        <button className="btn-secondary !py-2 !px-4" onClick={handleWhatsappSent}>Marcar enviado</button>
                    </div>
                    {whats?.mensaje_plano && (
                        <textarea
                            readOnly
                            value={whats.mensaje_plano}
                            className="input-field resize-none mt-4 h-12 px-4"
                            rows="3"
                        />
                    )}
                </div>
            )}

            {(programa.Tipo === '20_Y_GANA' || programa.Tipo === '4_EN_14') && (
                <div className="mt-8 flex justify-end">
                    <button
                        className="btn-primary !py-2 !px-6"
                        onClick={handleGiftDelivered}
                        disabled={giftDisabled}
                    >
                        Marcar regalo entregado
                    </button>
                </div>
            )}
            {leadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40" onClick={() => setLeadModal(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                        <h4 className="text-lg font-black text-slate-800">Crear Lead</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Prefill</p>
                        <div className="mt-4 space-y-3">
                            <input
                                type="text"
                                value={leadModal.nombre}
                                onChange={(event) => setLeadModal((prev) => ({ ...prev, nombre: event.target.value }))}
                                className="input-field h-11 px-4"
                                placeholder="Nombre"
                            />
                            <input
                                type="text"
                                value={leadModal.telefono}
                                onChange={(event) => setLeadModal((prev) => ({ ...prev, telefono: event.target.value }))}
                                className="input-field h-11 px-4"
                                placeholder="Telefono"
                            />
                            <div className="flex justify-end gap-2">
                                <button className="px-4 py-2 text-xs font-bold text-slate-500" onClick={() => setLeadModal(null)}>Cancelar</button>
                                <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold" onClick={handleLeadSave}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {refModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40" onClick={() => setRefModal(null)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-lg font-black text-slate-800">Detalle del referido</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Calificacion completa</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold ring-1 ${refModal.prioridad
                                    ? 'bg-amber-100 text-amber-700 ring-amber-200/60'
                                    : 'bg-slate-100 text-slate-500 ring-slate-200/60'
                                }`}>
                                    <Star size={12} /> {refModal.prioridad ? 'Top 4' : 'No prioritario'}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60">
                                    Estado: {refModal.estadoCivil || 'Sin definir'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Datos personales</p>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</label>
                                <input
                                    type="text"
                                    value={refModal.nombre}
                                    onChange={(event) => setRefModal((prev) => ({ ...prev, nombre: event.target.value }))}
                                    className="input-field h-11 px-4"
                                    placeholder="Nombre"
                                    disabled
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefono</label>
                                <input
                                    type="text"
                                    value={refModal.telefono}
                                    onChange={(event) => setRefModal((prev) => ({ ...prev, telefono: event.target.value }))}
                                    className="input-field h-11 px-4"
                                    placeholder="Telefono"
                                    disabled
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado civil</label>
                                <select
                                    value={refModal.estadoCivil}
                                    onChange={(event) => setRefModal((prev) => ({ ...prev, estadoCivil: event.target.value }))}
                                    className="input-field bg-white h-11 px-4"
                                >
                                    <option value="">Estado civil</option>
                                    <option value="SOLTERO">Soltero</option>
                                    <option value="CASADO">Casado</option>
                                    <option value="UNION_LIBRE">Union libre</option>
                                    <option value="DIVORCIADO">Divorciado</option>
                                    <option value="VIUDO">Viudo</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relacion con el cliente</label>
                                <input
                                    type="text"
                                    value={refModal.relacion}
                                    onChange={(event) => setRefModal((prev) => ({ ...prev, relacion: event.target.value }))}
                                    className="input-field h-11 px-4"
                                    placeholder="Relacion con el cliente"
                                />
                            </div>
                            {(refModal.estadoCivil === 'CASADO' || refModal.estadoCivil === 'UNION_LIBRE') && (
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la pareja</label>
                                    <input
                                        type="text"
                                        value={refModal.nombrePareja}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, nombrePareja: event.target.value }))}
                                        className="input-field h-11 px-4"
                                        placeholder="Nombre de la pareja"
                                    />
                                </div>
                            )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Direccion</p>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direccion</label>
                                    <input
                                        type="text"
                                        value={refModal.direccion}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, direccion: event.target.value }))}
                                        className="input-field h-11 px-4"
                                        placeholder="Direccion"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciudad</label>
                                    <input
                                        type="text"
                                        value={refModal.ciudad}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, ciudad: event.target.value }))}
                                        className="input-field h-11 px-4"
                                        placeholder="Ciudad"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                                    <input
                                        type="text"
                                        value={refModal.estado}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, estado: event.target.value }))}
                                        className="input-field h-11 px-4"
                                        placeholder="Estado"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zip code</label>
                                    <input
                                        type="text"
                                        value={refModal.zipcode}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, zipcode: event.target.value }))}
                                        className="input-field h-11 px-4"
                                        placeholder="Zip code"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Calificacion</p>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mejor hora</label>
                                    <select
                                        value={refModal.mejorHoraContacto}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setRefModal((prev) => ({ ...prev, mejorHoraContacto: value }));
                                            if (value !== 'OTRO') {
                                                setRefModalOtherTime('');
                                            }
                                        }}
                                        className="input-field bg-white h-11 px-4"
                                    >
                                        <option value="">Mejor hora de contacto</option>
                                        <option value="MANANA">Manana</option>
                                        <option value="TARDE">Tarde</option>
                                        <option value="NOCHE">Noche</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                {refModal.mejorHoraContacto === 'OTRO' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Otra hora</label>
                                        <input
                                            type="text"
                                            value={refModalOtherTime}
                                            onChange={(event) => setRefModalOtherTime(event.target.value)}
                                            className="input-field h-11 px-4"
                                            placeholder="Escribe la mejor hora"
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabajan</label>
                                    <select
                                        value={refModal.trabajaActualmente}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, trabajaActualmente: event.target.value }))}
                                        className="input-field bg-white h-11 px-4"
                                    >
                                        <option value="">Trabajan</option>
                                        <option value="TRABAJA_1">Trabaja uno</option>
                                        <option value="TRABAJAN_2">Trabajan ambos</option>
                                        <option value="NO_DICE">No dice</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propietario</label>
                                    <select
                                        value={refModal.propietarioCasa}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, propietarioCasa: event.target.value }))}
                                        className="input-field bg-white h-11 px-4"
                                    >
                                        <option value="">Propietario de casa</option>
                                        <option value="DUEÑO">Dueno</option>
                                        <option value="RENTA">Renta</option>
                                        <option value="NO_DICE">No dice</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conoce RP</label>
                                    <select
                                        value={refModal.conoceRoyalPrestige}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, conoceRoyalPrestige: event.target.value }))}
                                        className="input-field bg-white h-11 px-4"
                                    >
                                        <option value="">Conoce Royal Prestige</option>
                                        <option value="SI">Si</option>
                                        <option value="NO">No</option>
                                        <option value="HA_ESCUCHADO">Ha escuchado</option>
                                        <option value="NO_DICE">No dice</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Prioridad y notas</p>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 4</label>
                                    <div className="flex items-center gap-2 h-11">
                                        <input
                                            type="checkbox"
                                            checked={refModal.prioridad}
                                            onChange={(event) => setRefModal((prev) => ({ ...prev, prioridad: event.target.checked }))}
                                        />
                                        <span className="text-sm text-slate-600">Marcar top 4</span>
                                    </div>
                                </div>
                                {refModal.prioridad && (
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota de prioridad</label>
                                        <textarea
                                            value={refModal.prioridadNota}
                                            onChange={(event) => setRefModal((prev) => ({ ...prev, prioridadNota: event.target.value }))}
                                            className="input-field resize-none h-20 px-4"
                                            placeholder="Notas del por que es top 4"
                                        />
                                    </div>
                                )}
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</label>
                                    <textarea
                                        value={refModal.notas}
                                        onChange={(event) => setRefModal((prev) => ({ ...prev, notas: event.target.value }))}
                                        className="input-field resize-none h-20 px-4"
                                        placeholder="Notas adicionales"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button className="px-4 py-2 text-xs font-bold text-slate-500" onClick={() => setRefModal(null)}>Cancelar</button>
                            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold" onClick={handleSaveRefModal}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgramaDetalle;
