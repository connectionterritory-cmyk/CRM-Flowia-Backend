import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Gift, Timer } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const formatDate = (value) => {
    if (!value) return '-';
    return String(value).split('T')[0];
};

const ProgramasPage = () => {
    const { t } = useTranslation();
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        tipo: '',
        status: '',
        owner: '',
        asesor: '',
        reward: '',
        dateFrom: '',
        dateTo: ''
    });
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [ownerType, setOwnerType] = useState('contacto');
    const [programType, setProgramType] = useState('REFERIDO_SIMPLE');
    const [ownerSearch, setOwnerSearch] = useState('');
    const [ownerResults, setOwnerResults] = useState([]);
    const [ownerLoading, setOwnerLoading] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);

    const loadProgramas = async () => {
        setLoading(true);
        try {
            const response = await api.get('/programas', {
                params: {
                    tipo: filters.tipo || undefined,
                    status: filters.status || undefined,
                }
            });
            setProgramas(response.data || []);
        } catch (error) {
            console.error('Error cargando programas:', error);
            setProgramas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const tipo = searchParams.get('tipo') || '';
        const status = searchParams.get('status') || '';
        setFilters((prev) => ({
            ...prev,
            tipo,
            status
        }));
    }, [searchParams]);

    useEffect(() => {
        loadProgramas();
    }, [filters]);

    const resetCreateModal = () => {
        setOwnerType('contacto');
        setProgramType('REFERIDO_SIMPLE');
        setOwnerSearch('');
        setOwnerResults([]);
        setSelectedOwner(null);
    };

    const handleOwnerSearch = async () => {
        const term = ownerSearch.trim();
        if (!term) {
            setOwnerResults([]);
            return;
        }

        setOwnerLoading(true);
        try {
            if (ownerType === 'contacto') {
                const response = await api.get('/contactos/search', { params: { q: term, limit: 10 } });
                const mapped = (response.data || []).map((item) => ({
                    id: item.id,
                    name: item.fullName,
                    phone: item.mobilePhone,
                    email: item.email
                }));
                setOwnerResults(mapped);
            } else {
                const response = await api.get('/clientes', { params: { q: term } });
                const mapped = (response.data || []).map((item) => ({
                    id: item.ClienteID || item.id,
                    name: item.Nombre,
                    phone: item.Telefono,
                    email: item.Email
                }));
                setOwnerResults(mapped);
            }
        } catch (error) {
            setOwnerResults([]);
        } finally {
            setOwnerLoading(false);
        }
    };

    const handleCreateProgram = async () => {
        if (!selectedOwner) return;
        try {
            await api.post('/programas', {
                tipo: programType,
                owner_type: ownerType,
                owner_id: selectedOwner.id,
                allow_without_demo: programType !== 'REFERIDO_SIMPLE'
            });
            toast.success('Programa creado');
            setShowCreateModal(false);
            resetCreateModal();
            await loadProgramas();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo crear el programa');
        }
    };

    const rows = useMemo(() => {
        return (programas || []).map((programa) => ({
            ...programa,
            expired: Boolean(programa.expired)
        }));
    }, [programas]);

    const filteredRows = useMemo(() => {
        const ownerFilter = filters.owner.trim().toLowerCase();
        const asesorFilter = filters.asesor.trim().toLowerCase();
        const rewardFilter = filters.reward;
        const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

        return rows.filter((programa) => {
            if (ownerFilter && !String(programa.OwnerNombre || '').toLowerCase().includes(ownerFilter)) return false;
            if (asesorFilter && !String(programa.AsesorNombre || '').toLowerCase().includes(asesorFilter)) return false;

            const rewardStatus = programa.RegaloEntregado
                ? 'ENTREGADO'
                : programa.RegaloElegible
                    ? 'ELEGIBLE'
                    : 'PENDIENTE';
            if (rewardFilter && rewardStatus !== rewardFilter) return false;

            if (dateFrom || dateTo) {
                const start = programa.FechaInicio ? new Date(programa.FechaInicio) : null;
                const end = programa.FechaFin ? new Date(programa.FechaFin) : null;
                const checkDate = end || start;
                if (!checkDate) return false;
                if (dateFrom && checkDate < dateFrom) return false;
                if (dateTo && checkDate > dateTo) return false;
            }
            return true;
        });
    }, [rows, filters]);

    const filterOptions = useMemo(() => {
        const owners = new Set();
        const asesores = new Set();
        rows.forEach((programa) => {
            if (programa.OwnerNombre) owners.add(programa.OwnerNombre);
            if (programa.AsesorNombre) asesores.add(programa.AsesorNombre);
        });
        return {
            owners: Array.from(owners).sort((a, b) => a.localeCompare(b)),
            asesores: Array.from(asesores).sort((a, b) => a.localeCompare(b))
        };
    }, [rows]);

    const summary = useMemo(() => {
        return rows.reduce((acc, programa) => {
            if (programa.Estado === 'COMPLETADO') acc.completed += 1;
            if (programa.Estado === 'ACTIVO' && !programa.expired) acc.active += 1;
            if (programa.expired || programa.Estado === 'EXPIRADO') acc.expired += 1;
            if (!programa.RegaloEntregado) acc.pendingGift += 1;
            return acc;
        }, {
            active: 0,
            pendingGift: 0,
            completed: 0,
            expired: 0
        });
    }, [rows]);

    const formatTipo = (tipo) => {
        if (tipo === '20_Y_GANA') return t('programs.types.20yGana');
        if (tipo === '4_EN_14') return t('programs.types.4en14');
        return t('programs.types.simple');
    };

    const formatStatus = (status) => {
        const key = status?.toLowerCase() || '';
        return t(`programs.status.${key}`, { defaultValue: status });
    };

    const statusStyles = {
        ACTIVO: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60',
        PENDIENTE: 'bg-amber-100 text-amber-700 ring-amber-200/60',
        COMPLETADO: 'bg-sky-100 text-sky-700 ring-sky-200/60',
        EXPIRADO: 'bg-rose-100 text-rose-700 ring-rose-200/60',
        CANCELADO: 'bg-slate-200 text-slate-600 ring-slate-300/60'
    };

    const getProgress = (programa) => {
        if (programa.Tipo === '20_Y_GANA') {
            return { current: programa.referralsTotal || 0, goal: 20, label: 'Referidos' };
        }
        if (programa.Tipo === '4_EN_14') {
            return { current: programa.demosCount || 0, goal: 4, label: 'Demos' };
        }
        return { current: programa.referralsTotal || 0, goal: 0, label: 'Referidos' };
    };

    const handleWhatsappSent = async (programaId) => {
        try {
            await api.post(`/programas/${programaId}/whatsapp/marcar-enviado`);
            await loadProgramas();
        } catch (error) {
            alert(error.response?.data?.error || 'No se pudo actualizar');
        }
    };

    const handleGiftDelivered = async (programaId) => {
        try {
            await api.patch(`/programas/${programaId}`, { gift_delivered: true });
            await loadProgramas();
        } catch (error) {
            alert(error.response?.data?.error || 'No se pudo actualizar');
        }
    };

    const renderRewardChip = (programa) => {
        if (programa.RegaloEntregado) {
            return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60">Entregado</span>;
        }
        if (programa.RegaloElegible) {
            return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60">Elegible</span>;
        }
        return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">Pendiente</span>;
    };

    return (
        <div className="workspace-container pb-20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{t('menu.programs')}</h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                        {t('programs.subtitle')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        resetCreateModal();
                        setShowCreateModal(true);
                    }}
                    className="btn-primary !py-2 !px-4"
                >
                    Nuevo programa
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Activos</p>
                        <p className="text-2xl font-black text-slate-800">{summary.active}</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Gift size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Regalo pendiente</p>
                        <p className="text-2xl font-black text-slate-800">{summary.pendingGift}</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Timer size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Completados</p>
                        <p className="text-2xl font-black text-slate-800">{summary.completed}</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Vencidos</p>
                        <p className="text-2xl font-black text-slate-800">{summary.expired}</p>
                    </div>
                </div>
            </div>

            <div className="card-premium p-4 mb-6 flex flex-wrap gap-4 items-center">
                <select
                    value={filters.tipo}
                    onChange={(event) => {
                        const tipo = event.target.value;
                        setFilters((prev) => ({ ...prev, tipo }));
                        setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            if (tipo) {
                                next.set('tipo', tipo);
                            } else {
                                next.delete('tipo');
                            }
                            return next;
                        });
                    }}
                    className={`input-field bg-slate-50 border-slate-200 shadow-sm w-48 h-11 px-4 ${filters.tipo ? 'text-slate-700' : 'text-slate-500'}`}
                >
                    <option value="">{t('programs.filters.allTypes')}</option>
                    <option value="20_Y_GANA">{t('programs.types.20yGana')}</option>
                    <option value="4_EN_14">{t('programs.types.4en14')}</option>
                    <option value="REFERIDO_SIMPLE">{t('programs.types.simple')}</option>
                </select>
                <select
                    value={filters.status}
                    onChange={(event) => {
                        const status = event.target.value;
                        setFilters((prev) => ({ ...prev, status }));
                        setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            if (status) {
                                next.set('status', status);
                            } else {
                                next.delete('status');
                            }
                            return next;
                        });
                    }}
                    className={`input-field bg-slate-50 border-slate-200 shadow-sm w-48 h-11 px-4 ${filters.status ? 'text-slate-700' : 'text-slate-500'}`}
                >
                    <option value="">{t('programs.filters.allStatuses')}</option>
                    <option value="ACTIVO">{t('programs.status.activo')}</option>
                    <option value="PENDIENTE">{t('programs.status.pendiente')}</option>
                    <option value="COMPLETADO">{t('programs.status.completado')}</option>
                    <option value="EXPIRADO">{t('programs.status.expirado')}</option>
                    <option value="CANCELADO">{t('programs.status.cancelado')}</option>
                </select>
                <select
                    value={filters.owner}
                    onChange={(event) => setFilters((prev) => ({ ...prev, owner: event.target.value }))}
                    className={`input-field bg-slate-50 border-slate-200 shadow-sm w-48 h-11 px-4 ${filters.owner ? 'text-slate-700' : 'text-slate-500'}`}
                >
                    <option value="">Todos los dueños</option>
                    {filterOptions.owners.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                    ))}
                </select>
                <select
                    value={filters.asesor}
                    onChange={(event) => setFilters((prev) => ({ ...prev, asesor: event.target.value }))}
                    className={`input-field bg-slate-50 border-slate-200 shadow-sm w-48 h-11 px-4 ${filters.asesor ? 'text-slate-700' : 'text-slate-500'}`}
                >
                    <option value="">Todos los asesores</option>
                    {filterOptions.asesores.map((asesor) => (
                        <option key={asesor} value={asesor}>{asesor}</option>
                    ))}
                </select>
                <select
                    value={filters.reward}
                    onChange={(event) => setFilters((prev) => ({ ...prev, reward: event.target.value }))}
                    className={`input-field bg-slate-50 border-slate-200 shadow-sm w-48 h-11 px-4 ${filters.reward ? 'text-slate-700' : 'text-slate-500'}`}
                >
                    <option value="">Regalo (todos)</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="ELEGIBLE">Elegible</option>
                    <option value="ENTREGADO">Entregado</option>
                </select>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                        className={`input-field bg-slate-50 border-slate-200 shadow-sm w-40 h-11 px-3 ${filters.dateFrom ? 'text-slate-700' : 'text-slate-500'}`}
                    />
                    <span className="text-xs text-slate-400">a</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                        className={`input-field bg-slate-50 border-slate-200 shadow-sm w-40 h-11 px-3 ${filters.dateTo ? 'text-slate-700' : 'text-slate-500'}`}
                    />
                </div>
                {(filters.owner || filters.asesor || filters.reward || filters.dateFrom || filters.dateTo) && (
                    <button
                        type="button"
                        onClick={() => setFilters((prev) => ({
                            ...prev,
                            owner: '',
                            asesor: '',
                            reward: '',
                            dateFrom: '',
                            dateTo: ''
                        }))}
                        className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            <div className="card-premium p-6">
                {loading ? (
                    <div className="text-slate-500 font-bold">{t('pages.loading')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="text-left py-2">{t('programs.table.program')}</th>
                                    <th className="text-left py-2">{t('programs.table.owner')}</th>
                                    <th className="text-left py-2">{t('programs.table.advisor')}</th>
                                    <th className="text-left py-2">{t('programs.table.status')}</th>
                                    <th className="text-left py-2">{t('programs.table.dates')}</th>
                                    <th className="text-left py-2">{t('programs.table.reward')}</th>
                                    <th className="text-right py-2">{t('tables.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((programa) => (
                                    <tr key={programa.ProgramaID} className="border-t border-slate-100">
                                        <td className="py-3 font-semibold text-slate-700">
                                            <div className="space-y-2">
                                                <div>{formatTipo(programa.Tipo)}</div>
                                                {(() => {
                                                    const progress = getProgress(programa);
                                                    const percentage = progress.goal ? Math.min(100, Math.round((progress.current / progress.goal) * 100)) : 0;
                                                    return (
                                                        <div>
                                                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                                                                <span>{progress.label}</span>
                                                                <span>{progress.goal ? `${progress.current}/${progress.goal}` : `${progress.current}`}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                                <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="py-3 text-slate-500">{programa.OwnerNombre || '-'}</td>
                                        <td className="py-3 text-slate-500">{programa.AsesorNombre || '-'}</td>
                                        <td className="py-3">
                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[programa.expired ? 'EXPIRADO' : programa.Estado] || 'bg-slate-100 text-slate-600 ring-slate-200/60'}`}>
                                                <span className="h-2 w-2 rounded-full bg-current"></span>
                                                {programa.expired ? t('programs.status.expirado') : formatStatus(programa.Estado)}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-500">
                                            <div className="space-y-1">
                                                <div>{formatDate(programa.FechaInicio)} - {formatDate(programa.FechaFin)}</div>
                                                {programa.Tipo === '4_EN_14' && programa.remainingDays !== null && (
                                                    <div className={`text-[10px] font-semibold ${programa.expired ? 'text-rose-500' : 'text-slate-400'}`}>
                                                        {programa.expired ? 'Vencido' : `${programa.remainingDays} dias restantes`}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-slate-500">
                                            {renderRewardChip(programa)}
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <Link
                                                    to={`/programas/${programa.ProgramaID}`}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                                >
                                                    {t('buttons.view')}
                                                </Link>
                                                {programa.Tipo === '20_Y_GANA' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleWhatsappSent(programa.ProgramaID)}
                                                        className="text-xs font-bold text-slate-500 hover:text-slate-700"
                                                        title="Marcar WhatsApp enviado"
                                                    >
                                                        WhatsApp
                                                    </button>
                                                )}
                                                {(programa.Tipo === '20_Y_GANA' || programa.Tipo === '4_EN_14') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGiftDelivered(programa.ProgramaID)}
                                                        className="text-xs font-bold text-slate-500 hover:text-slate-700"
                                                        disabled={!programa.RegaloElegible || programa.RegaloEntregado}
                                                        title={programa.RegaloElegible ? 'Marcar regalo entregado' : 'No elegible aun'}
                                                    >
                                                        Regalo
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-slate-800">Nuevo programa</h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setProgramType('REFERIDO_SIMPLE')}
                                className={`py-2 rounded-xl text-xs font-bold border ${programType === 'REFERIDO_SIMPLE'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                Referido simple
                            </button>
                            <button
                                type="button"
                                onClick={() => setProgramType('4_EN_14')}
                                className={`py-2 rounded-xl text-xs font-bold border ${programType === '4_EN_14'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                4 en 14
                            </button>
                            <button
                                type="button"
                                onClick={() => setProgramType('20_Y_GANA')}
                                className={`py-2 rounded-xl text-xs font-bold border ${programType === '20_Y_GANA'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                20 y Gana
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setOwnerType('contacto');
                                    setOwnerResults([]);
                                    setSelectedOwner(null);
                                }}
                                className={`py-2 rounded-xl text-xs font-bold border ${ownerType === 'contacto'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                Contacto
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setOwnerType('cliente');
                                    setOwnerResults([]);
                                    setSelectedOwner(null);
                                }}
                                className={`py-2 rounded-xl text-xs font-bold border ${ownerType === 'cliente'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                Cliente
                            </button>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="text"
                                value={ownerSearch}
                                onChange={(event) => setOwnerSearch(event.target.value)}
                                placeholder="Buscar por nombre, telefono o email"
                                className="input-field flex-1 h-11 px-4"
                            />
                            <button
                                type="button"
                                onClick={handleOwnerSearch}
                                className="btn-secondary !py-2 !px-4"
                                disabled={ownerLoading}
                            >
                                {ownerLoading ? 'Buscando...' : 'Buscar'}
                            </button>
                        </div>

                        <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
                            {ownerResults.length === 0 && (
                                <div className="p-4 text-sm text-slate-400">Sin resultados</div>
                            )}
                            {ownerResults.map((owner) => (
                                <button
                                    key={owner.id}
                                    type="button"
                                    onClick={() => setSelectedOwner(owner)}
                                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 ${selectedOwner?.id === owner.id
                                        ? 'bg-indigo-50'
                                        : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="text-sm font-semibold text-slate-700">{owner.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {[owner.phone, owner.email].filter(Boolean).join(' • ') || '-'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateProgram}
                                disabled={!selectedOwner}
                                className="btn-primary !py-2 !px-4"
                            >
                                Crear programa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgramasPage;
