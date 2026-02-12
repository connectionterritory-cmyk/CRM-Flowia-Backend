import React, { useEffect, useMemo, useState } from 'react';
import { Search, User } from 'lucide-react';
import api from '../../services/api';

const formatContactLine = (contact) => {
    const city = contact.city || contact.Ciudad || '';
    const phone = contact.mobilePhone || contact.mobile_phone || contact.Telefono || '';
    const email = contact.email || contact.Email || '';
    return {
        name: contact.fullName || contact.NombreCompleto || contact.name || '-',
        phone,
        email,
        city,
        id: contact.id || contact.ContactoID
    };
};

const ContactSearchAutocomplete = ({
    value,
    onSelect,
    placeholder = 'Buscar contacto',
    disabled = false
}) => {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults([]);
            return undefined;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setLoading(true);
                const response = await api.get('/contacts/search', {
                    params: { q: query.trim(), limit: 10 },
                    signal: controller.signal
                });
                const mapped = (response.data || []).map(formatContactLine);
                setResults(mapped);
            } catch (error) {
                if (error.name !== 'CanceledError') {
                    setResults([]);
                }
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [query]);

    const emptyLabel = useMemo(() => {
        if (loading) return 'Buscando...';
        if (!query) return 'Escribe para buscar';
        return 'Sin resultados';
    }, [loading, query]);

    return (
        <div className="relative">
            <div className="flex items-center gap-2 border border-gray-300 rounded-md bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200">
                <Search size={16} className="text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-sm text-gray-700 outline-none"
                    disabled={disabled}
                />
            </div>

            {open && (
                <div className="absolute z-30 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">{emptyLabel}</div>
                    ) : (
                        results.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    onSelect?.(item);
                                    setQuery(item.name);
                                    setOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                                        <User size={14} />
                                    </span>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-700">{item.name}</div>
                                        <div className="text-xs text-gray-400">
                                            {[item.phone, item.city].filter(Boolean).join(' | ') || '-'}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ContactSearchAutocomplete;
