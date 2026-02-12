import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../services/api';

const UserFormPage = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [assignmentError, setAssignmentError] = useState('');
    const [sellerOptions, setSellerOptions] = useState([]);
    const [assignedSellerIds, setAssignedSellerIds] = useState([]);
    const [formData, setFormData] = useState({
        full_name: '',
        mobile: '',
        email: '',
        seller_code: '',
        role: 'ASESOR',
        level: 'ASESOR',
        start_date: '',
        photo_url: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        country: 'USA',
        is_active: true
    });
    const [errors, setErrors] = useState({});

    const isTelemarketingRole = formData.role === 'TELEMARKETING';

    const mapUserRow = (user) => ({
        id: user.id || user.UsuarioID || user.user_id,
        name: user.full_name || user.Nombre || user.name,
        role: user.role || user.Rol
    });

    const loadUser = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users/${id}`);
            const data = response.data;
            setFormData({
                full_name: data.full_name || data.Nombre || '',
                mobile: data.mobile || data.Telefono || '',
                email: data.email || data.Email || '',
                seller_code: data.seller_code || data.Codigo || '',
                role: data.role || data.Rol || 'ASESOR',
                level: data.level || data.Nivel || 'ASESOR',
                start_date: data.start_date || data.FechaInicio || '',
                photo_url: data.photo_url || data.FotoUrl || '',
                address1: data.address1 || data.Address1 || '',
                address2: data.address2 || data.Address2 || '',
                city: data.city || data.Ciudad || '',
                state: data.state || data.Estado || '',
                zip: data.zip || data.Zipcode || '',
                country: data.country || data.Pais || 'USA',
                is_active: Boolean(data.is_active ?? data.Activo)
            });
        } catch (err) {
            setError(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const loadAssignableSellers = async () => {
        try {
            const [asesoresResponse, vendedoresResponse] = await Promise.all([
                api.get('/users', { params: { role: 'ASESOR', active: 1 } }),
                api.get('/users', { params: { role: 'VENDEDOR', active: 1 } })
            ]);
            const asesores = (asesoresResponse.data || []).map(mapUserRow);
            const vendedores = (vendedoresResponse.data || []).map(mapUserRow);
            const merged = [...asesores, ...vendedores]
                .filter((item) => item.id && item.name);
            merged.sort((a, b) => a.name.localeCompare(b.name));
            setSellerOptions(merged);
        } catch (err) {
            setSellerOptions([]);
        }
    };

    const loadTelemarketingAssignments = async (userId) => {
        if (!userId) return;
        try {
            const response = await api.get(`/users/${userId}/assignments`);
            const ids = (response.data || [])
                .map((row) => row.id || row.SellerUserID)
                .filter(Boolean);
            setAssignedSellerIds(ids.map((value) => String(value)));
        } catch (err) {
            setAssignedSellerIds([]);
        }
    };

    useEffect(() => {
        if (isEditing) {
            loadUser();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isTelemarketingRole) {
            setAssignedSellerIds([]);
            setAssignmentError('');
            return;
        }

        loadAssignableSellers();
        if (isEditing) {
            loadTelemarketingAssignments(id);
        }
    }, [isTelemarketingRole, isEditing, id]);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const nextErrors = {};
        if (!formData.full_name.trim()) {
            nextErrors.full_name = t('common.required', { field: t('users.fields.full_name') });
        }
        if (!formData.mobile.trim()) {
            nextErrors.mobile = t('common.required', { field: t('users.fields.mobile') });
        }
        if (!isTelemarketingRole && !formData.seller_code.trim()) {
            nextErrors.seller_code = t('common.required', { field: t('users.fields.seller_code') });
        }
        if (!formData.role) {
            nextErrors.role = t('common.required', { field: t('users.fields.role') });
        }
        return nextErrors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            setLoading(true);
            setError('');
            setAssignmentError('');
            const payload = {
                full_name: formData.full_name.trim(),
                mobile: formData.mobile.trim(),
                email: formData.email.trim() || null,
                seller_code: isTelemarketingRole && !formData.seller_code.trim()
                    ? null
                    : formData.seller_code.trim(),
                role: formData.role,
                level: formData.level,
                start_date: formData.start_date || null,
                photo_url: formData.photo_url.trim() || null,
                address1: formData.address1.trim() || null,
                address2: formData.address2.trim() || null,
                city: formData.city.trim() || null,
                state: formData.state.trim() || null,
                zip: formData.zip.trim() || null,
                country: formData.country.trim() || 'USA',
                is_active: formData.is_active ? 1 : 0
            };

            let userId = id;
            if (isEditing) {
                const response = await api.put(`/users/${id}`, payload);
                const data = response.data || {};
                userId = data.id || data.UsuarioID || id;
            } else {
                const response = await api.post('/users', payload);
                const data = response.data || {};
                userId = data.id || data.UsuarioID || data.user_id || data.UserUUID;
            }

            if (isTelemarketingRole && userId) {
                await api.put(`/users/${userId}/assignments`, {
                    sellerIds: assignedSellerIds
                });
            }

            toast.success(isEditing ? 'Usuario actualizado' : 'Usuario creado');
            navigate('/equipo');
        } catch (err) {
            const apiError = err.response?.data?.error || t('common.error');
            if (String(apiError).includes('asign')) {
                setAssignmentError(apiError);
            } else {
                setError(apiError);
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClassName = 'input-field h-11 px-4';

    const roleOptions = useMemo(() => ([
        { value: 'ADMIN', label: t('roles.admin') },
        { value: 'DISTRIBUIDOR', label: t('roles.distributor') },
        { value: 'GERENTE', label: t('roles.manager') },
        { value: 'ASESOR', label: t('roles.advisor') },
        { value: 'TELEMARKETING', label: t('roles.telemarketing') }
    ]), [t]);

    const levelOptions = useMemo(() => ([
        { value: 'DISTRIBUIDOR', label: t('levels.distributor') },
        { value: 'GERENTE', label: t('levels.manager') },
        { value: 'ASESOR', label: t('levels.advisor') },
        { value: 'OTRO', label: t('levels.other') }
    ]), [t]);

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
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
                        {isEditing ? t('users.editTitle') : t('users.newTitle')}
                    </h1>
                    <p className="text-sm text-slate-500">{t('users.subtitle')}</p>
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-rose-500 font-semibold">{error}</div>}
            {assignmentError && <div className="mb-4 text-sm text-rose-500 font-semibold">{assignmentError}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <section className="card-premium p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.full_name')}</label>
                            <input
                                value={formData.full_name}
                                onChange={(event) => handleChange('full_name', event.target.value)}
                                className={`${inputClassName} mt-2`}
                                placeholder={t('users.placeholders.full_name')}
                            />
                            {errors.full_name && <p className="text-xs text-rose-600 mt-1">{errors.full_name}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.mobile')}</label>
                            <input
                                value={formData.mobile}
                                onChange={(event) => handleChange('mobile', event.target.value)}
                                className={`${inputClassName} mt-2`}
                                placeholder={t('users.placeholders.mobile')}
                            />
                            {errors.mobile && <p className="text-xs text-rose-600 mt-1">{errors.mobile}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.email')}</label>
                            <input
                                value={formData.email}
                                onChange={(event) => handleChange('email', event.target.value)}
                                className={`${inputClassName} mt-2`}
                                placeholder={t('users.placeholders.email')}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.seller_code')}</label>
                            <input
                                value={formData.seller_code}
                                onChange={(event) => handleChange('seller_code', event.target.value)}
                                className={`${inputClassName} mt-2`}
                                placeholder={isTelemarketingRole ? 'Opcional para telemarketing' : t('users.placeholders.seller_code')}
                            />
                            {errors.seller_code && <p className="text-xs text-rose-600 mt-1">{errors.seller_code}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.role')}</label>
                            <select
                                value={formData.role}
                                onChange={(event) => handleChange('role', event.target.value)}
                                className={`${inputClassName} mt-2 bg-white`}
                            >
                                {roleOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            {errors.role && <p className="text-xs text-rose-600 mt-1">{errors.role}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.level')}</label>
                            <select
                                value={formData.level}
                                onChange={(event) => handleChange('level', event.target.value)}
                                className={`${inputClassName} mt-2 bg-white`}
                            >
                                {levelOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.start_date')}</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(event) => handleChange('start_date', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                    </div>
                </section>

                {isTelemarketingRole && (
                    <section className="card-premium p-6 space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asignaciones de vendedores</p>
                            <p className="text-sm text-slate-500 mt-1">Selecciona los vendedores que este telemarketing puede gestionar.</p>
                        </div>
                        {sellerOptions.length === 0 ? (
                            <div className="text-sm text-slate-500">No hay vendedores activos disponibles.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sellerOptions.map((seller) => {
                                    const checked = assignedSellerIds.includes(String(seller.id));
                                    return (
                                        <label key={seller.id} className={`flex items-center gap-3 p-3 rounded-xl border ${checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(event) => {
                                                    setAssignedSellerIds((prev) => {
                                                        const next = new Set(prev);
                                                        if (event.target.checked) {
                                                            next.add(String(seller.id));
                                                        } else {
                                                            next.delete(String(seller.id));
                                                        }
                                                        return Array.from(next);
                                                    });
                                                }}
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">{seller.name}</p>
                                                <p className="text-xs text-slate-400">{seller.role}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                <section className="card-premium p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.address1')}</label>
                            <input
                                value={formData.address1}
                                onChange={(event) => handleChange('address1', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.address2')}</label>
                            <input
                                value={formData.address2}
                                onChange={(event) => handleChange('address2', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.city')}</label>
                            <input
                                value={formData.city}
                                onChange={(event) => handleChange('city', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.state')}</label>
                            <input
                                value={formData.state}
                                onChange={(event) => handleChange('state', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.zip')}</label>
                            <input
                                value={formData.zip}
                                onChange={(event) => handleChange('zip', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.country')}</label>
                            <input
                                value={formData.country}
                                onChange={(event) => handleChange('country', event.target.value)}
                                className={`${inputClassName} mt-2`}
                            />
                        </div>
                    </div>
                </section>

                <section className="card-premium p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-semibold text-slate-500">{t('users.fields.photo_url')}</label>
                            <input
                                value={formData.photo_url}
                                onChange={(event) => handleChange('photo_url', event.target.value)}
                                className={`${inputClassName} mt-2`}
                                placeholder={t('users.placeholders.photo_url')}
                            />
                        </div>
                        <div className="flex items-center gap-3 mt-6">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(event) => handleChange('is_active', event.target.checked)}
                            />
                            <span className="text-sm text-slate-600">{t('users.fields.is_active')}</span>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/equipo')} className="btn-secondary !py-2 !px-5">
                        {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="btn-primary !py-2 !px-5">
                        {loading ? t('common.saving') : t('buttons.saveUser')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserFormPage;
