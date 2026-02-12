import React, { useState, useEffect } from 'react';
import { Filter, Users, List } from 'lucide-react';
import api from '../../services/api';

function PipelineFilters({ onFilterChange }) {
    const [origenes, setOrigenes] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [filters, setFilters] = useState({
        ownerId: '',
        origenId: '',
        limitPerColumn: 10
    });

    useEffect(() => {
        const loadFilterData = async () => {
            try {
                const [origRes, userRes] = await Promise.all([
                    api.get('/catalogos/origenes'),
                    api.get('/asesores')
                ]);
                setOrigenes(origRes.data || []);
                setUsuarios(userRes.data || []);
            } catch (error) {
                console.error('Error loading filters:', error);
                setOrigenes([]);
                setUsuarios([]);
            }
        };
        loadFilterData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    return (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-200/50">
            <div className="relative w-full sm:min-w-[220px] sm:w-auto">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <select
                    name="ownerId"
                    value={filters.ownerId}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400/50 transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
                >
                    <option value="">TODOS LOS ASESORES</option>
                    {usuarios.length === 0 && (
                        <option value="" disabled>SIN DATOS</option>
                    )}
                    {usuarios.map((u) => (
                        <option key={u.id || u.UsuarioID} value={u.id || u.UsuarioID}>
                            {(u.nombre || u.Nombre || 'SIN NOMBRE').toUpperCase()}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <List size={10} strokeWidth={3} />
                </div>
            </div>

            <div className="relative w-full sm:min-w-[220px] sm:w-auto">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <select
                    name="origenId"
                    value={filters.origenId}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400/50 transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
                >
                    <option value="">TODOS LOS ORÍGENES</option>
                    {origenes.length === 0 && (
                        <option value="" disabled>SIN DATOS</option>
                    )}
                    {origenes.map((o) => (
                        <option key={o.id || o.OrigenID} value={o.id || o.OrigenID}>
                            {(o.nombre || o.Nombre || 'SIN NOMBRE').toUpperCase()}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <List size={10} strokeWidth={3} />
                </div>
            </div>

            <div className="relative w-full sm:min-w-[180px] sm:w-auto">
                <List className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <select
                    name="limitPerColumn"
                    value={filters.limitPerColumn}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400/50 transition-all appearance-none cursor-pointer shadow-sm hover:border-slate-300"
                >
                    {[10, 20, 50, 100].map((value) => (
                        <option key={value} value={value}>{value} POR COLUMNA</option>
                    ))}
                    <option value={0}>TODOS</option>
                </select>
            </div>

            {(filters.ownerId || filters.origenId) && (
                <button
                    onClick={() => {
                        const reset = { ownerId: '', origenId: '', limitPerColumn: filters.limitPerColumn };
                        setFilters(reset);
                        onFilterChange(reset);
                    }}
                    className="h-10 px-4 rounded-xl text-[10px] font-black text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all uppercase tracking-[0.15em] w-full sm:w-auto"
                >
                    Limpiar Filtros
                </button>
            )}
        </div>
    );
}

export default PipelineFilters;
