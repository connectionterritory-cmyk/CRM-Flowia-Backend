import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import ContactSearchAutocomplete from '../common/ContactSearchAutocomplete.jsx';

const ORIGIN_LIST = [
    'Toque de Puerta',
    'Referido',
    'Familiares y Amigos',
    'Raspa y Gana',
    'Calendario de la suerte',
    'Feria',
    'Exhibidor',
    'Redes Sociales',
    'Clientes de Otro Distribuidor',
    'Otros'
];

const CreateOpportunityModal = ({ isOpen, onClose, onSuccess, initialTab = 'new', initialContact = null }) => {
    const [tab, setTab] = useState(initialTab);
    const [owners, setOwners] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [activeOpportunity, setActiveOpportunity] = useState(null);
    const [forceCreate, setForceCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        setValue,
        getValues,
        watch,
        reset,
        formState: { isSubmitting }
    } = useForm({
        defaultValues: {
            full_name: '',
            mobile_phone: '',
            email: '',
            address1: '',
            city: '',
            state: '',
            zip_code: '',
            source: '',
            assignedToUserId: '',
            referredById: '',
            referredByType: '',
            referredByName: '',
            notes: '',
            nextAction: '',
            nextActionAt: ''
        }
    });

    const [referredQuery, setReferredQuery] = useState('');
    const [referredResults, setReferredResults] = useState([]);
    const [referredLoading, setReferredLoading] = useState(false);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [duplicateContact, setDuplicateContact] = useState(null);

    const contactIncomplete = useMemo(() => {
        if (!selectedContact) return false;
        const email = selectedContact.email || selectedContact.Email;
        const address = selectedContact.address1 || selectedContact.Direccion;
        return !email || !address;
    }, [selectedContact]);

    useEffect(() => {
        if (!isOpen) return;
        api.get('/oportunidades/owners')
            .then((res) => setOwners(res.data || []))
            .catch(() => setOwners([]));
    }, [isOpen]);

    useEffect(() => {
        if (!selectedContact) return;
        const source = selectedContact.leadSource
            || selectedContact.origin_type
            || selectedContact.OrigenFuente
            || '';
        const assigned = selectedContact.ownerUserId
            || selectedContact.assigned_to_user_id
            || selectedContact.AssignedToUsuarioID
            || '';

        setValue('source', getValues('source') || source);
        setValue('assignedToUserId', getValues('assignedToUserId') || String(assigned));

        api.get(`/oportunidades/active-by-contact/${selectedContact.id || selectedContact.ContactoID}`)
            .then((res) => setActiveOpportunity(res.data || null))
            .catch(() => setActiveOpportunity(null));
    }, [selectedContact]);

    useEffect(() => {
        if (tab !== 'new') return;
        const phone = String(watch('mobile_phone') || '').trim();
        const email = String(watch('email') || '').trim();
        if (!phone && !email) {
            setDuplicateContact(null);
            return;
        }
        const timeout = setTimeout(async () => {
            try {
                const response = await api.get('/contacts/check-duplicate', { params: { phone, email } });
                setDuplicateContact(response.data?.duplicate || null);
            } catch (err) {
                setDuplicateContact(null);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [watch('mobile_phone'), watch('email'), tab]);

    useEffect(() => {
        if (!referredQuery || referredQuery.trim().length < 2) {
            setReferredResults([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setReferredLoading(true);
            try {
                const [contactsRes, clientsRes] = await Promise.all([
                    api.get('/contacts/search', { params: { q: referredQuery, limit: 5 } }),
                    api.get('/clientes', { params: { q: referredQuery } })
                ]);
                const contactItems = (contactsRes.data || []).map((item) => ({
                    id: item.id,
                    name: item.fullName,
                    type: 'CONTACTO'
                }));
                const clientItems = (clientsRes.data || []).map((item) => ({
                    id: item.ClienteID || item.id,
                    name: item.Nombre,
                    type: 'CLIENTE'
                }));
                setReferredResults([...contactItems, ...clientItems]);
            } catch (error) {
                setReferredResults([]);
            } finally {
                setReferredLoading(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [referredQuery]);

    const resetState = () => {
        setTab(initialTab);
        setSelectedContact(null);
        setActiveOpportunity(null);
        setForceCreate(false);
        setError('');
        setShowCompleteForm(false);
        setDuplicateContact(null);
        reset();
    };

    const handleClose = () => {
        resetState();
        onClose?.();
    };

    const sourceValue = String(watch('source') || '');
    const isReferido = sourceValue.toLowerCase().includes('referido');

    const handleSaveContactCompletion = async () => {
        if (!selectedContact) return;
        try {
            const payload = {
                email: getValues('email'),
                address1: getValues('address1'),
                city: getValues('city'),
                state: getValues('state'),
                zip_code: getValues('zip_code')
            };
            const response = await api.patch(`/contactos/${selectedContact.id || selectedContact.ContactoID}`, payload);
            setSelectedContact(response.data);
            setShowCompleteForm(false);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo completar el contacto');
        }
    };

    const handleSubmit = async () => {
        setError('');
        if (tab === 'existing' && !selectedContact) {
            setError('Selecciona un contacto');
            return;
        }
        if (tab === 'new' && (!String(getValues('full_name')).trim() || !String(getValues('mobile_phone')).trim())) {
            setError('Nombre y celular son obligatorios');
            return;
        }
        if (!getValues('assignedToUserId')) {
            setError('Asesor es obligatorio');
            return;
        }
        if (isReferido && !getValues('referredById')) {
            setError('Referido por es obligatorio');
            return;
        }
        if (activeOpportunity && !forceCreate) {
            setError('El contacto tiene una oportunidad activa');
            return;
        }

        setLoading(true);
        try {
            let contactId = selectedContact?.id || selectedContact?.ContactoID;
            if (tab === 'new') {
                const contactPayload = {
                    full_name: getValues('full_name'),
                    mobile_phone: getValues('mobile_phone'),
                    email: getValues('email'),
                    address1: getValues('address1'),
                    city: getValues('city'),
                    state: getValues('state'),
                    zip_code: getValues('zip_code'),
                    origin_type: getValues('source') || null
                };
                const response = await api.post('/contactos', contactPayload);
                contactId = response.data?.ContactoID || response.data?.id;
            }

            const payload = {
                contactId,
                source: getValues('source') || null,
                assignedToUserId: getValues('assignedToUserId'),
                referredById: getValues('referredById') || null,
                referredByType: getValues('referredByType') || null,
                notes: getValues('notes') || null,
                nextAction: getValues('nextAction') || null,
                nextActionAt: getValues('nextActionAt') || null,
                forceCreate: Boolean(forceCreate)
            };
            const result = await api.post('/oportunidades', payload);
            toast.success('Oportunidad creada');
            onSuccess?.(result.data);
            handleClose();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo crear la oportunidad');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        setTab(initialTab);
        if (initialContact) {
            setSelectedContact(initialContact);
            const source = initialContact.leadSource
                || initialContact.origin_type
                || initialContact.OrigenFuente
                || '';
            const assigned = initialContact.ownerUserId
                || initialContact.assigned_to_user_id
                || initialContact.AssignedToUsuarioID
                || '';
            setValue('email', initialContact.Email || initialContact.email || '');
            setValue('address1', initialContact.Direccion || initialContact.address1 || '');
            setValue('city', initialContact.Ciudad || initialContact.city || '');
            setValue('state', initialContact.Estado || initialContact.state || '');
            setValue('zip_code', initialContact.Zipcode || initialContact.zip_code || '');
            setValue('source', source);
            setValue('assignedToUserId', String(assigned));
        }
    }, [isOpen, initialTab, initialContact, setValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40" onClick={handleClose} />
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-800">Nueva oportunidad</h2>
                    <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTab('new')}
                        className={`px-4 py-2 rounded-md text-xs font-bold ${tab === 'new' ? 'bg-[#6366F1] text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                        Nuevo contacto
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('existing')}
                        className={`px-4 py-2 rounded-md text-xs font-bold ${tab === 'existing' ? 'bg-[#6366F1] text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                        Usar contacto existente
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-2">
                        {error}
                    </div>
                )}

                {tab === 'existing' && (
                    <div className="mt-6 space-y-4">
                        <ContactSearchAutocomplete
                            placeholder="Buscar contacto (nombre, celular, email)"
                            onSelect={(item) => {
                                setSelectedContact(item);
                                setValue('email', item.email || '');
                                setValue('address1', item.address1 || '');
                                setValue('city', item.city || '');
                                setValue('state', item.state || '');
                                setValue('zip_code', item.zip_code || '');
                            }}
                        />

                        {selectedContact && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                                        <User size={16} />
                                    </span>
                                    <div>
                                        <div className="font-semibold text-slate-700">{selectedContact.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {[selectedContact.phone, selectedContact.email, selectedContact.city].filter(Boolean).join(' • ') || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {contactIncomplete && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-sm px-4 py-2">
                                Datos incompletos. <button className="font-semibold" onClick={() => setShowCompleteForm(true)}>Completar ahora</button>
                            </div>
                        )}

                        {showCompleteForm && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input type="email" className="input-field h-11 px-4" placeholder="Email" {...register('email')} />
                                <input type="text" className="input-field h-11 px-4" placeholder="Direccion" {...register('address1')} />
                                <input type="text" className="input-field h-11 px-4" placeholder="Ciudad" {...register('city')} />
                                <input type="text" className="input-field h-11 px-4" placeholder="Estado" {...register('state')} />
                                <input type="text" className="input-field h-11 px-4" placeholder="Zip code" {...register('zip_code')} />
                                <button
                                    type="button"
                                    onClick={handleSaveContactCompletion}
                                    className="btn-secondary !py-2 !px-4"
                                >
                                    Guardar contacto
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'new' && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" className="input-field h-11 px-4" placeholder="Nombre completo" {...register('full_name')} />
                            <input type="text" className="input-field h-11 px-4" placeholder="Celular" {...register('mobile_phone')} />
                            <input type="email" className="input-field h-11 px-4" placeholder="Email" {...register('email')} />
                            <input type="text" className="input-field h-11 px-4" placeholder="Direccion" {...register('address1')} />
                            <input type="text" className="input-field h-11 px-4" placeholder="Ciudad" {...register('city')} />
                            <input type="text" className="input-field h-11 px-4" placeholder="Estado" {...register('state')} />
                            <input type="text" className="input-field h-11 px-4" placeholder="Zip code" {...register('zip_code')} />
                        </div>
                    )}

                {duplicateContact && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 text-sm px-4 py-2">
                        Ya existe un contacto con ese telefono o email.
                    </div>
                )}

                {activeOpportunity && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-2">
                        Ya hay una oportunidad activa para este contacto.
                        <div className="mt-2 flex items-center gap-2">
                            <input type="checkbox" checked={forceCreate} onChange={(event) => setForceCreate(event.target.checked)} />
                            <span className="text-xs">Crear de todas formas</span>
                        </div>
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Origen</label>
                        <input
                            type="text"
                            list="origin-list"
                            {...register('source')}
                            className="input-field h-11 px-4"
                            placeholder="Seleccionar origen"
                        />
                        <datalist id="origin-list">
                            {ORIGIN_LIST.map((origin) => (
                                <option key={origin} value={origin} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asesor</label>
                        <select
                            {...register('assignedToUserId')}
                            className="input-field h-11 px-4 bg-white"
                        >
                            <option value="">Seleccionar</option>
                            {owners.map((owner) => (
                                <option key={owner.id} value={owner.id}>{owner.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Referido por</label>
                        <div className="relative">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <Search size={16} className="text-slate-400" />
                                <input
                                    type="text"
                                    value={referredQuery}
                                    onChange={(event) => {
                                        setReferredQuery(event.target.value);
                                        setValue('referredById', '');
                                        setValue('referredByType', '');
                                        setValue('referredByName', '');
                                    }}
                                    placeholder="Buscar referido"
                                    className="w-full text-sm text-slate-700 outline-none bg-transparent"
                                />
                            </div>
                            {referredQuery && (
                                <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                                    {referredLoading && (
                                        <div className="px-4 py-2 text-xs text-slate-400">Buscando...</div>
                                    )}
                                    {!referredLoading && referredResults.map((item) => (
                                        <button
                                            key={`${item.type}-${item.id}`}
                                            type="button"
                                            onClick={() => {
                                                setValue('referredById', item.id);
                                                setValue('referredByType', item.type);
                                                setValue('referredByName', item.name);
                                                setReferredQuery(item.name);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                            <span className="text-[10px] uppercase text-slate-400 mr-2">{item.type}</span>
                                            {item.name}
                                        </button>
                                    ))}
                                    {!referredLoading && referredResults.length === 0 && (
                                        <div className="px-4 py-2 text-xs text-slate-400">Sin resultados</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="btn-secondary !py-2 !px-4" onClick={handleClose}>Cancelar</button>
                    <button type="button" className="!py-2 !px-4 rounded-xl bg-[#6366F1] text-white text-xs font-bold" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : 'Crear oportunidad'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateOpportunityModal;
