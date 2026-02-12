import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, Compass, MoreHorizontal, ArrowRight, ArrowUpRight, GripVertical, MapPin, Package, Users, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ETAPAS_ACTIVAS, ETAPAS } from '../../utils/etapas';

function OportunidadCard({ oportunidad, onMoveTo, onUpdateEstadoCierre, onOpenPrograma, onCrearOrden, onOpenDetalle }) {
    const navigate = useNavigate();
    const [showMove, setShowMove] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: oportunidad.OportunidadID });

    const cardStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const puedeProgramasDemo = oportunidad.Etapa === 'DEMO_REALIZADA';
    const puedeCrearOrden = oportunidad.Etapa === 'CIERRE_GANADO';

    const formatPrograma = (value) => {
        if (!value) return '';
        if (value === '4_EN_14') return '4 en 14';
        if (value === '20_Y_GANA') return '20 y Gana';
        if (value === 'REFERIDO_SIMPLE') return 'Referido simple';
        return value.replace(/_/g, ' ');
    };


    const parseDateSafe = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const formatDateSafe = (value, fallback = 'Sin fecha') => {
        const parsed = parseDateSafe(value);
        if (!parsed) return fallback;
        return format(parsed, 'd MMM', { locale: es });
    };

    const fechaProximaAccionDate = parseDateSafe(oportunidad.FechaProximaAccion);
    const isOverdue = Boolean(fechaProximaAccionDate) && fechaProximaAccionDate < new Date();
    const displaySource = oportunidad.source_name
        || oportunidad.source
        || (oportunidad.contacto && oportunidad.contacto.source_name)
        || 'Pendiente';
    const normalizedSource = String(displaySource || '').trim().toLowerCase();
    const normalizedReferido = String(oportunidad.ReferidoPor || '').trim().toLowerCase();
    const showReferidoBadge = Boolean(oportunidad.ReferidoPor) && normalizedReferido !== normalizedSource;
    const ownerName = oportunidad.OwnerNombre || '';
    const ownerInitials = ownerName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'A';

    return (
        <div
            ref={setNodeRef}
            style={cardStyle}
            onClick={() => {
                if (isDragging) return;
                onOpenDetalle?.(oportunidad);
            }}
            className={
                `kanban-card card-premium w-full min-h-[140px] h-auto box-border bg-white border-2 border-slate-300 shadow-sm pt-5 px-6 pb-7 cursor-pointer group active:scale-[0.98] select-none relative mb-1 leading-normal antialiased ` +
                (isDragging ? 'shadow-2xl border-indigo-500 ring-4 ring-indigo-500/20 scale-105 rotate-1 z-[100]' : 'hover:-translate-y-1.5 hover:shadow-md hover:border-indigo-300')
            }
        >
            {/* Header: Company & Action */}
            <div className="flex items-start justify-between mb-5 gap-2">
                <div className="flex flex-col items-start gap-2 flex-1 min-w-0" style={{ minWidth: 0, width: '100%' }}>
                    <div
                        {...attributes}
                        {...listeners}
                        className="mt-1 text-slate-500 hover:text-slate-700 cursor-grab active:cursor-grabbing flex-shrink-0"
                        aria-label="Arrastrar tarjeta"
                    >
                        <GripVertical size={18} />
                    </div>
                    <div className="w-full" style={{ minWidth: 0 }}>
                        <h4
                            className="font-black text-slate-900 text-base tracking-tight group-hover:text-indigo-600 transition-colors min-w-0 whitespace-normal break-words leading-normal"
                            style={{ lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                            <span className="block w-full min-w-0">
                                {oportunidad.ContactoNombre || 'Sin nombre'}
                            </span>
                        </h4>
                        <div className="flex items-center gap-1.5 mt-2 min-w-0">
                            <span className="shrink-0 p-1 rounded bg-slate-200 text-slate-700">
                                <Package size={14} strokeWidth={2.5} />
                            </span>
                            <p
                                className="text-xs font-semibold text-slate-700 flex-1 min-w-0 whitespace-normal break-words leading-normal"
                                style={{ lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                            >
                                <span className="block w-full min-w-0">
                                    {oportunidad.ProductoInteres || 'Producto por definir'}
                                </span>
                            </p>
                        </div>
                        <div className="mt-3 w-full">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide leading-normal max-w-full">
                                <Compass size={14} className="shrink-0 text-slate-600" />
                                <span className="truncate">{displaySource}</span>
                            </span>
                        </div>
                        {(showReferidoBadge || oportunidad.ProgramaTipo) && (
                            <div className="mt-2 flex flex-wrap gap-2 max-w-full overflow-hidden">
                                {showReferidoBadge && (
                                    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide overflow-hidden truncate whitespace-nowrap leading-normal">
                                        <Users size={12} className="shrink-0 text-indigo-600" />
                                        <span className="truncate max-w-full overflow-hidden">Referido por: {oportunidad.ReferidoPor}</span>
                                    </span>
                                )}
                                {oportunidad.ProgramaTipo && (
                                    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide overflow-hidden truncate whitespace-nowrap leading-normal">
                                        <Sparkles size={12} className="shrink-0 text-slate-600" />
                                        <span className="truncate max-w-full overflow-hidden">Programa {formatPrograma(oportunidad.ProgramaTipo)}</span>
                                    </span>
                                )}
                            </div>
                        )}
                        {oportunidad.EstadoCierre === 'Seguimiento' && (
                            <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest overflow-hidden truncate whitespace-nowrap leading-normal">
                                SEGUIMIENTO
                                <span className="text-[10px] font-black text-amber-600">
                                    {formatDateSafe(oportunidad.ProximoContactoFecha, 'Sin fecha')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            setShowMove((prev) => !prev);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {showMove && (
                        <div
                            className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-20"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="px-4 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                Mover a...
                            </div>
                            <div className="py-2">
                                {ETAPAS_ACTIVAS.map((etapa) => (
                                    <button
                                        key={etapa}
                                        onClick={() => {
                                            setShowMove(false);
                                            onMoveTo?.(oportunidad, etapa);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <ArrowUpRight size={12} className="text-slate-400" />
                                        {ETAPAS[etapa]?.nombre}
                                    </button>
                                ))}
                            </div>
                            {puedeCrearOrden && (
                                <div className="border-t border-slate-100">
                                    <button
                                        onClick={() => {
                                            setShowMove(false);
                                            onCrearOrden?.(oportunidad);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <ArrowUpRight size={12} className="text-slate-400" />
                                        Crear orden
                                    </button>
                                </div>
                            )}
                            <div className="px-4 py-2 border-t border-slate-100">
                                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">Estado cierre</p>
                                <div className="grid grid-cols-3 gap-2 text-[9px] font-medium min-w-0">
                                    {['Activo', 'Seguimiento', 'No interesado'].map((estado) => (
                                        <button
                                            key={estado}
                                            onClick={() => {
                                                setShowMove(false);
                                                onUpdateEstadoCierre?.(oportunidad, estado);
                                            }}
                                            title={estado}
                                            className={`px-1.5 py-1 rounded-lg border text-[8px] leading-tight font-medium whitespace-nowrap overflow-hidden text-ellipsis hover:whitespace-normal hover:break-words hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 hover:z-10 ${oportunidad.EstadoCierre === estado ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-slate-200 text-slate-500'}`}
                                        >
                                            {estado}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Date & Address */}
            <div className="pt-4 border-t border-slate-200 flex items-start justify-between min-w-0 max-w-full gap-3">
                <div className="flex flex-col gap-2 min-w-0 max-w-full">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 w-fit">
                        <Calendar size={14} className={isOverdue ? 'text-rose-600' : 'text-slate-600'} />
                        <span className={`text-[11px] font-bold uppercase tracking-tight ${isOverdue ? 'text-rose-700' : 'text-slate-700'}`}>
                            {formatDateSafe(oportunidad.FechaProximaAccion, 'Pendiente')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 p-1 rounded bg-slate-200 text-slate-700">
                            <MapPin size={14} strokeWidth={2.5} />
                        </span>
                        <p
                            className="text-xs font-semibold text-slate-700 min-w-0 whitespace-normal break-words leading-normal"
                            style={{ lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                            <span className="block w-full min-w-0">
                                {oportunidad.ContactoCiudad && oportunidad.ContactoCiudad !== 'NO_DICE'
                                    ? oportunidad.ContactoCiudad
                                    : 'Ciudad no definida'}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 p-1 rounded bg-slate-200 text-slate-700">
                            <User size={14} strokeWidth={2.5} />
                        </span>
                        <p className="text-xs font-semibold text-slate-700 min-w-0 whitespace-normal break-words leading-normal">
                            <span className="block w-full min-w-0">
                                Asesor: {oportunidad.OwnerNombre || 'Sin asesor'}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 pr-10 flex-shrink-0">
                    {puedeCrearOrden && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                if (isDragging) return;
                                onCrearOrden?.(oportunidad);
                            }}
                            className="h-8 px-2.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
                        >
                            Crear Orden
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (isDragging) return;
                            if (oportunidad.ClienteID) {
                                navigate(`/clientes/${oportunidad.ClienteID}`);
                            } else if (oportunidad.ContactoID) {
                                navigate(`/contactos/${oportunidad.ContactoID}`);
                            }
                        }}
                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center scale-0 group-hover:scale-100 transition-all shadow-lg shadow-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        aria-label="Ver cliente"
                    >
                        <ArrowRight size={14} strokeWidth={3} />
                    </button>
                </div>
            </div>
            <div
                className="absolute bottom-4 right-4 w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center shadow-sm overflow-hidden"
                title={oportunidad.OwnerNombre}
            >
                <span className="text-[10px] font-black text-slate-500 uppercase">{ownerInitials}</span>
            </div>
        </div>
    );
}

export default OportunidadCard;
