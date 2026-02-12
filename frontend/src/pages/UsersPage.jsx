import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getRoleLabelKey } from '../utils/roles';

const UsersPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('1');

    const fetchUsers = async (params) => {
        try {
            const response = await api.get('/users', { params });
            return response.data || [];
        } catch (error) {
            const response = await api.get('/usuarios', { params });
            return response.data || [];
        }
    };

    useEffect(() => {
        let mounted = true;
        const timeout = setTimeout(async () => {
            try {
                setLoading(true);
                setError('');
                const params = {
                    q: search.trim() || undefined,
                    role: roleFilter || undefined,
                    active: activeFilter
                };
                const data = await fetchUsers(params);
                if (mounted) setUsers(data);
            } catch (err) {
                if (mounted) setError(t('common.error'));
            } finally {
                if (mounted) setLoading(false);
            }
        }, 250);

        return () => {
            mounted = false;
            clearTimeout(timeout);
        };
    }, [search, roleFilter, activeFilter, t]);

    const levelMap = {
        DISTRIBUIDOR: 'levels.distributor',
        GERENTE: 'levels.manager',
        ASESOR: 'levels.advisor',
        OTRO: 'levels.other'
    };

    const roleLabel = (role) => t(getRoleLabelKey(role), { defaultValue: role || '-' });
    const levelLabel = (level) => t(levelMap[level] || 'levels.other', { defaultValue: level || '-' });

    const tableRows = useMemo(() => users.map((user) => ({
        id: user.id || user.UsuarioID || user.user_id,
        name: user.full_name || user.Nombre || user.name,
        sellerCode: user.seller_code || user.Codigo,
        role: user.role || user.Rol,
        level: user.level || user.Nivel,
        mobile: user.mobile || user.Telefono,
        active: user.is_active ?? user.Activo
    })), [users]);

    return (
        <div className="workspace-container pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{t('users.title')}</h1>
                    <p className="text-sm text-slate-500">{t('users.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/equipo/new')}
                    className="btn-primary !py-2 !px-4"
                >
                    {t('buttons.newUser')}
                </button>
            </div>

            <div className="card-premium p-6 space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="input-field h-11 px-4"
                        placeholder={t('users.placeholders.search')}
                    />
                    <select
                        value={roleFilter}
                        onChange={(event) => setRoleFilter(event.target.value)}
                        className="input-field h-11 px-4 bg-white"
                    >
                        <option value="">{t('users.filters.allRoles')}</option>
                        <option value="ADMIN">{t('roles.admin')}</option>
                        <option value="DISTRIBUIDOR">{t('roles.distributor')}</option>
                        <option value="GERENTE">{t('roles.manager')}</option>
                        <option value="ASESOR">{t('roles.advisor')}</option>
                        <option value="TELEMARKETING">{t('roles.telemarketing')}</option>
                        <option value="VENDEDOR">{t('roles.advisor')}</option>
                    </select>
                    <select
                        value={activeFilter}
                        onChange={(event) => setActiveFilter(event.target.value)}
                        className="input-field h-11 px-4 bg-white"
                    >
                        <option value="1">{t('common.active')}</option>
                        <option value="0">{t('common.inactive')}</option>
                        <option value="">{t('users.filters.allStatuses')}</option>
                    </select>
                </div>
            </div>

            {loading && (
                <div className="p-8 text-center text-slate-500 font-bold">{t('common.loading')}</div>
            )}
            {!loading && error && (
                <div className="p-6 text-center text-rose-500 font-semibold">{error}</div>
            )}
            {!loading && !error && tableRows.length === 0 && (
                <div className="card-premium p-10 text-center">
                    <p className="text-lg font-black text-slate-800">{t('users.emptyTitle')}</p>
                    <p className="text-sm text-slate-500 mt-2">{t('users.emptySubtitle')}</p>
                </div>
            )}

            {!loading && !error && tableRows.length > 0 && (
                <>
                    <div className="md:hidden space-y-4">
                        {tableRows.map((user) => (
                            <div key={user.id} className="card-premium p-5 space-y-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                    <p className="text-xs text-slate-400">{user.sellerCode}</p>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {roleLabel(user.role)} · {levelLabel(user.level)}
                                </div>
                                <div className="text-xs text-slate-500">{user.mobile || '-'}</div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {user.active ? t('common.active') : t('common.inactive')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/equipo/${user.id}`)}
                                        className="text-xs font-bold text-indigo-600"
                                    >
                                        {t('buttons.editUser')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block card-premium p-6 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="text-left py-2">{t('users.fields.full_name')}</th>
                                    <th className="text-left py-2">{t('users.fields.seller_code')}</th>
                                    <th className="text-left py-2">{t('users.fields.role')}</th>
                                    <th className="text-left py-2">{t('users.fields.level')}</th>
                                    <th className="text-left py-2">{t('users.fields.mobile')}</th>
                                    <th className="text-left py-2">{t('users.fields.is_active')}</th>
                                    <th className="text-right py-2">{t('users.fields.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((user) => (
                                    <tr key={user.id} className="border-t border-slate-100">
                                        <td className="py-3 font-semibold text-slate-700">{user.name}</td>
                                        <td className="py-3 text-slate-500">{user.sellerCode}</td>
                                        <td className="py-3 text-slate-500">{roleLabel(user.role)}</td>
                                        <td className="py-3 text-slate-500">{levelLabel(user.level)}</td>
                                        <td className="py-3 text-slate-500">{user.mobile || '-'}</td>
                                        <td className="py-3">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.active ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/equipo/${user.id}`)}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                            >
                                                {t('buttons.editUser')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default UsersPage;
