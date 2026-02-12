import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Pencil, UserPlus, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import ContactoForm from '../components/Contactos/ContactoForm';
import { formatOptional, normalizeNoDice } from '../utils/formatters';
import ReferralSimpleModal from '../components/Referrals/ReferralSimpleModal';
import CreateOpportunityModal from '../components/modals/CreateOpportunityModal.jsx';

const parseMetaNotes = (notes = '') => {
    const meta = {};
    const cleanLines = [];
    notes.split('\n').forEach((line) => {
        const match = line.match(/^\[fs:(?<key>[a-z_]+)\](?<value>.*)$/);
        if (match?.groups?.key) {
            meta[match.groups.key] = match.groups.value.trim();
        } else if (line.trim()) {
            cleanLines.push(line);
        }
    });
    return {
        meta,
        cleanNotes: cleanLines.join('\n').trim()
    };
};

const toFormData = (data) => {
    const { meta, cleanNotes } = parseMetaNotes(data.notes || '');
    return {
        full_name: data.full_name || data.NombreCompleto || '',
        mobile_phone: data.mobile_phone || data.Telefono || '',
        assigned_to_user_id: data.assigned_to_user_id || data.AssignedToUsuarioID || '',
        email: data.email || data.Email || '',
        address1: data.address1 || data.Direccion || '',
        address2: data.address2 || '',
        city: data.city || data.Ciudad || '',
        state: data.state || data.Estado || '',
        zip_code: data.zip_code || data.Zipcode || '',
        country: data.country || data.Pais || 'USA',
        origin_type: data.origin_type || data.OrigenFuente || 'NO_DICE',
        origin_custom: meta.origin_custom || '',
        referred_by_type: meta.referred_by_type || data.referred_by_type || (data.ReferidoPorId ? 'CONTACTO' : 'NO_DICE'),
        referred_by_name: meta.referred_by_name || data.referred_by_name || data.ReferidoPorNombre || '',
        referred_by_id: data.referred_by_id || data.ReferidoPorId || '',
        relationship_type: meta.relationship_type || data.relationship_to_referrer || 'NO_DICE',
        relationship_other: meta.relationship_other || '',
        marital_status: data.marital_status || data.EstadoCivil || 'NO_DICE',
        marital_status_other: meta.marital_status_other || '',
        home_ownership: data.home_ownership || 'NO_DICE',
        both_work: data.both_work || data.TrabajaActualmente || 'NO_DICE',
        has_children: Boolean(data.has_children),
        children_count: data.children_count || '',
        knows_royal_prestige: data.knows_royal_prestige || 'NO_DICE',
        contact_status: data.contact_status || 'NUEVO',
        contact_allowed: data.contact_allowed !== undefined ? Boolean(data.contact_allowed) : true,
        notes: cleanNotes
    };
};

const ContactoDetallePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [contacto, setContacto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === '1');
    const [showOpportunityModal, setShowOpportunityModal] = useState(false);
    const [editingQualification, setEditingQualification] = useState(false);
    const [qualificationForm, setQualificationForm] = useState({
        mejorHoraContacto: '',
        trabajaActualmente: '',
        propietarioCasa: '',
        conoceRoyalPrestige: ''
    });

    const fetchContacto = async () => {
        try {
            const response = await api.get(`/contactos/${id}`);
            setContacto(response.data);
        } catch (err) {
            console.error('Error cargando contacto:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacto();
    }, [id]);

    const displayName = contacto?.full_name || contacto?.NombreCompleto || '-';
    const displayPhone = formatOptional(contacto?.mobile_phone || contacto?.Telefono, '-');
    const displayEmail = formatOptional(contacto?.email || contacto?.Email, '-');
    const displayCity = formatOptional(contacto?.city || contacto?.Ciudad, '');
    const displayState = formatOptional(contacto?.state || contacto?.Estado, '');
    const displayOrigin = normalizeNoDice(contacto?.origin_type || contacto?.OrigenFuente) || 'no_dice';
    const displayStatus = contacto?.contact_status || 'unknown';
    const displayAssigned = contacto?.AssignedToNombre || '-';
    const displayMarital = normalizeNoDice(contacto?.marital_status || contacto?.EstadoCivil) || '-';
    const { cleanNotes: displayNotes } = useMemo(() => parseMetaNotes(contacto?.notes || ''), [contacto]);
    const addressLine = [
        normalizeNoDice(contacto?.address1 || contacto?.Direccion),
        normalizeNoDice(contacto?.address2)
    ]
        .filter(Boolean)
        .join(' ');

    const locationLine = useMemo(() => {
        const zip = normalizeNoDice(contacto?.zip_code || contacto?.Zipcode || '');
        const country = normalizeNoDice(contacto?.country || contacto?.Pais || '');
        return [displayCity, displayState, zip, country].filter(Boolean).join(', ');
    }, [contacto, displayCity, displayState]);

    const statusLabelMap = {
        NUEVO: 'Nuevo',
        CONTACTADO: 'Contactado',
        CALIFICADO: 'Calificado',
        CITA_AGENDADA: 'Cita agendada',
        NO_MOLESTAR: 'No molestar',
        NO_INTERESA: 'No interesa'
    };

    const statusStyles = {
        NUEVO: 'bg-sky-100 text-sky-700 ring-sky-200/60',
        CONTACTADO: 'bg-amber-100 text-amber-700 ring-amber-200/60',
        CALIFICADO: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60',
        CITA_AGENDADA: 'bg-teal-100 text-teal-700 ring-teal-200/60',
        NO_MOLESTAR: 'bg-rose-100 text-rose-700 ring-rose-200/60',
        NO_INTERESA: 'bg-slate-200 text-slate-700 ring-slate-300/60'
    };

    const handleQualificationSave = async () => {
        try {
            await api.patch(`/contactos/${id}`, {
                best_contact_time: qualificationForm.mejorHoraContacto,
                both_work: qualificationForm.trabajaActualmente,
                home_ownership: qualificationForm.propietarioCasa,
                knows_royal_prestige: qualificationForm.conoceRoyalPrestige
            });
            await fetchContacto();
            setEditingQualification(false);
        } catch (err) {
            setError(err.response?.data?.error || t('common.error'));
        }
    };

    useEffect(() => {
        if (!contacto) return;
        setQualificationForm({
            mejorHoraContacto: contacto?.MejorHoraContacto || '',
            trabajaActualmente: contacto?.TrabajaActualmente || '',
            propietarioCasa: contacto?.home_ownership || contacto?.PropietarioCasa || '',
            conoceRoyalPrestige: contacto?.knows_royal_prestige || contacto?.ConoceRoyalPrestige || ''
        });
    }, [contacto]);

    const handleSave = async (payload) => {
        setSaving(true);
        setError('');
        try {
            await api.put(`/contactos/${id}`, payload);
            await fetchContacto();
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.error || t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">{t('common.loading')}</div>;
    if (!contacto) return <div className="p-8 text-center">Cargando información...</div>;

    return (
        <div className="workspace-container pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    aria-label={t('buttons.back')}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tighter truncate">
                            {isEditing ? t('contacts.editTitle') : displayName}
                        </h1>
                        {!isEditing && (
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[displayStatus] || 'bg-slate-100 text-slate-600 ring-slate-200/60'}`}>
                                <span className="h-2 w-2 rounded-full bg-current"></span>
                                {statusLabelMap[displayStatus] || 'Sin estado'}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                        {isEditing ? displayName : t('contacts.detailTitle')}
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setShowOpportunityModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold"
                        >
                            + Crear oportunidad
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowReferralModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-emerald-600"
                    >
                        <UserPlus size={14} /> {t('buttons.addReferral')}
                    </button>
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-indigo-600"
                        >
                            <Pencil size={14} /> {t('buttons.edit')}
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div>}

            {!isEditing && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card-premium p-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Datos personales</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefono</p>
                                <p className={`text-sm font-semibold ${displayPhone === '-' ? 'text-slate-300' : 'text-slate-700'}`}>{displayPhone}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                                <p className={`text-sm font-semibold ${displayEmail === '-' ? 'text-slate-300' : 'text-slate-700'}`}>{displayEmail}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado civil</p>
                                <p className={`text-sm font-semibold ${displayMarital === '-' ? 'text-slate-300' : 'text-slate-700'}`}>{displayMarital}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ubicacion</p>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-rose-400 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-slate-700">{addressLine || '-'}</p>
                                    <p className="text-xs text-slate-400">{locationLine || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Origen y asignacion</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Compass size={14} className="text-indigo-400" />
                                <span className="font-semibold text-slate-700">{normalizeNoDice(displayOrigin) || '-'}</span>
                            </div>
                            {contacto?.referred_by_type && contacto?.referred_by_id && (
                                <div className="text-xs text-slate-500">
                                    Referido por:{' '}
                                    {contacto.referred_by_type === 'CONTACTO' ? (
                                        <button
                                            onClick={() => navigate(`/contactos/${contacto.referred_by_id}`)}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            {contacto.ReferidoPorNombre || 'Ver contacto'}
                                        </button>
                                    ) : contacto.referred_by_type === 'CLIENTE' ? (
                                        <button
                                            onClick={() => navigate(`/clientes/${contacto.referred_by_id}`)}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            {contacto.ReferidoPorNombre || 'Ver cliente'}
                                        </button>
                                    ) : (
                                        <span>{contacto.ReferidoPorNombre || '-'}</span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                                    {(displayAssigned || '-').slice(0, 2).toUpperCase()}
                                </span>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignado a</p>
                                    <p className="text-sm font-semibold text-slate-700">{displayAssigned}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6 lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calificacion</p>
                            {!editingQualification ? (
                                <button
                                    type="button"
                                    onClick={() => setEditingQualification(true)}
                                    className="text-xs font-bold text-indigo-600"
                                >
                                    Editar rapido
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingQualification(false)}
                                        className="text-xs font-bold text-slate-500"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleQualificationSave}
                                        className="text-xs font-bold text-indigo-600"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mejor hora</p>
                                {editingQualification ? (
                                    <select
                                        value={qualificationForm.mejorHoraContacto}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, mejorHoraContacto: event.target.value }))}
                                        className="input-field h-10 px-3 bg-white"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="MANANA">Manana</option>
                                        <option value="TARDE">Tarde</option>
                                        <option value="NOCHE">Noche</option>
                                    </select>
                                ) : (
                                    <p className="text-sm font-semibold text-slate-700">{formatOptional(qualificationForm.mejorHoraContacto, '-')}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabajan</p>
                                {editingQualification ? (
                                    <select
                                        value={qualificationForm.trabajaActualmente}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, trabajaActualmente: event.target.value }))}
                                        className="input-field h-10 px-3 bg-white"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="TRABAJA_1">Trabaja uno</option>
                                        <option value="TRABAJAN_2">Trabajan ambos</option>
                                        <option value="NO_DICE">No dice</option>
                                    </select>
                                ) : (
                                    <p className="text-sm font-semibold text-slate-700">{formatOptional(qualificationForm.trabajaActualmente, '-')}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propietario</p>
                                {editingQualification ? (
                                    <select
                                        value={qualificationForm.propietarioCasa}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, propietarioCasa: event.target.value }))}
                                        className="input-field h-10 px-3 bg-white"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="DUEÑO">Dueno</option>
                                        <option value="RENTA">Renta</option>
                                        <option value="NO_DICE">No dice</option>
                                    </select>
                                ) : (
                                    <p className="text-sm font-semibold text-slate-700">{formatOptional(qualificationForm.propietarioCasa, '-')}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conoce RP</p>
                                {editingQualification ? (
                                    <select
                                        value={qualificationForm.conoceRoyalPrestige}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, conoceRoyalPrestige: event.target.value }))}
                                        className="input-field h-10 px-3 bg-white"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="SI">Si</option>
                                        <option value="NO">No</option>
                                        <option value="HA_ESCUCHADO">Ha escuchado</option>
                                        <option value="NO_DICE">No dice</option>
                                    </select>
                                ) : (
                                    <p className="text-sm font-semibold text-slate-700">{formatOptional(qualificationForm.conoceRoyalPrestige, '-')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Notas</p>
                        <p className="text-sm text-slate-500 mt-2">{displayNotes || '-'}</p>
                    </div>
                </div>
            )}

            {isEditing && (
                <ContactoForm
                    initialData={toFormData(contacto)}
                    onSubmit={handleSave}
                    onCancel={() => setIsEditing(false)}
                    loading={saving}
                />
            )}

            {showReferralModal && (
                <ReferralSimpleModal
                    ownerPersonId={contacto.ContactoID}
                    ownerPersonType="CONTACTO"
                    onClose={() => setShowReferralModal(false)}
                    onSuccess={() => {}}
                />
            )}

            <CreateOpportunityModal
                isOpen={showOpportunityModal}
                onClose={() => setShowOpportunityModal(false)}
                onSuccess={() => setShowOpportunityModal(false)}
                initialTab="existing"
                initialContact={contacto}
            />
        </div>
    );
};

export default ContactoDetallePage;
