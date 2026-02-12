import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ChevronRight, Phone, Mail, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';

const ClientesTable = ({ clients, loading = false }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');

    const statusLabels = useMemo(() => ({
        Activo: t('customers.status.active'),
        Moroso: t('customers.status.overdue'),
        Inactivo: t('customers.status.inactive')
    }), [t]);

    const filteredClients = clients.filter(client => {
        const matchesSearch =
            client.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.Email && client.Email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (client.Telefono && client.Telefono.includes(searchTerm));

        const matchesStatus = filterStatus === 'Todos' || client.Estado === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const showEmptyState = !loading && clients.length === 0;
    const showNoResults = !loading && clients.length > 0 && filteredClients.length === 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('customers.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        disabled={loading}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-600 cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        <option value="Todos">{t('customers.filters.allStatuses')}</option>
                        <option value="Activo">{t('customers.status.active')}</option>
                        <option value="Moroso">{t('customers.status.overdue')}</option>
                        <option value="Inactivo">{t('customers.status.inactive')}</option>
                    </select>

                    <Link
                        to="/clientes/new"
                        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm ml-auto sm:ml-0 ${loading ? 'pointer-events-none opacity-70' : ''}`}
                    >
                        <UserPlus size={16} />
                        {t('customers.newCustomer')}
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[65dvh] sm:max-h-none">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">{t('customers.columns.name')}</th>
                            <th className="px-6 py-3 hidden md:table-cell">{t('customers.columns.location')}</th>
                            <th className="px-6 py-3 text-center">{t('customers.columns.status')}</th>
                            <th className="px-6 py-3 text-right">{t('customers.columns.balance')}</th>
                            <th className="px-6 py-3 text-center">{t('customers.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <tr key={`cliente-skeleton-${index}`} className="animate-pulse">
                                    <td className="px-6 py-4">
                                        <div className="h-4 w-40 bg-gray-100 rounded"></div>
                                        <div className="mt-2 space-y-1">
                                            <div className="h-3 w-28 bg-gray-100 rounded"></div>
                                            <div className="h-3 w-36 bg-gray-100 rounded"></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <div className="h-4 w-48 bg-gray-100 rounded"></div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="h-6 w-20 bg-gray-100 rounded-full mx-auto"></div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="h-4 w-20 bg-gray-100 rounded ml-auto"></div>
                                        <div className="h-3 w-16 bg-gray-100 rounded ml-auto mt-2"></div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="h-9 w-9 bg-gray-100 rounded-lg mx-auto"></div>
                                    </td>
                                </tr>
                            ))
                        ) : filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                                <tr key={client.ClienteID} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{client.Nombre}</div>
                                        <div className="text-xs text-gray-400 mt-1 flex flex-col gap-0.5">
                                            {client.Telefono && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={10} /> {client.Telefono}
                                                </span>
                                            )}
                                            {client.Email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail size={10} /> {client.Email}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell text-gray-600">
                                        {client.Ciudad}, {client.Direccion}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${client.Estado === 'Activo' ? 'bg-green-100 text-green-700' :
                                                client.Estado === 'Moroso' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>
                                            {statusLabels[client.Estado] || client.Estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-medium text-gray-900">{formatCurrency(client.SaldoTotal || 0)}</div>
                                        {client.SaldoVencido > 0 && (
                                            <div className="text-xs text-red-600 font-medium mt-0.5">
                                                {t('customers.overdueAmount', { amount: formatCurrency(client.SaldoVencido) })}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link
                                            to={`/clientes/${client.ClienteID}`}
                                            className="inline-flex p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <ChevronRight size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : showEmptyState ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                            <UserPlus size={22} />
                                        </div>
                                        <div>
                                            <p className="text-gray-700 font-semibold">{t('customers.emptyTitle')}</p>
                                            <p className="text-sm text-gray-400 mt-1">{t('customers.emptyDesc')}</p>
                                        </div>
                                        <Link
                                            to="/clientes/new"
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            <UserPlus size={16} />
                                            {t('customers.newCustomer')}
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ) : showNoResults ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                            <Search size={20} />
                                        </div>
                                        <p className="text-gray-500 font-semibold">{t('customers.noResultsTitle')}</p>
                                        <p className="text-xs text-gray-400">{t('customers.noResultsDesc')}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400"></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
                {loading ? (
                    <div className="h-3 w-40 bg-gray-100 rounded animate-pulse"></div>
                ) : (
                    <span>{t('customers.showing', { shown: filteredClients.length, total: clients.length })}</span>
                )}
            </div>
        </div>
    );
};

export default ClientesTable;
