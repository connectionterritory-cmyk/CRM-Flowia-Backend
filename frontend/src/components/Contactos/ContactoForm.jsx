import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getUserRole } from '../../utils/roles';
import { useTerminology } from '../../hooks/useTerminology';
import FormField from '../ui/FormField';
import Accordion from '../ui/Accordion';
import UserSelector from '../Forms/UserSelector';

const STATUS_OPTIONS = ['NUEVO', 'CONTACTADO', 'CALIFICADO', 'CITA_AGENDADA', 'NO_MOLESTAR', 'NO_INTERESA'];
const ORIGIN_OPTIONS = [
    { value: 'toque_puerta', labelKey: 'contacts.origin.toque_puerta', backend: 'Toque de Puerta' },
    { value: 'referido', labelKey: 'contacts.origin.referido', backend: 'Referido' },
    { value: 'familiares_amigos', labelKey: 'contacts.origin.familiares_amigos', backend: 'Familiares y Amigos' },
    { value: 'raspa_gana', labelKey: 'contacts.origin.raspa_gana', backend: 'Raspa y Gana' },
    { value: 'calendario_suerte', labelKey: 'contacts.origin.calendario_suerte', backend: 'Calendario de la suerte' },
    { value: 'feria', labelKey: 'contacts.origin.feria', backend: 'Feria' },
    { value: 'exhibidor', labelKey: 'contacts.origin.exhibidor', backend: 'Exhibidor' },
    { value: 'redes_sociales', labelKey: 'contacts.origin.redes_sociales', backend: 'Redes Sociales' },
    { value: 'clientes_otro_distribuidor', labelKey: 'contacts.origin.clientes_otro_distribuidor', backend: 'Clientes de Otro Distribuidor' },
    { value: 'otro', labelKey: 'contacts.origin.otro', backend: 'Otros' }
];
const RELATIONSHIP_OPTIONS = [
    { value: 'AMIGO', labelKey: 'contacts.referredTypes.amigo' },
    { value: 'FAMILIA', labelKey: 'contacts.referredTypes.familia' },
    { value: 'CLIENTE', labelKey: 'contacts.referredTypes.cliente' },
    { value: 'EXTERNO', labelKey: 'contacts.referredTypes.externo' },
    { value: 'OTRO', labelKey: 'contacts.referredTypes.otro' }
];
const MARITAL_OPTIONS = [
    { value: 'SOLTERO', labelKey: 'contacts.enums.marital.soltero' },
    { value: 'CASADO', labelKey: 'contacts.enums.marital.casado' },
    { value: 'UNION_LIBRE', labelKey: 'contacts.enums.marital.union_libre' },
    { value: 'DIVORCIADO', labelKey: 'contacts.enums.marital.divorciado' },
    { value: 'VIUDO', labelKey: 'contacts.enums.marital.viudo' },
    { value: 'OTRO', labelKey: 'contacts.enums.marital.otro' }
];
const HOME_OWNERSHIP_OPTIONS = [
    { value: 'DUEÑO', labelKey: 'contacts.enums.homeOwnership.dueno' },
    { value: 'RENTA', labelKey: 'contacts.enums.homeOwnership.renta' }
];
const BOTH_WORK_OPTIONS = [
    { value: 'TRABAJA_1', labelKey: 'contacts.household.workSolo' },
    { value: 'TRABAJAN_2', labelKey: 'contacts.household.workBoth' }
];
const KNOWS_RP_OPTIONS = [
    { value: 'SI', labelKey: 'contacts.enums.knowsRoyal.si' },
    { value: 'NO', labelKey: 'contacts.enums.knowsRoyal.no' },
    { value: 'HA_ESCUCHADO', labelKey: 'contacts.enums.knowsRoyal.ha_escuchado' }
];

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

const buildNotesWithMeta = (notes, meta) => {
    const base = notes?.trim();
    const metaLines = Object.entries(meta)
        .filter(([, value]) => value)
        .map(([key, value]) => `[fs:${key}]${value}`);
    return [base, ...metaLines].filter(Boolean).join('\n');
};

const normalizeOptional = (value) => {
    if (!value || value === 'NO_DICE') return '';
    return value;
};

const mapOriginFromBackend = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'otro';
    const fallbackMap = {
        referido: 'referido',
        marketing: 'redes_sociales',
        prospeccion: 'toque_puerta',
        evento: 'feria',
        programa: 'referido',
        otro: 'otro'
    };
    const matched = ORIGIN_OPTIONS.find((option) => option.backend.toLowerCase() === normalized);
    if (matched) return matched.value;
    if (fallbackMap[normalized]) return fallbackMap[normalized];
    return 'otro';
};

const mapRelationshipFromBackend = (value) => {
    if (!value || value === 'NO_DICE') return '';
    const upper = value.toUpperCase();
    const allowed = RELATIONSHIP_OPTIONS.map((option) => option.value);
    return allowed.includes(upper) ? upper : 'OTRO';
};

const ContactoForm = ({ initialData, onSubmit, onCancel, loading }) => {
    const { t } = useTranslation();
    const { term } = useTerminology();
    const { user } = useAuth();
    const role = getUserRole(user);
    const userId = user?.UsuarioID || user?.id || '';
    const userName = user?.Nombre || user?.name || '';

    const [formData, setFormData] = useState({
        full_name: '',
        mobile_phone: '',
        city: '',
        state: '',
        contact_status: 'NUEVO',
        assigned_to_user_id: '',
        email: '',
        address1: '',
        address2: '',
        zip_code: '',
        country: 'USA',
        origin_type: 'toque_puerta',
        origin_custom: '',
        referred_by_name: '',
        referred_by_id: '',
        referred_by_source: '',
        relationship_type: '',
        relationship_other: '',
        marital_status: '',
        marital_status_other: '',
        spouse_name: '',
        home_ownership: '',
        both_work: '',
        knows_royal_prestige: '',
        has_children: false,
        children_count: '',
        contact_allowed: true,
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [referredSearch, setReferredSearch] = useState('');
    const [referredResults, setReferredResults] = useState([]);
    const [referredLoading, setReferredLoading] = useState(false);

    const inputClassName = 'w-full h-11 md:h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all';

    useEffect(() => {
        if (!initialData) return;
        const { meta, cleanNotes } = parseMetaNotes(initialData.notes || '');
        const originBackend = normalizeOptional(initialData.origin_type || initialData.OrigenFuente || '');
        const originType = mapOriginFromBackend(originBackend);
        const referredTypeRaw = (initialData.referred_by_type || '').toUpperCase();
        const referredSourceValue = referredTypeRaw === 'CLIENTE' ? 'cliente' : referredTypeRaw === 'CONTACTO' ? 'contacto' : '';

        setFormData((prev) => ({
            ...prev,
            full_name: initialData.full_name || initialData.NombreCompleto || '',
            mobile_phone: initialData.mobile_phone || initialData.Telefono || '',
            city: normalizeOptional(initialData.city || initialData.Ciudad || ''),
            state: normalizeOptional(initialData.state || initialData.Estado || ''),
            contact_status: initialData.contact_status || 'NUEVO',
            assigned_to_user_id: String(initialData.assigned_to_user_id || initialData.AssignedToUsuarioID || ''),
            email: initialData.email || initialData.Email || '',
            address1: initialData.address1 || initialData.Direccion || '',
            address2: initialData.address2 || '',
            zip_code: initialData.zip_code || initialData.Zipcode || '',
            country: initialData.country || initialData.Pais || 'USA',
            origin_type: originType,
            origin_custom: normalizeOptional(meta.origin_custom) || (originType === 'otro' ? originBackend : ''),
            referred_by_name: meta.referred_by_name || initialData.referred_by_name || initialData.ReferidoPorNombre || '',
            referred_by_id: initialData.referred_by_id || initialData.ReferidoPorId || '',
            referred_by_source: meta.referred_by_source || referredSourceValue,
            relationship_type: meta.relationship_type || mapRelationshipFromBackend(initialData.relationship_to_referrer),
            relationship_other: meta.relationship_other || '',
            marital_status: initialData.marital_status || initialData.EstadoCivil || '',
            marital_status_other: meta.marital_status_other || '',
            spouse_name: initialData.spouse_name || initialData.NombrePareja || '',
            home_ownership: initialData.home_ownership || '',
            both_work: initialData.both_work || '',
            knows_royal_prestige: initialData.knows_royal_prestige || '',
            has_children: Boolean(initialData.has_children),
            children_count: initialData.children_count ?? '',
            contact_allowed: initialData.contact_allowed !== undefined ? Boolean(initialData.contact_allowed) : true,
            notes: cleanNotes
        }));
    }, [initialData]);

    useEffect(() => {
        if (!initialData && (role === 'VENDEDOR' || role === 'ASESOR') && userId) {
            setFormData((prev) => ({
                ...prev,
                assigned_to_user_id: String(prev.assigned_to_user_id || userId)
            }));
        }
    }, [initialData, role, userId]);

    useEffect(() => {
        if (formData.origin_type !== 'referido') {
            setFormData((prev) => ({
                ...prev,
                referred_by_name: '',
                referred_by_id: '',
                referred_by_source: '',
                relationship_type: '',
                relationship_other: ''
            }));
        }
    }, [formData.origin_type]);

    useEffect(() => {
        if (formData.origin_type !== 'otro' && formData.origin_custom) {
            setFormData((prev) => ({ ...prev, origin_custom: '' }));
        }
    }, [formData.origin_type, formData.origin_custom]);

    useEffect(() => {
        if (formData.relationship_type !== 'OTRO' && formData.relationship_other) {
            setFormData((prev) => ({ ...prev, relationship_other: '' }));
        }
    }, [formData.relationship_type, formData.relationship_other]);

    useEffect(() => {
        if (formData.marital_status !== 'OTRO' && formData.marital_status_other) {
            setFormData((prev) => ({ ...prev, marital_status_other: '' }));
        }
    }, [formData.marital_status, formData.marital_status_other]);

    useEffect(() => {
        if (formData.marital_status !== 'CASADO' && formData.spouse_name) {
            setFormData((prev) => ({ ...prev, spouse_name: '' }));
        }
    }, [formData.marital_status, formData.spouse_name]);

    useEffect(() => {
        if (!formData.has_children && formData.children_count) {
            setFormData((prev) => ({ ...prev, children_count: '' }));
        }
    }, [formData.has_children, formData.children_count]);

    useEffect(() => {
        const shouldSearch = formData.origin_type === 'referido'
            && referredSearch.trim().length >= 2;

        if (!shouldSearch) {
            setReferredResults([]);
            return undefined;
        }

        const timeout = setTimeout(async () => {
            try {
                setReferredLoading(true);
                const [contactosResponse, clientesResponse] = await Promise.all([
                    api.get('/contactos', { params: { q: referredSearch.trim(), limit: 6 } }),
                    api.get('/clientes', { params: { q: referredSearch.trim(), limit: 6 } })
                ]);
                const contactosData = contactosResponse.data?.data || contactosResponse.data || [];
                const clientesData = clientesResponse.data?.data || clientesResponse.data || [];
                const contactosMapped = contactosData.map((item) => ({
                    id: item.ContactoID || item.id,
                    type: 'contacto',
                    label: item.full_name || item.NombreCompleto || ''
                })).filter((item) => item.id && item.label);
                const clientesMapped = clientesData.map((item) => ({
                    id: item.ClienteID || item.id,
                    type: 'cliente',
                    label: item.Nombre || item.full_name || ''
                })).filter((item) => item.id && item.label);
                setReferredResults([...contactosMapped, ...clientesMapped]);
            } catch (error) {
                setReferredResults([]);
            } finally {
                setReferredLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [formData.origin_type, referredSearch]);

    const assignedRequired = true;
    const assignedDisabled = false;

    const statusLabelMap = {
        NUEVO: 'status.new',
        CONTACTADO: 'status.contacted',
        CALIFICADO: 'status.qualified',
        CITA_AGENDADA: 'status.appointmentScheduled',
        NO_MOLESTAR: 'status.doNotContact',
        NO_INTERESA: 'status.notInterested'
    };

    const handleChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const nextErrors = {};
        if (!formData.full_name.trim()) {
            nextErrors.full_name = t('common.required', { field: t('contacts.fields.name') });
        }
        if (!formData.mobile_phone.trim()) {
            nextErrors.mobile_phone = t('common.required', { field: t('contacts.fields.mobilePhone') });
        }
        return nextErrors;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const originOption = ORIGIN_OPTIONS.find((option) => option.value === formData.origin_type);
        const originBackendValue = formData.origin_type === 'otro'
            ? (formData.origin_custom.trim() || originOption?.backend || 'Otros')
            : (originOption?.backend || 'Otros');
        const originMetaValue = formData.origin_type === 'otro'
            ? formData.origin_custom.trim()
            : originOption?.meta || '';

        const referredBackendValue = formData.origin_type === 'referido' && formData.referred_by_id
            ? (formData.referred_by_source === 'cliente' ? 'CLIENTE' : 'CONTACTO')
            : 'NO_DICE';

        const relationshipValue = formData.relationship_type === 'OTRO'
            ? formData.relationship_other.trim()
            : formData.relationship_type || 'NO_DICE';

        const maritalValue = formData.marital_status === 'OTRO'
            ? formData.marital_status_other.trim()
            : formData.marital_status || 'NO_DICE';

        const notes = buildNotesWithMeta(formData.notes, {
            origin_custom: originMetaValue || '',
            referred_by_name: formData.referred_by_name.trim(),
            referred_by_source: formData.referred_by_source,
            relationship_type: formData.relationship_type,
            relationship_other: formData.relationship_other.trim(),
            marital_status_other: formData.marital_status_other.trim()
        });

        const payload = {
            full_name: formData.full_name.trim(),
            mobile_phone: formData.mobile_phone.trim(),
            city: formData.city.trim() || 'NO_DICE',
            state: formData.state.trim() || 'NO_DICE',
            contact_status: formData.contact_status,
            assigned_to_user_id: Number(formData.assigned_to_user_id) || undefined,
            email: formData.email.trim(),
            address1: formData.address1.trim(),
            address2: formData.address2.trim(),
            zip_code: formData.zip_code.trim(),
            country: formData.country.trim() || 'USA',
            origin_type: originBackendValue,
            referred_by_type: referredBackendValue,
            referred_by_id: Number(formData.referred_by_id) || 0,
            relationship_to_referrer: relationshipValue,
            marital_status: maritalValue,
            home_ownership: formData.home_ownership || 'NO_DICE',
            both_work: formData.both_work || 'NO_DICE',
            knows_royal_prestige: formData.knows_royal_prestige || null,
            has_children: formData.has_children ? 1 : 0,
            children_count: formData.children_count === '' ? null : Number(formData.children_count),
            contact_allowed: formData.contact_allowed ? 1 : 0,
            notes,
            spouse_name: formData.spouse_name.trim(),
            NombreCompleto: formData.full_name.trim(),
            Telefono: formData.mobile_phone.trim(),
            Email: formData.email.trim(),
            Ciudad: formData.city.trim() || 'NO_DICE',
            Estado: formData.state.trim() || 'NO_DICE',
            OrigenFuente: originBackendValue,
            ReferidoPorNombre: formData.referred_by_name.trim() || null,
            NombrePareja: formData.spouse_name.trim() || null
        };

        onSubmit(payload);
    };

    const accordionItems = [
        {
            id: 'origin',
            title: t('contacts.sections.originReferral'),
            defaultOpen: true,
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label={t('contacts.fields.origin')}>
                        <select
                            value={formData.origin_type}
                            onChange={(event) => handleChange('origin_type', event.target.value)}
                            className={inputClassName}
                        >
                            {ORIGIN_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.labelKey)}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    {formData.origin_type === 'otro' && (
                        <FormField
                            label={t('contacts.fields.originCustom')}
                            error={errors.origin_custom}
                        >
                            <input
                                type="text"
                                value={formData.origin_custom}
                                onChange={(event) => handleChange('origin_custom', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.originCustom')}
                            />
                        </FormField>
                    )}

                    {formData.origin_type === 'referido' && (
                        <>
                            <FormField
                                label={t('contacts.fields.referredByName')}
                                error={errors.referred_by_name}
                            >
                                <input
                                    type="text"
                                    value={formData.referred_by_name}
                                    onChange={(event) => {
                                        handleChange('referred_by_name', event.target.value);
                                        handleChange('referred_by_id', '');
                                    }}
                                    className={inputClassName}
                                    placeholder={t('contacts.placeholders.referredByName')}
                                />
                            </FormField>

                            <FormField
                                label={t('contacts.fields.referredType')}
                                error={errors.relationship_type}
                            >
                                <select
                                    value={formData.relationship_type}
                                    onChange={(event) => handleChange('relationship_type', event.target.value)}
                                    className={inputClassName}
                                >
                                    <option value="">{t('common.select')}</option>
                                    {RELATIONSHIP_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.value === 'CLIENTE' ? term('customer') : t(option.labelKey)}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <div className="md:col-span-2 space-y-2">
                                <FormField
                                    label={t('contacts.fields.referredSearch')}
                                    helper={t('contacts.helpers.referredSearch')}
                                    error={errors.referred_by_id}
                                >
                                    <input
                                        type="text"
                                        value={referredSearch}
                                        onChange={(event) => setReferredSearch(event.target.value)}
                                        className={inputClassName}
                                        placeholder={t('contacts.placeholders.referredSearch')}
                                    />
                                </FormField>

                                {referredLoading && (
                                    <p className="text-xs text-slate-400">{t('common.loading')}</p>
                                )}

                                {!referredLoading && referredSearch.trim().length >= 2 && referredResults.length === 0 && (
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-400">{t('contacts.helpers.referredEmpty')}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleChange('referred_by_name', referredSearch.trim());
                                                handleChange('referred_by_id', '');
                                                handleChange('referred_by_source', '');
                                                window.open('/contactos/new', '_blank');
                                            }}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                        >
                                            {t('buttons.createContact')}
                                        </button>
                                    </div>
                                )}

                                {referredResults.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {referredResults.map((option) => (
                                            <button
                                                key={`${option.type}-${option.id}`}
                                                type="button"
                                                onClick={() => {
                                                    handleChange('referred_by_id', String(option.id));
                                                    handleChange('referred_by_name', option.label);
                                                    handleChange('referred_by_source', option.type);
                                                }}
                                                className={`px-4 py-2 rounded-xl border text-left text-sm transition-all ${String(formData.referred_by_id) === String(option.id)
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-slate-200 hover:border-indigo-200'
                                                    }`}
                                            >
                                                <span className="text-[10px] uppercase tracking-widest text-slate-400">
                                                    {option.type === 'cliente' ? term('customer') : term('contact')}
                                                </span>
                                                <p className="text-sm font-semibold text-slate-700">{option.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {formData.relationship_type === 'OTRO' && (
                                <FormField
                                    label={t('contacts.fields.relationshipOther')}
                                    error={errors.relationship_other}
                                >
                                    <input
                                        type="text"
                                        value={formData.relationship_other}
                                        onChange={(event) => handleChange('relationship_other', event.target.value)}
                                        className={inputClassName}
                                        placeholder={t('contacts.placeholders.relationshipOther')}
                                    />
                                </FormField>
                            )}
                        </>
                    )}
                </div>
            )
        },
        {
            id: 'household',
            title: t('contacts.sections.household'),
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label={t('contacts.fields.maritalStatus')}>
                        <select
                            value={formData.marital_status}
                            onChange={(event) => handleChange('marital_status', event.target.value)}
                            className={inputClassName}
                        >
                            <option value="">{t('common.select')}</option>
                            {MARITAL_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.labelKey)}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    {formData.marital_status === 'OTRO' && (
                        <FormField
                            label={t('contacts.fields.maritalStatusOther')}
                            error={errors.marital_status_other}
                        >
                            <input
                                type="text"
                                value={formData.marital_status_other}
                                onChange={(event) => handleChange('marital_status_other', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.maritalStatusOther')}
                            />
                        </FormField>
                    )}

                    {formData.marital_status === 'CASADO' && (
                        <FormField
                            label={t('contacts.fields.spouseName')}
                            error={errors.spouse_name}
                        >
                            <input
                                type="text"
                                value={formData.spouse_name}
                                onChange={(event) => handleChange('spouse_name', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.spouseName')}
                            />
                        </FormField>
                    )}

                    <FormField label={t('contacts.fields.homeOwnership')}>
                        <select
                            value={formData.home_ownership}
                            onChange={(event) => handleChange('home_ownership', event.target.value)}
                            className={inputClassName}
                        >
                            <option value="">{t('common.select')}</option>
                            {HOME_OWNERSHIP_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.labelKey)}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label={t('contacts.fields.bothWork')}>
                        <select
                            value={formData.both_work}
                            onChange={(event) => handleChange('both_work', event.target.value)}
                            className={inputClassName}
                        >
                            <option value="">{t('common.select')}</option>
                            {BOTH_WORK_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.labelKey)}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label={t('contacts.fields.knowsRoyal')}>
                        <select
                            value={formData.knows_royal_prestige}
                            onChange={(event) => handleChange('knows_royal_prestige', event.target.value)}
                            className={inputClassName}
                        >
                            <option value="">{t('common.select')}</option>
                            {KNOWS_RP_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.labelKey)}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label={t('contacts.fields.hasChildren')}>
                        <select
                            value={formData.has_children ? 'si' : 'no'}
                            onChange={(event) => handleChange('has_children', event.target.value === 'si')}
                            className={inputClassName}
                        >
                            <option value="no">{t('common.no')}</option>
                            <option value="si">{t('common.yes')}</option>
                        </select>
                    </FormField>

                    {formData.has_children && (
                        <FormField
                            label={t('contacts.fields.childrenCount')}
                            error={errors.children_count}
                        >
                            <input
                                type="number"
                                min="0"
                                value={formData.children_count}
                                onChange={(event) => handleChange('children_count', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.childrenCount')}
                            />
                        </FormField>
                    )}
                </div>
            )
        },
        {
            id: 'notes',
            title: t('contacts.sections.notes'),
            content: (
                <FormField label={t('contacts.fields.notes')}>
                    <textarea
                        value={formData.notes}
                        onChange={(event) => handleChange('notes', event.target.value)}
                        className={`${inputClassName} min-h-[140px] resize-none`}
                        placeholder={t('contacts.placeholders.notes')}
                    />
                </FormField>
            )
        }
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card-premium p-6 space-y-6">
                <section className="border border-slate-100 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('contacts.sections.basic')}</p>
                            <p className="text-sm text-slate-500 mt-1">{t('contacts.sections.basicHelper')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label={t('contacts.fields.name')} required error={errors.full_name}>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(event) => handleChange('full_name', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.name')}
                            />
                        </FormField>

                        <FormField label={t('contacts.fields.mobilePhone')} required error={errors.mobile_phone}>
                            <input
                                type="tel"
                                value={formData.mobile_phone}
                                onChange={(event) => handleChange('mobile_phone', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.mobilePhone')}
                            />
                        </FormField>

                        <FormField label={t('contacts.fields.city')} helper={t('contacts.helpers.optional')}>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(event) => handleChange('city', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.city')}
                            />
                        </FormField>

                        <FormField label={t('contacts.fields.state')} helper={t('contacts.helpers.optional')}>
                            <input
                                type="text"
                                value={formData.state}
                                onChange={(event) => handleChange('state', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.state')}
                            />
                        </FormField>

                        <FormField label={t('contacts.fields.status')}>
                            <select
                                value={formData.contact_status}
                                onChange={(event) => handleChange('contact_status', event.target.value)}
                                className={inputClassName}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {t(statusLabelMap[option] || 'status.unknown')}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField
                            label={t('contacts.fields.assignedTo', { defaultValue: term('advisor') })}
                            required={assignedRequired}
                            error={errors.assigned_to_user_id}
                        >
                            {assignedDisabled ? (
                                <input
                                    type="text"
                                    value={userName}
                                    className={`${inputClassName} bg-slate-100 text-slate-500`}
                                    readOnly
                                />
                            ) : (
                                <UserSelector
                                    value={formData.assigned_to_user_id}
                                    onChange={(value) => handleChange('assigned_to_user_id', String(value))}
                                    onlyActive
                                    placeholder={t('contacts.placeholders.searchAssignee', { defaultValue: term('advisor') })}
                                />
                            )}
                        </FormField>

                        <FormField label={t('contacts.fields.email')} helper={t('contacts.helpers.optional')}>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(event) => handleChange('email', event.target.value)}
                                className={inputClassName}
                                placeholder={t('contacts.placeholders.email')}
                            />
                        </FormField>
                    </div>
                </section>

                <Accordion items={accordionItems} />
            </div>

            <div className="flex justify-end gap-3">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="btn-secondary !py-2 !px-5">
                        {t('common.cancel')}
                    </button>
                )}
                <button type="submit" disabled={loading} className="btn-primary !py-2 !px-5">
                    {loading ? t('common.saving') : t('common.save')}
                </button>
            </div>
        </form>
    );
};

export default ContactoForm;
