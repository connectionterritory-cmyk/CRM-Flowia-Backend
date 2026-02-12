import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Filter, Plus, X } from 'lucide-react';
import OportunidadCard from './OportunidadCard';
import { ETAPAS } from '../../utils/etapas';

function KanbanColumn({ etapa, oportunidades, limitPerColumn = 10, onCreate, onRefresh, onMoveTo, onUpdateEstadoCierre, onOpenPrograma, onCrearOrden, onOpenDetalle }) {
    const etapaConfig = ETAPAS[etapa];
    const { setNodeRef, isOver } = useDroppable({ id: etapa });
    const items = (oportunidades || []).map((item) => item.OportunidadID);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        city: '',
        temperature: ''
    });

    const temperatureOptions = [
        { value: 'NUEVO', label: 'Nuevo' },
        { value: 'CONTACTADO', label: 'Contactado' },
        { value: 'CALIFICADO', label: 'Calificado' },
        { value: 'CITA_AGENDADA', label: 'Cita agendada' },
        { value: 'NO_MOLESTAR', label: 'No molestar' },
        { value: 'NO_INTERESA', label: 'No interesa' }
    ];

    const hasActiveFilters = Boolean(filters.dateFrom || filters.dateTo || filters.city || filters.temperature);

    const parseDate = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const filteredOportunidades = useMemo(() => {
        const cityFilter = filters.city.trim().toLowerCase();
        const dateFrom = parseDate(filters.dateFrom);
        const dateTo = parseDate(filters.dateTo);

        return (oportunidades || []).filter((item) => {
            const contactCity = String(item.ContactoCiudad || '').toLowerCase();
            const status = String(item.ContactoStatus || '').toUpperCase();
            const dateValue = item.FechaProximaAccion || item.ProximoContactoFecha;
            const dateParsed = parseDate(dateValue);

            if (cityFilter && !contactCity.includes(cityFilter)) return false;
            if (filters.temperature && status !== filters.temperature) return false;
            if (dateFrom && (!dateParsed || dateParsed < dateFrom)) return false;
            if (dateTo && (!dateParsed || dateParsed > dateTo)) return false;
            return true;
        });
    }, [oportunidades, filters]);

    const displayOportunidades = useMemo(() => {
        let sorted = filteredOportunidades;
        if (etapa === 'NUEVO_LEAD') {
            sorted = [...filteredOportunidades].sort((a, b) => {
                const dateA = a.ContactoCreatedAt ? new Date(a.ContactoCreatedAt).getTime() : 0;
                const dateB = b.ContactoCreatedAt ? new Date(b.ContactoCreatedAt).getTime() : 0;
                return dateB - dateA;
            });
        }

        if (!limitPerColumn || limitPerColumn <= 0) return sorted;
        return sorted.slice(0, limitPerColumn);
    }, [filteredOportunidades, etapa, limitPerColumn]);

    return (
        <div className="w-[320px] max-w-[320px] min-w-[320px] basis-[320px] flex-none shrink-0 min-h-0 min-w-0 overflow-hidden">
            <div className="min-h-0 min-w-0 flex flex-col h-full bg-slate-50 rounded-[2rem] p-4 border border-slate-200 overflow-hidden max-w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 px-3 min-h-0 min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0 max-w-full overflow-hidden">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0`} style={{ backgroundColor: etapaConfig?.color || '#cbd5e1' }} />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em] truncate">
                            {etapaConfig?.nombre}
                        </h3>
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm">
                            {filteredOportunidades.length}
                        </span>
                        {hasActiveFilters && (
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                / {oportunidades.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onCreate && (
                            <button
                                onClick={onCreate}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                title="Nueva oportunidad"
                            >
                                <Plus size={16} strokeWidth={3} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowFilters((prev) => !prev)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${hasActiveFilters ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Filtros"
                        >
                            {showFilters ? <X size={14} /> : <Filter size={14} />}
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="mb-4 mx-2 p-3 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                                    className="input-field mt-1 h-9 px-3"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                                    className="input-field mt-1 h-9 px-3"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciudad</label>
                            <input
                                type="text"
                                value={filters.city}
                                onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
                                placeholder="Buscar ciudad"
                                className="input-field mt-1 h-9 px-3"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Temperatura</label>
                            <select
                                value={filters.temperature}
                                onChange={(event) => setFilters((prev) => ({ ...prev, temperature: event.target.value }))}
                                className="input-field mt-1 h-9 px-3 bg-white"
                            >
                                <option value="">Todas</option>
                                {temperatureOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => setFilters({ dateFrom: '', dateTo: '', city: '', temperature: '' })}
                                className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                )}

                {/* Droppable Area */}
                <div className="flex-1 min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden px-1 pb-12 custom-scrollbar kanban-column-body">
                    <div
                        ref={setNodeRef}
                        className={`space-y-4 min-h-[300px] transition-all duration-300 rounded-2xl p-2 max-w-full overflow-hidden ${isOver ? 'bg-indigo-50/50 ring-2 ring-indigo-200/50 ring-inset ring-offset-4' : ''}`}
                    >
                        <SortableContext items={items} strategy={verticalListSortingStrategy}>
                            {displayOportunidades.map((oportunidad) => (
                                <OportunidadCard
                                    key={oportunidad.OportunidadID}
                                    oportunidad={oportunidad}
                                    onMoveTo={onMoveTo}
                                    onOpenPrograma={onOpenPrograma}
                                    onCrearOrden={onCrearOrden}
                                    onUpdateEstadoCierre={onUpdateEstadoCierre}
                                    onOpenDetalle={onOpenDetalle}
                                />
                            ))}
                        </SortableContext>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default KanbanColumn;
