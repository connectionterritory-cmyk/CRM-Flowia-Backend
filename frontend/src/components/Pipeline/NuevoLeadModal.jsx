import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { normalizeNoDice } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth.jsx';

const REQUIRED_CONTACT_FIELDS = [];
const STATUS_OPTIONS = [
    { value: 'NUEVO', label: 'Nuevo' },
    { value: 'CONTACTADO', label: 'Contactado' },
    { value: 'CALIFICADO', label: 'Calificado' },
    { value: 'CITA_AGENDADA', label: 'Cita agendada' },
    { value: 'NO_MOLESTAR', label: 'No molestar' },
    { value: 'NO_INTERESA', label: 'No interesa' }
];
const MARITAL_OPTIONS = [
    { value: 'SOLTERO', label: 'Soltero' },
    { value: 'CASADO', label: 'Casado' },
    { value: 'UNION_LIBRE', label: 'Union libre' },
    { value: 'DIVORCIADO', label: 'Divorciado' },
    { value: 'VIUDO', label: 'Viudo' },
    { value: 'NO_DICE', label: 'No dice' }
];
const HOME_OWNERSHIP_OPTIONS = [
    { value: 'DUEÑO', label: 'Dueno' },
    { value: 'RENTA', label: 'Renta' },
    { value: 'NO_DICE', label: 'No dice' }
];
const BOTH_WORK_OPTIONS = [
    { value: 'TRABAJA_1', label: 'Trabaja uno' },
    { value: 'TRABAJAN_2', label: 'Trabajan ambos' },
    { value: 'NO_DICE', label: 'No dice' }
];
const KNOWS_RP_OPTIONS = [
    { value: 'SI', label: 'Si' },
    { value: 'NO', label: 'No' },
    { value: 'HA_ESCUCHADO', label: 'Ha escuchado' }
];

const normalizePhone = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return digits ? `+${digits}` : '';
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const mapOriginTypeToLabel = (value) => {
    const upper = String(value || '').toUpperCase();
    const mapping = {
        TOQUE_DE_PUERTA: 'Toque de Puerta',
        TOQUE_PUERTA: 'Toque de Puerta',
        REFERIDO: 'Referido',
        FAMILIARES_Y_AMIGOS: 'Familiares y Amigos',
        RASPA_Y_GANA: 'Raspa y Gana',
        CALENDARIO_DE_LA_SUERTE: 'Calendario de la suerte',
        FERIA: 'Feria',
        EXHIBIDOR: 'Exhibidor',
        REDES_SOCIALES: 'Redes Sociales',
        CLIENTES_DE_OTRO_DISTRIBUIDOR: 'Clientes de Otro Distribuidor',
        OTROS: 'Otros',
        NO_DICE: ''
    };
    return mapping[upper] || value || '';
};

const mapSourceToOriginType = (value) => {
    const source = String(value || '').toLowerCase();
    if (!source) return 'NO_DICE';
    if (source.includes('toque') || source.includes('puerta')) return 'Toque de Puerta';
    if (source.includes('referido')) return 'Referido';
    if (source.includes('familia') || source.includes('amigo')) return 'Familiares y Amigos';
    if (source.includes('raspa')) return 'Raspa y Gana';
    if (source.includes('calendario')) return 'Calendario de la suerte';
    if (source.includes('feria')) return 'Feria';
    if (source.includes('exhibidor')) return 'Exhibidor';
    if (source.includes('redes')) return 'Redes Sociales';
    if (source.includes('distribuidor')) return 'Clientes de Otro Distribuidor';
    if (source.includes('otro')) return 'Otros';
    return value || 'Otros';
};

const isReferidoSource = (value) => String(value || '').toLowerCase().includes('referido');

function NuevoLeadModal({ isOpen, onClose, onSuccess, initialStage = 'NUEVO_LEAD', onOpenOpportunity }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const currentUserId = user?.UsuarioID || user?.id || null;

    const [mode, setMode] = useState('new');
    const [contactSearch, setContactSearch] = useState('');
    const [contactResults, setContactResults] = useState([]);
    const [contactLoading, setContactLoading] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [missingFields, setMissingFields] = useState([]);
    const [showMissingForm, setShowMissingForm] = useState(false);
    const [missingForm, setMissingForm] = useState({
        email: '',
        address1: '',
        city: '',
        state: '',
        zip: ''
    });
    const [duplicateContact, setDuplicateContact] = useState(null);
    const [activeOpportunity, setActiveOpportunity] = useState(null);
    const [forceCreate, setForceCreate] = useState(false);
    const [successData, setSuccessData] = useState(null);

    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [addressLoading, setAddressLoading] = useState(false);

    const [referredSearch, setReferredSearch] = useState('');
    const [referredResults, setReferredResults] = useState([]);
    const [referredLoading, setReferredLoading] = useState(false);
    const [referredSelection, setReferredSelection] = useState(null);

    const [qualificationForm, setQualificationForm] = useState({
        contact_status: 'NUEVO',
        marital_status: 'NO_DICE',
        home_ownership: 'NO_DICE',
        both_work: 'NO_DICE',
        knows_royal_prestige: '',
        has_children: false,
        children_count: '',
        spouse_name: '',
        notes: ''
    });
    const [qualificationLoading, setQualificationLoading] = useState(false);
    const [qualificationError, setQualificationError] = useState('');
    const [qualificationSuccess, setQualificationSuccess] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        country: 'Estados Unidos'
    });

    const [opportunityForm, setOpportunityForm] = useState({
        source: '',
        productInterest: '',
        assignedToUserId: '',
        notes: '',
        referredById: null,
        referredByType: null,
        nextAction: '',
        nextActionAt: ''
    });

    const [stage, setStage] = useState(initialStage);
    const [origenes, setOrigenes] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const normalizeCountryLabel = (value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return '';
        if (normalized.toLowerCase() === 'united states' || normalized.toLowerCase() === 'usa') return 'Estados Unidos';
        return normalized;
    };

    const buildAddressDisplay = (item) => {
        const details = item?.address || {};
        const addressLine = item?.display_name || '';
        const city = details.city || details.town || details.village || details.hamlet || '';
        const state = details.state || details.region || details.state_district || '';
        const zip = details.postcode || '';
        return {
            label: addressLine,
            address1: details.road
                ? `${details.road}${details.house_number ? ` ${details.house_number}` : ''}`
                : addressLine.split(',')[0]?.trim() || addressLine,
            city,
            state: details.state_code || state,
            zip,
            country: normalizeCountryLabel(details.country || '')
        };
    };

    const missingFieldLabels = useMemo(() => ({
        email: 'Email',
        address1: 'Dirección',
        city: 'Ciudad',
        state: 'Estado/Provincia',
        zip: 'ZIP'
    }), []);

    const missingFieldList = missingFields.map((field) => missingFieldLabels[field]).join(', ');

    useEffect(() => {
        if (!isOpen) return;
        setStage(initialStage || 'NUEVO_LEAD');
        setMode('new');
        setSelectedContact(null);
        setContactSearch('');
        setContactResults([]);
        setMissingFields([]);
        setShowMissingForm(false);
        setMissingForm({ email: '', address1: '', city: '', state: '', zip: '' });
        setDuplicateContact(null);
        setActiveOpportunity(null);
        setForceCreate(false);
        setSuccessData(null);
        setAddressSuggestions([]);
        setReferredSelection(null);
        setError('');
        setQualificationError('');
        setQualificationSuccess('');
        setQualificationForm({
            contact_status: 'NUEVO',
            marital_status: 'NO_DICE',
            home_ownership: 'NO_DICE',
            both_work: 'NO_DICE',
            knows_royal_prestige: '',
            has_children: false,
            children_count: '',
            spouse_name: '',
            notes: ''
        });
        setFormData({
            fullName: '',
            phone: '',
            email: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            zip: '',
            country: 'Estados Unidos'
        });
        setOpportunityForm((prev) => ({
            ...prev,
            source: '',
            productInterest: '',
            assignedToUserId: currentUserId || '',
            notes: '',
            referredById: null,
            referredByType: null,
            nextAction: '',
            nextActionAt: ''
        }));

        const loadInitial = async () => {
            try {
                const [origenesRes, asesoresRes] = await Promise.all([
                    api.get('/catalogos/origenes'),
                    api.get('/asesores')
                ]);
                setOrigenes(origenesRes.data || []);
                setAsesores(asesoresRes.data || []);
            } catch (err) {
                console.error('Error al cargar datos:', err);
            }
        };
        loadInitial();
    }, [isOpen, initialStage, currentUserId]);

    useEffect(() => {
        if (!isOpen || mode !== 'existing') return undefined;
        const term = contactSearch.trim();
        if (term.length < 2) {
            setContactResults([]);
            return undefined;
        }

        const timeout = setTimeout(async () => {
            try {
                setContactLoading(true);
                const response = await api.get('/contactos/search', { params: { q: term } });
                setContactResults(response.data || []);
            } catch (err) {
                setContactResults([]);
            } finally {
                setContactLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [contactSearch, mode]);

    useEffect(() => {
        if (!isOpen || mode !== 'new') return undefined;
        const phone = normalizePhone(formData.phone);
        const email = normalizeEmail(formData.email);
        if (!phone && !email) {
            setDuplicateContact(null);
            return undefined;
        }

        const timeout = setTimeout(async () => {
            try {
                const response = await api.get('/contactos/check-duplicate', {
                    params: {
                        phone: phone || undefined,
                        email: email || undefined
                    }
                });
                if (response.data?.exists) {
                    setDuplicateContact(response.data.contact);
                } else {
                    setDuplicateContact(null);
                }
            } catch (err) {
                setDuplicateContact(null);
            }
        }, 400);

        return () => clearTimeout(timeout);
    }, [formData.phone, formData.email, mode]);

    useEffect(() => {
        if (!isOpen || mode !== 'new') return undefined;
        const query = formData.address1.trim();
        if (query.length < 4) {
            setAddressSuggestions([]);
            return undefined;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setAddressLoading(true);
                const params = new URLSearchParams({
                    q: query,
                    format: 'jsonv2',
                    addressdetails: '1',
                    limit: '5'
                });
                const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    {
                        headers: { 'Accept-Language': 'es' },
                        signal: controller.signal
                    }
                );
                if (!response.ok) throw new Error('No se pudo consultar la direccion');
                const results = await response.json();
                const mapped = (results || []).map((item) => ({
                    raw: item,
                    ...buildAddressDisplay(item)
                }));
                setAddressSuggestions(mapped);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setAddressSuggestions([]);
                }
            } finally {
                setAddressLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [formData.address1, isOpen, mode]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const term = referredSearch.trim();
        if (term.length < 2) {
            setReferredResults([]);
            return undefined;
        }

        const timeout = setTimeout(async () => {
            try {
                setReferredLoading(true);
                const [contactosRes, clientesRes] = await Promise.all([
                    api.get('/contactos/search', { params: { q: term } }),
                    api.get('/clientes', { params: { q: term } })
                ]);
                const contactos = (contactosRes.data || []).map((item) => ({
                    type: 'CONTACTO',
                    id: item.id,
                    name: item.fullName,
                    phone: item.mobilePhone,
                    email: item.email
                }));
                const clientes = (clientesRes.data || []).map((item) => ({
                    type: 'CLIENTE',
                    id: item.ClienteID,
                    name: item.Nombre,
                    phone: item.Telefono,
                    email: item.Email
                }));
                setReferredResults([...contactos, ...clientes]);
            } catch (err) {
                setReferredResults([]);
            } finally {
                setReferredLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [referredSearch]);

    const handleSelectContact = async (contactId) => {
        try {
            const response = await api.get(`/contactos/${contactId}`);
            const contact = response.data;
            setSelectedContact(contact);
            setContactSearch('');
            setContactResults([]);
            applyContactDefaults(contact);
        } catch (err) {
            console.error('Error al cargar contacto:', err);
        }
    };

    const applyContactDefaults = (contact) => {
        const leadSource = mapOriginTypeToLabel(contact?.origin_type || contact?.OrigenFuente || contact?.leadSource);
        const assignedTo = contact?.assigned_to_user_id || contact?.AssignedToUsuarioID || currentUserId || '';
        const referredById = contact?.referred_by_id || contact?.ReferidoPorId || null;
        const referredByType = contact?.referred_by_type || null;

        setQualificationForm({
            contact_status: contact?.contact_status || 'NUEVO',
            marital_status: contact?.marital_status || contact?.EstadoCivil || 'NO_DICE',
            home_ownership: contact?.home_ownership || 'NO_DICE',
            both_work: contact?.both_work || contact?.TrabajaActualmente || 'NO_DICE',
            knows_royal_prestige: contact?.knows_royal_prestige || '',
            has_children: Boolean(contact?.has_children),
            children_count: contact?.children_count ?? '',
            spouse_name: contact?.NombrePareja || '',
            notes: contact?.notes || ''
        });

        setOpportunityForm((prev) => ({
            ...prev,
            source: leadSource || '',
            assignedToUserId: assignedTo || prev.assignedToUserId || '',
            referredById: referredById || null,
            referredByType: referredByType || null
        }));

        if (referredById && contact?.ReferidoPorNombre) {
            setReferredSelection({
                id: referredById,
                type: referredByType || 'CONTACTO',
                name: contact.ReferidoPorNombre
            });
        } else {
            setReferredSelection(null);
        }

        const missing = REQUIRED_CONTACT_FIELDS.filter((field) => {
            const value = getContactField(contact, field);
            return !value;
        });
        setMissingFields(missing);
        setShowMissingForm(false);
        setMissingForm({
            email: contact?.Email || '',
            address1: contact?.address1 || contact?.Direccion || '',
            city: contact?.city || contact?.Ciudad || '',
            state: contact?.state || contact?.Estado || '',
            zip: contact?.zip_code || contact?.Zipcode || ''
        });
    };

    const getContactField = (contact, field) => {
        if (!contact) return '';
        const map = {
            email: contact.Email,
            address1: contact.address1 || contact.Direccion,
            city: contact.city || contact.Ciudad,
            state: contact.state || contact.Estado,
            zip: contact.zip_code || contact.Zipcode
        };
        return map[field] || '';
    };

    const handleCompleteContact = async () => {
        if (!selectedContact) return;
        setLoading(true);
        setError('');
        try {
            const payload = {};
            if (missingFields.includes('email')) payload.email = normalizeEmail(missingForm.email);
            if (missingFields.includes('address1')) payload.address1 = missingForm.address1.trim();
            if (missingFields.includes('city')) payload.city = missingForm.city.trim();
            if (missingFields.includes('state')) payload.state = missingForm.state.trim();
            if (missingFields.includes('zip')) payload.zip_code = missingForm.zip.trim();

            const response = await api.patch(`/contactos/${selectedContact.ContactoID}`, payload);
            setSelectedContact(response.data);
            applyContactDefaults(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar contacto');
        } finally {
            setLoading(false);
        }
    };

    const validateContactForm = () => {
        const nextErrors = [];
        if (!formData.fullName.trim()) nextErrors.push('Nombre completo es obligatorio');
        if (!formData.phone.trim()) nextErrors.push('Celular es obligatorio');

        const emailValue = normalizeEmail(formData.email);
        if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            nextErrors.push('Email inválido');
        }
        if (formData.zip && !/^\d{5}(-\d{4})?$/.test(formData.zip)) {
            nextErrors.push('ZIP inválido');
        }
        return nextErrors;
    };

    const validateOpportunityForm = () => {
        const nextErrors = [];
        if (!opportunityForm.assignedToUserId) {
            nextErrors.push('Asesor es obligatorio');
        }
        return nextErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError('');

        if (mode === 'existing' && !selectedContact) {
            setError('Selecciona un contacto existente');
            return;
        }

        const opportunityErrors = validateOpportunityForm();
        if (mode === 'new') {
            const contactErrors = validateContactForm();
            if (contactErrors.length) {
                setError(contactErrors[0]);
                return;
            }
        }

        if (opportunityErrors.length) {
            setError(opportunityErrors[0]);
            return;
        }

        setLoading(true);
        try {
            let contactId = selectedContact?.ContactoID || null;
            let createdContactId = null;

            if (mode === 'new') {
                const contactPayload = {
                    full_name: formData.fullName.trim(),
                    mobile_phone: normalizePhone(formData.phone),
                    email: normalizeEmail(formData.email),
                    address1: formData.address1.trim(),
                    address2: formData.address2.trim(),
                    city: formData.city.trim(),
                    state: formData.state.trim(),
                    zip_code: formData.zip.trim(),
                    country: formData.country.trim() || 'Estados Unidos',
                    origin_type: mapSourceToOriginType(opportunityForm.source),
                    referred_by_type: opportunityForm.referredByType || 'NO_DICE',
                    referred_by_id: opportunityForm.referredById || 0,
                    relationship_to_referrer: 'NO_DICE',
                    assigned_to_user_id: Number(opportunityForm.assignedToUserId) || currentUserId,
                    NombreCompleto: formData.fullName.trim(),
                    Telefono: normalizePhone(formData.phone),
                    Email: normalizeEmail(formData.email),
                    Direccion: formData.address1.trim(),
                    Ciudad: formData.city.trim(),
                    Estado: formData.state.trim(),
                    Zipcode: formData.zip.trim(),
                    Pais: formData.country.trim() || 'Estados Unidos',
                    OrigenFuente: mapSourceToOriginType(opportunityForm.source)
                };

                const contactResponse = await api.post('/contactos', contactPayload);
                contactId = contactResponse.data?.id || contactResponse.data?.ContactoID || null;
                createdContactId = contactId;
            }

            if (!contactId) {
                throw new Error('No se pudo obtener el contacto');
            }

            if (!forceCreate) {
                const activeResponse = await api.get(`/oportunidades/active-by-contact/${contactId}`);
                if (activeResponse.data?.OportunidadID) {
                    setActiveOpportunity(activeResponse.data);
                    setLoading(false);
                    return;
                }
            }

            const etapaValue = stage === 'CONTACTO_INICIADO' ? 'CONTACTADO' : stage;
            const opportunityPayload = {
                contactId,
                stage: etapaValue,
                source: opportunityForm.source.trim(),
                origenNombre: opportunityForm.source.trim(),
                productInterest: opportunityForm.productInterest.trim() || null,
                notes: opportunityForm.notes.trim() || null,
                referredById: opportunityForm.referredById || null,
                referredByType: opportunityForm.referredByType || null,
                assignedToUserId: opportunityForm.assignedToUserId || currentUserId,
                nextAction: opportunityForm.nextAction.trim() || null,
                nextActionAt: opportunityForm.nextActionAt || null,
                forceCreate
            };

            const opportunityResponse = await api.post('/oportunidades', opportunityPayload);
            const createdOpportunity = opportunityResponse.data;
            const oportunidadId = createdOpportunity?.OportunidadID || createdOpportunity?.id;

            setSuccessData({
                opportunityId: oportunidadId,
                contactId: contactId
            });
            setActiveOpportunity(null);
            setForceCreate(false);
            onSuccess?.(createdOpportunity);

            if (createdContactId) {
                try {
                    const contactResponse = await api.get(`/contactos/${createdContactId}`);
                    setSelectedContact(contactResponse.data);
                } catch (err) {
                    setSelectedContact(null);
                }
            }
        } catch (err) {
            const status = err.response?.status;
            if (status === 409 && err.response?.data?.opportunity) {
                setActiveOpportunity(err.response.data.opportunity);
            } else if (status === 409 && err.response?.data?.contact) {
                setDuplicateContact(err.response.data.contact);
            } else if (status === 409 && err.response?.data?.contactId) {
                setDuplicateContact({ id: err.response.data.contactId });
            } else {
                setError(err.response?.data?.error || err.message || 'Error al crear oportunidad');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUseDuplicateContact = async () => {
        if (!duplicateContact?.id) return;
        setMode('existing');
        await handleSelectContact(duplicateContact.id);
        setDuplicateContact(null);
    };

    const handleOpenDuplicateContact = () => {
        if (!duplicateContact?.id) return;
        navigate(`/contactos/${duplicateContact.id}`);
        onClose?.();
    };

    const handleReferredSelect = (item) => {
        setOpportunityForm((prev) => ({
            ...prev,
            referredById: item.id,
            referredByType: item.type
        }));
        setReferredSelection(item);
        setReferredSearch('');
        setReferredResults([]);
    };

    const handleChangeContactMode = (nextMode) => {
        setMode(nextMode);
        setSelectedContact(null);
        setContactSearch('');
        setContactResults([]);
        setMissingFields([]);
        setShowMissingForm(false);
        setActiveOpportunity(null);
        setForceCreate(false);
        setSuccessData(null);
        setAddressSuggestions([]);
        setReferredSelection(null);
        setQualificationError('');
        setQualificationSuccess('');
    };

    const handleUpdateQualification = async () => {
        if (!selectedContact) return;
        setQualificationLoading(true);
        setQualificationError('');
        setQualificationSuccess('');
        try {
            const payload = {
                contact_status: qualificationForm.contact_status,
                marital_status: qualificationForm.marital_status || 'NO_DICE',
                home_ownership: qualificationForm.home_ownership || 'NO_DICE',
                both_work: qualificationForm.both_work || 'NO_DICE',
                knows_royal_prestige: qualificationForm.knows_royal_prestige || null,
                has_children: qualificationForm.has_children ? 1 : 0,
                children_count: qualificationForm.has_children && qualificationForm.children_count !== ''
                    ? Number(qualificationForm.children_count)
                    : null,
                spouse_name: qualificationForm.spouse_name.trim() || null,
                notes: qualificationForm.notes.trim() || undefined
            };
            Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

            const response = await api.patch(`/contactos/${selectedContact.ContactoID}`, payload);
            setSelectedContact(response.data);
            applyContactDefaults(response.data);
            setQualificationSuccess('Calificacion actualizada');
        } catch (err) {
            setQualificationError(err.response?.data?.error || 'No se pudo actualizar la calificacion');
        } finally {
            setQualificationLoading(false);
        }
    };

    const handleAddressSelect = (item) => {
        setFormData((prev) => ({
            ...prev,
            address1: item.address1 || prev.address1,
            city: item.city || prev.city,
            state: item.state || prev.state,
            zip: item.zip || prev.zip,
            country: item.country || prev.country
        }));
        setAddressSuggestions([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col scale-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-gray-50/50 border-b border-gray-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="text-2xl">✨</span> Nueva oportunidad
                        </h2>
                        <p className="text-sm text-slate-500">Crea una oportunidad sin duplicar contactos</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                    {successData && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 flex flex-col gap-3">
                            <div className="font-semibold">Oportunidad creada correctamente.</div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => onOpenOpportunity?.(successData.opportunityId)}
                                    className="btn-primary !py-2 !px-4"
                                >
                                    Ver oportunidad
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/contactos/${successData.contactId}`)}
                                    className="btn-secondary !py-2 !px-4"
                                >
                                    Ver contacto
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-xs font-semibold text-slate-500"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                            ⚠️ {error}
                        </div>
                    )}

                    {activeOpportunity && !forceCreate && (
                        <div className="mb-4 bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3 rounded-xl text-sm font-medium flex flex-col gap-3">
                            <span>
                                Este contacto ya tiene una oportunidad activa en {activeOpportunity.Etapa}.
                            </span>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => onOpenOpportunity?.(activeOpportunity.OportunidadID)}
                                    className="btn-secondary !py-2 !px-4"
                                >
                                    Abrir oportunidad
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForceCreate(true);
                                        setActiveOpportunity(null);
                                    }}
                                    className="btn-primary !py-2 !px-4"
                                >
                                    Crear una nueva de todas formas
                                </button>
                            </div>
                        </div>
                    )}

                    {duplicateContact && mode === 'new' && (
                        <div className="mb-4 bg-sky-50 border border-sky-100 text-sky-700 px-4 py-3 rounded-xl text-sm font-medium flex flex-col gap-3">
                            <span>
                                Este contacto ya existe: {duplicateContact.fullName || 'Contacto existente'}.
                            </span>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleUseDuplicateContact}
                                    className="btn-primary !py-2 !px-4"
                                >
                                    Usar contacto existente
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenDuplicateContact}
                                    className="btn-secondary !py-2 !px-4"
                                >
                                    Abrir ficha
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleChangeContactMode('new')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${mode === 'new' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        >
                            Nuevo contacto
                        </button>
                        <button
                            type="button"
                            onClick={() => handleChangeContactMode('existing')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${mode === 'existing' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        >
                            Usar contacto existente
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-4 border-b border-primary-100 pb-2">
                            👤 Información del contacto
                        </h3>

                        {mode === 'existing' && (
                            <div className="space-y-4">
                                {!selectedContact && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Buscar contacto</label>
                                        <input
                                            type="text"
                                            value={contactSearch}
                                            onChange={(event) => setContactSearch(event.target.value)}
                                            placeholder="Nombre, celular o email"
                                            className="input-field mt-2 h-11 px-4"
                                        />
                                        {contactLoading && (
                                            <p className="text-xs text-slate-400">Buscando...</p>
                                        )}
                                        {!contactLoading && contactSearch.trim().length >= 2 && contactResults.length === 0 && (
                                            <p className="text-xs text-slate-400">No encontramos contactos.</p>
                                        )}
                                        {contactResults.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                                {contactResults.map((contacto) => (
                                                    <button
                                                        key={contacto.id}
                                                        type="button"
                                                        onClick={() => handleSelectContact(contacto.id)}
                                                        className="px-4 py-2 rounded-xl border text-left text-sm transition-all border-slate-200 hover:border-indigo-200"
                                                    >
                                                        <p className="text-sm font-semibold text-slate-700">{contacto.fullName}</p>
                                                        <p className="text-xs text-slate-500">{contacto.mobilePhone || 'Sin celular'} • {contacto.email || 'Sin email'}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedContact && (
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold">{selectedContact.full_name || selectedContact.NombreCompleto}</p>
                                                    <p className="text-xs text-slate-500">{selectedContact.mobile_phone || selectedContact.Telefono || 'Sin celular'} • {selectedContact.Email || 'Sin email'}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {(selectedContact.address1 || selectedContact.Direccion) ? `${selectedContact.address1 || selectedContact.Direccion}, ` : ''}
                                                        {normalizeNoDice(selectedContact.city || selectedContact.Ciudad)}
                                                        {normalizeNoDice(selectedContact.state || selectedContact.Estado)
                                                            ? `, ${normalizeNoDice(selectedContact.state || selectedContact.Estado)}`
                                                            : ''}
                                                        {(selectedContact.zip_code || selectedContact.Zipcode) ? ` ${selectedContact.zip_code || selectedContact.Zipcode}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChangeContactMode('existing')}
                                                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                                    >
                                                        Cambiar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/contactos/${selectedContact.ContactoID}`)}
                                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        Ver ficha
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {missingFields.length > 0 && (
                                            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex flex-col gap-3">
                                                <span>
                                                    Contacto incompleto: faltan {missingFieldList}.
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMissingForm((prev) => !prev)}
                                                    className="text-xs font-semibold text-amber-700 underline"
                                                >
                                                    Completar ahora
                                                </button>

                                                {showMissingForm && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {missingFields.includes('email') && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-600">Email</label>
                                                                <input
                                                                    type="email"
                                                                    value={missingForm.email}
                                                                    onChange={(event) => setMissingForm((prev) => ({ ...prev, email: event.target.value }))}
                                                                    className="input-field mt-2 h-10 px-3"
                                                                />
                                                            </div>
                                                        )}
                                                        {missingFields.includes('address1') && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-600">Dirección</label>
                                                                <input
                                                                    type="text"
                                                                    value={missingForm.address1}
                                                                    onChange={(event) => setMissingForm((prev) => ({ ...prev, address1: event.target.value }))}
                                                                    className="input-field mt-2 h-10 px-3"
                                                                />
                                                            </div>
                                                        )}
                                                        {missingFields.includes('city') && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-600">Ciudad</label>
                                                                <input
                                                                    type="text"
                                                                    value={missingForm.city}
                                                                    onChange={(event) => setMissingForm((prev) => ({ ...prev, city: event.target.value }))}
                                                                    className="input-field mt-2 h-10 px-3"
                                                                />
                                                            </div>
                                                        )}
                                                        {missingFields.includes('state') && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-600">Estado/Provincia</label>
                                                                <input
                                                                    type="text"
                                                                    value={missingForm.state}
                                                                    onChange={(event) => setMissingForm((prev) => ({ ...prev, state: event.target.value }))}
                                                                    className="input-field mt-2 h-10 px-3"
                                                                />
                                                            </div>
                                                        )}
                                                        {missingFields.includes('zip') && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-600">ZIP</label>
                                                                <input
                                                                    type="text"
                                                                    value={missingForm.zip}
                                                                    onChange={(event) => setMissingForm((prev) => ({ ...prev, zip: event.target.value }))}
                                                                    className="input-field mt-2 h-10 px-3"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="md:col-span-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleCompleteContact}
                                                                className="btn-primary !py-2 !px-4"
                                                            >
                                                                Guardar contacto
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'new' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Nombre completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                                        placeholder="Ej: Juan Pérez"
                                        className="input-field mt-2 h-11 px-4"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Celular <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                                        placeholder="+1 305 555 0123"
                                        className="input-field mt-2 h-11 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                                        placeholder="correo@ejemplo.com"
                                        className="input-field mt-2 h-11 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Dirección
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.address1}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, address1: event.target.value }))}
                                            placeholder="Calle 50"
                                            className="input-field mt-2 h-11 px-4"
                                            autoComplete="off"
                                        />
                                        {addressLoading && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Buscando...</span>
                                        )}
                                        {addressSuggestions.length > 0 && (
                                            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                                                {addressSuggestions.map((item, index) => (
                                                    <button
                                                        key={`${item.label}-${index}`}
                                                        type="button"
                                                        onClick={() => handleAddressSelect(item)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                                                    >
                                                        <div className="font-semibold">{item.address1}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {item.city}{item.state ? `, ${item.state}` : ''}{item.zip ? ` ${item.zip}` : ''}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Ciudad
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
                                        placeholder="Miami"
                                        className="input-field mt-2 h-11 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Estado/Provincia
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, state: event.target.value }))}
                                        placeholder="FL"
                                        className="input-field mt-2 h-11 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        ZIP
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.zip}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, zip: event.target.value }))}
                                        placeholder="33101"
                                        className="input-field mt-2 h-11 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        País
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))}
                                        className="input-field mt-2 h-11 px-4"
                                        disabled
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-4 border-b border-primary-100 pb-2">
                            💼 Información de la oportunidad
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Origen / Fuente
                                </label>
                                <input
                                    type="text"
                                    list="origenes-list"
                                    value={opportunityForm.source}
                                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, source: event.target.value }))}
                                    placeholder="Seleccionar o escribir"
                                    className="input-field mt-2 h-11 px-4"
                                />
                                <datalist id="origenes-list">
                                    {origenes.map((origen) => (
                                        <option key={origen.id} value={origen.nombre} />
                                    ))}
                                    {!origenes.length && (
                                        <>
                                            <option value="Toque de Puerta" />
                                            <option value="Referido" />
                                            <option value="Familiares y Amigos" />
                                            <option value="Raspa y Gana" />
                                            <option value="Calendario de la suerte" />
                                            <option value="Feria" />
                                            <option value="Exhibidor" />
                                            <option value="Redes Sociales" />
                                            <option value="Clientes de Otro Distribuidor" />
                                            <option value="Otros" />
                                        </>
                                    )}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Producto de interés
                                </label>
                                <input
                                    type="text"
                                    value={opportunityForm.productInterest}
                                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, productInterest: event.target.value }))}
                                    placeholder="Producto por definir"
                                    className="input-field mt-2 h-11 px-4"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Asesor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={opportunityForm.assignedToUserId}
                                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, assignedToUserId: event.target.value }))}
                                    className="input-field bg-white mt-2 h-11 px-4"
                                >
                                    <option value="">Sin asignar</option>
                                    {asesores.map((asesor) => (
                                        <option key={asesor.id} value={asesor.id}>{asesor.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Notas iniciales
                                </label>
                                <textarea
                                    value={opportunityForm.notes}
                                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, notes: event.target.value }))}
                                    rows="3"
                                    placeholder="Información adicional del contacto inicial..."
                                    className="input-field resize-none mt-2 h-12 px-4"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Referido por
                                </label>
                                <input
                                    type="text"
                                    value={referredSearch}
                                    onChange={(event) => setReferredSearch(event.target.value)}
                                    placeholder="Buscar por nombre, celular o email"
                                    className="input-field mt-2 h-11 px-4"
                                />
                                {referredLoading && (
                                    <p className="text-xs text-slate-400 mt-1">Buscando...</p>
                                )}
                                {!referredLoading && referredSearch.trim().length >= 2 && referredResults.length === 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="text-xs text-slate-400">No encontramos resultados.</p>
                                        <button
                                            type="button"
                                            onClick={() => window.open('/contactos/new', '_blank')}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                        >
                                            + Crear contacto
                                        </button>
                                    </div>
                                )}
                                {referredResults.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                        {referredResults.map((item) => (
                                            <button
                                                key={`${item.type}-${item.id}`}
                                                type="button"
                                                onClick={() => handleReferredSelect(item)}
                                                className="px-4 py-2 rounded-xl border text-left text-sm transition-all border-slate-200 hover:border-indigo-200"
                                            >
                                                <span className="text-[10px] uppercase tracking-widest text-slate-400">
                                                    {item.type === 'CLIENTE' ? 'Cliente' : 'Contacto'}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.phone || 'Sin celular'} • {item.email || 'Sin email'}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {opportunityForm.referredById && (
                                    <div className="mt-3 text-xs text-slate-500">
                                        Referido seleccionado: {referredSelection?.name || 'Seleccionado'}.
                                        <button
                                            type="button"
                                            className="text-indigo-600 ml-2"
                                            onClick={() => {
                                                setOpportunityForm((prev) => ({ ...prev, referredById: null, referredByType: null }));
                                                setReferredSelection(null);
                                            }}
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Próxima acción
                                </label>
                                <input
                                    type="text"
                                    value={opportunityForm.nextAction}
                                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, nextAction: event.target.value }))}
                                    placeholder="Ej: Llamar para confirmar cita"
                                    className="input-field mt-2 h-11 px-4"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Fecha próxima acción
                                </label>
                                <input
                                    type="date"
                                    value={opportunityForm.nextActionAt}
                                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, nextActionAt: event.target.value }))}
                                    className="input-field mt-2 h-11 px-4"
                                />
                            </div>
                        </div>
                    </div>

                    {mode === 'existing' && (
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-4 border-b border-primary-100 pb-2">
                                ✅ Actualizar calificación (opcional)
                            </h3>
                            {qualificationError && (
                                <div className="mb-3 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-semibold">
                                    {qualificationError}
                                </div>
                            )}
                            {qualificationSuccess && (
                                <div className="mb-3 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-semibold">
                                    {qualificationSuccess}
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Estado</label>
                                    <select
                                        value={qualificationForm.contact_status}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, contact_status: event.target.value }))}
                                        className="input-field mt-2 h-10 px-3 bg-white"
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Estado civil</label>
                                    <select
                                        value={qualificationForm.marital_status}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, marital_status: event.target.value }))}
                                        className="input-field mt-2 h-10 px-3 bg-white"
                                    >
                                        {MARITAL_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Nombre pareja</label>
                                    <input
                                        type="text"
                                        value={qualificationForm.spouse_name}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, spouse_name: event.target.value }))}
                                        className="input-field mt-2 h-10 px-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Vivienda</label>
                                    <select
                                        value={qualificationForm.home_ownership}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, home_ownership: event.target.value }))}
                                        className="input-field mt-2 h-10 px-3 bg-white"
                                    >
                                        {HOME_OWNERSHIP_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Trabajo en casa</label>
                                    <select
                                        value={qualificationForm.both_work}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, both_work: event.target.value }))}
                                        className="input-field mt-2 h-10 px-3 bg-white"
                                    >
                                        {BOTH_WORK_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Conoce Royal Prestige</label>
                                    <select
                                        value={qualificationForm.knows_royal_prestige}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, knows_royal_prestige: event.target.value }))}
                                        className="input-field mt-2 h-10 px-3 bg-white"
                                    >
                                        <option value="">Sin seleccionar</option>
                                        {KNOWS_RP_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Hijos</label>
                                    <select
                                        value={qualificationForm.has_children ? 'si' : 'no'}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, has_children: event.target.value === 'si' }))}
                                        className="input-field mt-2 h-10 px-3 bg-white"
                                    >
                                        <option value="no">No</option>
                                        <option value="si">Si</option>
                                    </select>
                                </div>
                                {qualificationForm.has_children && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600">Cantidad de hijos</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={qualificationForm.children_count}
                                            onChange={(event) => setQualificationForm((prev) => ({ ...prev, children_count: event.target.value }))}
                                            className="input-field mt-2 h-10 px-3"
                                        />
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600">Notas</label>
                                    <textarea
                                        value={qualificationForm.notes}
                                        onChange={(event) => setQualificationForm((prev) => ({ ...prev, notes: event.target.value }))}
                                        rows="2"
                                        className="input-field resize-none mt-2 h-12 px-3"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        type="button"
                                        onClick={handleUpdateQualification}
                                        disabled={qualificationLoading || !selectedContact}
                                        className="btn-secondary !py-2 !px-4"
                                    >
                                        {qualificationLoading ? 'Guardando...' : 'Guardar calificacion'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6 mt-8 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1 py-3"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (mode === 'existing' && !selectedContact)}
                            className="btn-primary flex-1 py-3 shadow-xl shadow-primary-500/20"
                        >
                            {loading ? 'Procesando...' : 'Crear oportunidad'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NuevoLeadModal;
