import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Search, Users, UserCheck, UserPlus, UploadCloud } from 'lucide-react';
import CreateOpportunityModal from '../components/modals/CreateOpportunityModal.jsx';
import ProspectImportModal from '../components/modals/ProspectImportModal.jsx';
import api from '../services/api';
import { normalizeNoDice } from '../utils/formatters';

const ContactosPage = () => {
    const [contactos, setContactos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarConvertidos, setMostrarConvertidos] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        city: '',
        state: '',
        sellerId: '',
        origin: ''
    });
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showOpportunityModal, setShowOpportunityModal] = useState(false);
    const [opportunityContact, setOpportunityContact] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const fetchContactos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/contactos', {
                params: { convertido: mostrarConvertidos }
            });
            setContactos(response.data || []);
        } catch (error) {
            console.error('Error al cargar contactos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContactos();
    }, [mostrarConvertidos]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filters, limit]);

    const filteredContactos = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const cityFilter = filters.city.trim().toLowerCase();
        const stateFilter = filters.state.trim().toLowerCase();
        const originFilter = filters.origin.trim().toLowerCase();

        return contactos.filter((contacto) => {
            const contactCity = String(contacto.city || contacto.Ciudad || '').toLowerCase();
            const contactState = String(contacto.state || contacto.Estado || '').toLowerCase();
            const contactOrigin = String(contacto.source_name || contacto.source || contacto.origin_type || contacto.OrigenFuente || '').toLowerCase();
            const contactSellerId = String(contacto.assigned_to_user_id || '');

            if (cityFilter && !contactCity.includes(cityFilter)) return false;
            if (stateFilter && !contactState.includes(stateFilter)) return false;
            if (originFilter && !contactOrigin.includes(originFilter)) return false;
            if (filters.sellerId && contactSellerId !== String(filters.sellerId)) return false;

            const values = [
                contacto.full_name || contacto.NombreCompleto,
                contacto.mobile_phone || contacto.Telefono,
                contacto.Email,
                contacto.city || contacto.Ciudad,
                contacto.state || contacto.Estado,
                contacto.source_name || contacto.source || contacto.origin_type || contacto.OrigenFuente,
                contacto.ReferidoPorNombre,
                contacto.AssignedToNombre
            ].filter(Boolean).join(' ').toLowerCase();
            return term ? values.includes(term) : true;
        });
    }, [contactos, searchTerm, filters]);

    const paginatedContactos = useMemo(() => {
        if (!limit || limit <= 0) return filteredContactos;
        const start = (page - 1) * limit;
        return filteredContactos.slice(start, start + limit);
    }, [filteredContactos, page, limit]);

    const handleClearSearch = () => setSearchTerm('');

    const totalCount = contactos.length;
    const visibleCount = filteredContactos.length;
    const todayCount = contactos.filter((contacto) => {
        const created = contacto.CreatedAt ? new Date(contacto.CreatedAt) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        const now = new Date();
        return created.toDateString() === now.toDateString();
    }).length;
    const noSellerCount = contactos.filter((contacto) => !contacto.assigned_to_user_id).length;
    const noPhoneCount = contactos.filter((contacto) => !contacto.mobile_phone && !contacto.Telefono).length;

    const getInitials = (name) => {
        if (!name) return '--';
        const parts = name.trim().split(' ').filter(Boolean);
        const initials = parts.slice(0, 2).map((part) => part[0]).join('');
        return initials.toUpperCase();
    };

    const normalizePhoneDigits = (value) => {
        if (!value) return '';
        const digits = String(value).replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
        return digits;
    };


    const statusKeyMap = {
        NUEVO: 'new',
        CONTACTADO: 'contacted',
        CALIFICADO: 'qualified',
        CITA_AGENDADA: 'appointmentScheduled',
        NO_MOLESTAR: 'doNotContact',
        NO_INTERESA: 'notInterested'
    };

    const statusStyles = {
        NUEVO: 'bg-sky-100 text-sky-700 ring-sky-200/60',
        CONTACTADO: 'bg-amber-100 text-amber-700 ring-amber-200/60',
        CALIFICADO: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60',
        CITA_AGENDADA: 'bg-teal-100 text-teal-700 ring-teal-200/60',
        NO_MOLESTAR: 'bg-rose-100 text-rose-700 ring-rose-200/60',
        NO_INTERESA: 'bg-slate-200 text-slate-700 ring-slate-300/60'
    };

    const statusOptions = Object.keys(statusKeyMap);

    const handleStatusChange = async (contactoId, status) => {
        try {
            await api.patch(`/contactos/${contactoId}`, { contact_status: status });
            setContactos((prev) => prev.map((item) => (
                item.ContactoID === contactoId ? { ...item, contact_status: status } : item
            )));
        } catch (error) {
            alert(error.response?.data?.error || 'No se pudo actualizar estado');
        }
    };

    const handleCreateOpportunity = async (contacto) => {
        setOpportunityContact(contacto);
        setShowOpportunityModal(true);
    };

    const uniqueOptions = useMemo(() => {
        const cities = new Set();
        const states = new Set();
        const origins = new Set();
        const sellers = new Map();
        contactos.forEach((contacto) => {
            const city = contacto.city || contacto.Ciudad;
            const state = contacto.state || contacto.Estado;
            const origin = contacto.source_name || contacto.source || contacto.origin_type || contacto.OrigenFuente;
            const sellerId = contacto.assigned_to_user_id;
            const sellerName = contacto.AssignedToNombre;

            if (city) cities.add(city);
            if (state) states.add(state);
            if (origin) origins.add(origin);
            if (sellerId && sellerName) sellers.set(String(sellerId), sellerName);
        });

        return {
            cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
            states: Array.from(states).sort((a, b) => a.localeCompare(b)),
            origins: Array.from(origins).sort((a, b) => a.localeCompare(b)),
            sellers: Array.from(sellers.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
        };
    }, [contactos]);

    const existingPhones = useMemo(() => {
        const set = new Set();
        contactos.forEach((contacto) => {
            const phone = normalizePhoneDigits(contacto.mobile_phone || contacto.Telefono || '');
            if (phone) set.add(phone);
        });
        return set;
    }, [contactos]);

    const totalPages = limit > 0 ? Math.max(1, Math.ceil(visibleCount / limit)) : 1;

    if (loading) {
        return <div className="p-8 text-center text-slate-500 font-bold">{t('common.loading')}</div>;
    }

    return (
        <div className="workspace-container animate-in fade-in slide-in-from-bottom-2 pb-16">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        {t('contacts.title')}
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t('contacts.title')}</h1>
                    <p className="text-sm text-slate-500 max-w-xl">{t('contacts.subtitle')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-200/60">
                        <Search size={16} className="text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Nombre, celular o email"
                            className="text-sm text-slate-600 outline-none bg-transparent w-44 md:w-72"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600"
                            >
                                {t('common.clear')}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={filters.city}
                            onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
                            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        >
                            <option value="">Ciudad</option>
                            {uniqueOptions.cities.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <select
                            value={filters.state}
                            onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value }))}
                            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        >
                            <option value="">Estado</option>
                            {uniqueOptions.states.map((state) => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                        <select
                            value={filters.sellerId}
                            onChange={(event) => setFilters((prev) => ({ ...prev, sellerId: event.target.value }))}
                            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        >
                            <option value="">Vendedor</option>
                            {uniqueOptions.sellers.map((seller) => (
                                <option key={seller.id} value={seller.id}>{seller.name}</option>
                            ))}
                        </select>
                        <select
                            value={filters.origin}
                            onChange={(event) => setFilters((prev) => ({ ...prev, origin: event.target.value }))}
                            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        >
                            <option value="">Origen</option>
                            {uniqueOptions.origins.map((origin) => (
                                <option key={origin} value={origin}>{origin}</option>
                            ))}
                        </select>
                        {(filters.city || filters.state || filters.sellerId || filters.origin) && (
                            <button
                                type="button"
                                onClick={() => setFilters({ city: '', state: '', sellerId: '', origin: '' })}
                                className="text-[10px] font-black text-emerald-500 hover:text-emerald-700 uppercase tracking-widest"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm text-sm text-slate-600">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {mostrarConvertidos ? t('contacts.list.hideConverted') : t('contacts.list.showConverted')}
                        </span>
                        <span className="relative inline-flex h-5 w-10 items-center">
                            <input
                                type="checkbox"
                                checked={mostrarConvertidos}
                                onChange={(event) => setMostrarConvertidos(event.target.checked)}
                                className="peer sr-only"
                            />
                            <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-400"></span>
                            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
                        </span>
                    </label>
                    <button
                        type="button"
                        onClick={() => navigate('/contactos/new')}
                        className="btn-primary !py-2 !px-4 inline-flex items-center gap-2"
                    >
                        <UserPlus size={16} />
                        {t('buttons.newContact')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2"
                    >
                        <UploadCloud size={16} />
                        Importar (CSV/TXT o Pegar lista)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contactos totales</p>
                        <p className="text-2xl font-black text-slate-800">{totalCount}</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <UserCheck size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Nuevos hoy</p>
                        <p className="text-2xl font-black text-slate-800">{todayCount}</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sin asesor</p>
                        <p className="text-2xl font-black text-slate-800">{noSellerCount}</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Search size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sin telefono</p>
                        <p className="text-2xl font-black text-slate-800">{noPhoneCount}</p>
                    </div>
                </div>
            </div>

            {filteredContactos.length === 0 ? (
                <div className="card-premium p-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Users size={22} />
                    </div>
                    <p className="text-lg font-black text-slate-800">
                        {searchTerm ? t('common.noResults') : t('contacts.list.emptyTitle')}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        {searchTerm ? t('contacts.list.emptyDesc') : t('contacts.list.emptyDesc')}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/contactos/new')}
                        className="btn-primary mt-6 inline-flex items-center gap-2"
                    >
                        <UserPlus size={16} />
                        {t('buttons.newContact')}
                    </button>
                </div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-slate-50/70">
                        <div className="text-sm text-slate-500">
                            {t('contacts.list.summaryVisible')}: <span className="font-semibold text-slate-700">{visibleCount}</span>
                        </div>
                        {searchTerm && (
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                                {t('common.search')}: "{searchTerm}"
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(event) => setLimit(Number(event.target.value))}
                                className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-1"
                            >
                                {[10, 20, 50, 100].map((value) => (
                                    <option key={value} value={value}>{value} filas</option>
                                ))}
                                <option value={0}>Todos</option>
                            </select>
                            <div className="text-xs text-slate-400">
                                Pagina {page} / {totalPages}
                            </div>
                            <button
                                type="button"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700"
                                disabled={page <= 1}
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700"
                                disabled={page >= totalPages}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase tracking-widest bg-white">
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-3 px-6">{t('contacts.fields.name')}</th>
                                    <th className="text-left py-3 px-6">{t('contacts.fields.mobilePhone')}</th>
                                    <th className="text-left py-3 px-6">{t('contacts.fields.cityState')}</th>
                                    <th className="text-left py-3 px-6">{t('contacts.fields.origin')}</th>
                                    <th className="text-left py-3 px-6">{t('contacts.fields.referredBy')}</th>
                                    <th className="text-left py-3 px-6">{t('contacts.fields.seller')}</th>
                                    <th className="text-left py-3 px-6">{t('contacts.fields.status')}</th>
                                    <th className="text-right py-3 px-6">{t('contacts.fields.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedContactos.map((contacto) => {
                                    const displayName = contacto.full_name || contacto.NombreCompleto || '-';
                                    const missingFields = [
                                        contacto.Email,
                                        contacto.address1 || contacto.Direccion,
                                        contacto.city || contacto.Ciudad,
                                        contacto.state || contacto.Estado
                                    ].filter((value) => !value);
                                    const isIncomplete = missingFields.length > 0;
                                    return (
                                        <tr
                                            key={contacto.ContactoID}
                                            className={`border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer ${isIncomplete ? 'bg-amber-50/40' : ''}`}
                                            onClick={() => navigate(`/contactos/${contacto.ContactoID}`)}
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                                                        {getInitials(displayName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-700 truncate">{displayName}</p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                                                            <span>{contacto.Email || '-'}</span>
                                                            {isIncomplete && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                                                                    Incompleto
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-slate-500 truncate max-w-[140px]">{contacto.mobile_phone || contacto.Telefono || '-'}</td>
                                            <td className="py-4 px-6 text-slate-500 truncate max-w-[160px]">
                                                {[
                                                    normalizeNoDice(contacto.city || contacto.Ciudad),
                                                    normalizeNoDice(contacto.state || contacto.Estado)
                                                ].filter(Boolean).join(', ') || '-'}
                                            </td>
                                            <td className="py-4 px-6 text-slate-500 truncate max-w-[140px]">
                                                {normalizeNoDice(contacto.source_name || contacto.source || contacto.origin_type || contacto.OrigenFuente) || '-'}
                                            </td>
                                            <td className="py-4 px-6 text-slate-500 truncate max-w-[160px]">{contacto.ReferidoPorNombre || '-'}</td>
                                            <td className="py-4 px-6 text-slate-500 truncate max-w-[160px]">{contacto.AssignedToNombre || '-'}</td>
                                            <td className="py-4 px-6">
                                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[contacto.contact_status] || 'bg-slate-100 text-slate-600 ring-slate-200/60'}`}>
                                                    <span className="h-2 w-2 rounded-full bg-current"></span>
                                                    <select
                                                        value={contacto.contact_status || 'NUEVO'}
                                                        onChange={(event) => handleStatusChange(contacto.ContactoID, event.target.value)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="bg-transparent text-xs font-semibold outline-none cursor-pointer"
                                                    >
                                                        {statusOptions.map((status) => (
                                                            <option key={status} value={status}>{t(`status.${statusKeyMap[status] || 'unknown'}`)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="relative inline-flex">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setOpenMenuId((prev) => (prev === contacto.ContactoID ? null : contacto.ContactoID));
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                    {openMenuId === contacto.ContactoID && (
                                                        <div
                                                            className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-20"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/contactos/${contacto.ContactoID}`)}
                                                                className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Ver ficha
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/contactos/${contacto.ContactoID}?edit=1`)}
                                                                className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCreateOpportunity(contacto)}
                                                                className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Nueva oportunidad
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStatusChange(contacto.ContactoID, 'NO_INTERESA')}
                                                                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                                                            >
                                                                Marcar no interesado
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <CreateOpportunityModal
                isOpen={showOpportunityModal}
                onClose={() => {
                    setShowOpportunityModal(false);
                    setOpportunityContact(null);
                }}
                onSuccess={() => {
                    setShowOpportunityModal(false);
                    setOpportunityContact(null);
                }}
                initialTab="existing"
                initialContact={opportunityContact}
            />
            <ProspectImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImported={fetchContactos}
                existingPhones={existingPhones}
            />
        </div>
    );
};

export default ContactosPage;
