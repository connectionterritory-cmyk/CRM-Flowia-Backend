import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth.jsx';

const mapUser = (item) => {
    const id = item.id || item.UsuarioID || item.user_id;
    const name = item.full_name || item.Nombre || item.name || '';
    const sellerCode = item.seller_code || item.Codigo || '';
    const mobile = item.mobile || item.Telefono || '';
    return {
        id,
        name,
        sellerCode,
        mobile,
        label: sellerCode ? `${name} · ${sellerCode}` : name
    };
};

const UserSelector = ({
    value,
    onChange,
    onlyActive = true,
    placeholder
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedLabel, setSelectedLabel] = useState('');

    const fetchUsers = async (params) => {
        try {
            const response = await api.get('/users', { params });
            const data = response.data || [];
            return data.map(mapUser).filter((item) => item.id && item.name);
        } catch (error) {
            const response = await api.get('/usuarios', { params });
            const data = response.data || [];
            return data.map(mapUser).filter((item) => item.id && item.name);
        }
    };

    useEffect(() => {
        if (!value) {
            setSelectedLabel('');
            return;
        }
        let mounted = true;
        const loadSelected = async () => {
            try {
                const response = await api.get(`/users/${value}`);
                const mapped = mapUser(response.data || {});
                if (mounted) setSelectedLabel(mapped.label || mapped.name);
            } catch (error) {
                try {
                    const response = await api.get(`/usuarios/${value}`);
                    const mapped = mapUser(response.data || {});
                    if (mounted) setSelectedLabel(mapped.label || mapped.name);
                } catch (innerError) {
                    if (mounted) setSelectedLabel('');
                }
            }
        };
        loadSelected();
        return () => {
            mounted = false;
        };
    }, [value]);

    useEffect(() => {
        if (!open) return;

        const timeout = setTimeout(async () => {
            setLoading(true);
            const params = {
                q: search.trim() || undefined,
                active: onlyActive ? 1 : undefined
            };
            const result = await fetchUsers(params);
            setUsers(result);
            setLoading(false);
        }, 200);

        return () => clearTimeout(timeout);
    }, [open, search, onlyActive]);

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        const term = search.trim().toLowerCase();
        return users.filter((item) => item.label.toLowerCase().includes(term));
    }, [users, search]);

    const handleAssignToMe = () => {
        if (!user?.id) return;
        onChange?.(user.id);
        setSearch('');
        setOpen(false);
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    className="w-full h-11 md:h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    placeholder={selectedLabel || placeholder || t('users.placeholders.search')}
                />
                <button
                    type="button"
                    onClick={handleAssignToMe}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                >
                    {t('buttons.assignToMe')}
                </button>
            </div>
            {open && (
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto bg-white">
                    {loading && (
                        <div className="px-4 py-3 text-xs text-slate-400">{t('common.loading')}</div>
                    )}
                    {!loading && filteredUsers.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-400">{t('common.noResults')}</div>
                    )}
                    {!loading && filteredUsers.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                onChange?.(item.id);
                                setSearch('');
                                setOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm transition-all border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                        >
                            <p className="font-semibold text-slate-700">{item.name}</p>
                            <p className="text-xs text-slate-400">
                                {item.sellerCode || item.mobile || ''}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserSelector;
