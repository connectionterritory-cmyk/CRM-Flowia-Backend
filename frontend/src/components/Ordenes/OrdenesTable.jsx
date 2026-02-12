import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ChevronRight, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const OrdenesTable = ({ orders, initialFilterType, loading = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState(initialFilterType || 'Todos');
    const [filterStatus, setFilterStatus] = useState('Todos');

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            (order.NumeroOrden && order.NumeroOrden.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (order.ClienteNombre && order.ClienteNombre.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = filterType === 'Todos' || order.TipoOrden === filterType;
        const matchesStatus = filterStatus === 'Todos' || order.Estado === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    const showEmptyState = !loading && orders.length === 0;
    const showNoResults = !loading && orders.length > 0 && filteredOrders.length === 0;

    return (
        <div className="card-premium overflow-hidden !p-0">
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/30">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por orden o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={loading}
                        className="input-workspace !pl-12 !py-2.5 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            disabled={loading}
                            className="w-full md:w-48 bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <option value="Todos">Tipo: Todos</option>
                            <option value="Servicio">Servicio</option>
                            <option value="Venta">Venta</option>
                            <option value="Alquiler">Alquiler</option>
                        </select>
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300"></div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            disabled={loading}
                            className="w-full md:w-48 bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <option value="Todos">Estado: Todos</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Completada">Completada</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Nº Orden</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Cliente</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Fecha</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Estado</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Total</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Balance</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <tr key={`orden-skeleton-${index}`} className="animate-pulse">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                                            <div>
                                                <div className="h-4 w-24 bg-slate-100 rounded"></div>
                                                <div className="h-3 w-16 bg-slate-100 rounded mt-2"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="h-4 w-32 bg-slate-100 rounded"></div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="h-4 w-24 bg-slate-100 rounded"></div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="h-6 w-20 bg-slate-100 rounded-full mx-auto"></div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="h-4 w-16 bg-slate-100 rounded ml-auto"></div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="h-4 w-16 bg-slate-100 rounded ml-auto"></div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="h-10 w-10 bg-slate-100 rounded-xl mx-auto"></div>
                                    </td>
                                </tr>
                            ))
                        ) : filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                                <tr key={order.OrdenID} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${order.TipoOrden === 'Servicio' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {order.TipoOrden === 'Servicio' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm tracking-tighter capitalize">{order.NumeroOrden}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.TipoOrden}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Link to={`/clientes/${order.ClienteID}`} className="font-bold text-slate-700 hover:text-indigo-600 transition-colors block max-w-[200px] truncate">
                                            {order.ClienteNombre || `Cliente #${order.ClienteID}`}
                                        </Link>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                                            <Calendar size={14} className="text-slate-300" />
                                            {formatDate(order.Fecha)}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`badge ${order.Estado === 'Completada' ? 'badge-success' :
                                            order.Estado === 'Pendiente' ? 'badge-info' : 'badge-danger'
                                            }`}>
                                            {order.Estado}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-slate-800 text-sm tracking-tighter">
                                        {formatCurrency(order.Total)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`font-black text-sm tracking-tighter ${order.Balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(order.Balance)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                to={`/ordenes/${order.OrdenID}`}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                                            >
                                                <ChevronRight size={18} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : showEmptyState ? (
                            <tr>
                                <td colSpan="7" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                            <Calendar size={28} />
                                        </div>
                                        <div>
                                            <p className="text-slate-700 font-bold">No hay órdenes registradas</p>
                                            <p className="text-sm text-slate-400 mt-1">Crea tu primera orden para iniciar el seguimiento.</p>
                                        </div>
                                        <Link
                                            to="/ordenes/new"
                                            className="btn-primary !py-2.5 !px-6 shadow-indigo-600/10"
                                        >
                                            Crear orden
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ) : showNoResults ? (
                            <tr>
                                <td colSpan="7" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                            <Search size={28} />
                                        </div>
                                        <p className="text-slate-400 font-bold text-sm">No se encontraron órdenes para esta búsqueda</p>
                                        <p className="text-xs text-slate-400">Prueba con otro número, cliente o estado.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-8 py-20 text-center"></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                {loading ? (
                    <div className="h-3 w-44 bg-slate-100 rounded animate-pulse"></div>
                ) : (
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Mostrando <span className="text-slate-600">{filteredOrders.length}</span> de <span className="text-slate-600">{orders.length}</span> resultados
                    </p>
                )}
                <div className="flex gap-2">
                    {/* Pagination Placeholder */}
                </div>
            </div>
        </div>
    );
};

export default OrdenesTable;
