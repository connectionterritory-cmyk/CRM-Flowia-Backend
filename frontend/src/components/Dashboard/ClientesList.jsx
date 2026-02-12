import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Phone, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const ClientesList = () => {
    const { t } = useTranslation();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopClients = async () => {
            try {
                const response = await api.get('/clientes');
                const sorted = response.data
                    .sort((a, b) => (b.SaldoTotal || 0) - (a.SaldoTotal || 0))
                    .slice(0, 5); // Limit to top 5 for cleaner dashboard
                setClientes(sorted);
            } catch (error) {
                console.error('Error fetching clients:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopClients();
    }, []);

    const getRandomColor = (name) => {
        const colors = [
            'bg-indigo-100 text-indigo-600',
            'bg-emerald-100 text-emerald-600',
            'bg-amber-100 text-amber-600',
            'bg-rose-100 text-rose-600',
            'bg-cyan-100 text-cyan-600',
            'bg-violet-100 text-violet-600'
        ];
        const charCode = name.charCodeAt(0) || 0;
        return colors[charCode % colors.length];
    };

    if (loading) return (
        <div className="card-premium h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="card-premium h-full w-full flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">{t('dashboard.topDebtorsTitle')}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">{t('dashboard.topDebtorsSubtitle')}</p>
                </div>
                <Link to="/clientes" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                    {t('dashboard.viewDirectory')}
                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10">{t('tables.name')}</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('dashboard.totalDebt')}</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hidden sm:table-cell">{t('tables.status')}</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tables.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {clientes.map((cliente) => (
                            <tr key={cliente.ClienteID} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-4 pl-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110 ${getRandomColor(cliente.Nombre)}`}>
                                            {cliente.Nombre.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm tracking-tight">{cliente.Nombre}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{cliente.TipoCliente || t('dashboard.general')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <span className="font-black text-slate-800 text-sm tracking-tight block">
                                        {formatCurrency(cliente.SaldoTotal)}
                                    </span>
                                    {cliente.SaldoVencido > 0 && (
                                        <span className="text-[10px] font-bold text-rose-500 block mt-0.5">
                                            {t('dashboard.overdueAmount', { amount: formatCurrency(cliente.SaldoVencido) })}
                                        </span>
                                    )}
                                </td>
                                <td className="px-8 py-4 text-center hidden sm:table-cell">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${cliente.SaldoVencido > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {cliente.SaldoVencido > 0 ? t('dashboard.overdueLabel') : t('dashboard.currentLabel')}
                                    </span>
                                </td>
                                <td className="px-8 py-4">
                                    <div className="flex justify-center items-center gap-2">
                                        <Link
                                            to={`/clientes/${cliente.ClienteID}`}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 shadow-sm transition-all"
                                        >
                                            <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientesList;
