import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ETAPAS } from '../../utils/etapas';

function PipelineStats({ refreshKey = 0 }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
    }, [refreshKey]);

    const fetchStats = async () => {
        try {
            setError('');
            const response = await api.get('/pipeline/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStats(null);
            setError('No se pudieron cargar las métricas');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Cargando estadísticas...</div>;
    if (error) {
        return (
            <div className="p-4 text-red-500 flex items-center gap-4">
                <span>{error}</span>
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        fetchStats();
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }
    if (!stats) return <div className="p-4 text-red-500">Error al cargar estadísticas</div>;

    const statsPorEtapa = stats.statsPorEtapa || [];
    const conversiones = stats.conversiones || {
        Ganados: 0,
        Perdidos: 0,
        tasaConversion: 0,
    };
    const totalOportunidades = stats.totalOportunidades ?? stats.total_oportunidades ?? 0;


    return (
        <div className="space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white/60 backdrop-blur-lg p-6 rounded-2xl shadow-soft border border-white/40 ring-1 ring-black/5 hover:shadow-lg transition-all duration-300">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Oportunidades Activas</div>
                    <div className="text-3xl font-black text-indigo-600">{totalOportunidades}</div>
                </div>
                <div className="bg-white/60 backdrop-blur-lg p-6 rounded-2xl shadow-soft border border-white/40 ring-1 ring-black/5 hover:shadow-lg transition-all duration-300">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tasa de Conversión</div>
                    <div className="text-3xl font-black text-emerald-600">{conversiones.tasaConversion}%</div>
                </div>
                <div className="bg-white/60 backdrop-blur-lg p-6 rounded-2xl shadow-soft border border-white/40 ring-1 ring-black/5 hover:shadow-lg transition-all duration-300">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ganados vs Perdidos</div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-emerald-600 font-extrabold text-lg">{conversiones.Ganados} ✅</span>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <span className="text-red-500 font-extrabold text-lg">{conversiones.Perdidos} ❌</span>
                    </div>
                </div>
            </div>

            {/* Funnel Table */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-soft border border-white/40 ring-1 ring-black/5 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100/60 bg-white/40">
                    <h3 className="font-extrabold text-slate-800 tracking-tight">Detalle Estratégico por Etapa</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Etapa</th>
                                <th className="px-8 py-4 text-right">Cantidad</th>
                                <th className="px-8 py-4 text-center">Acciones Vencidas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {statsPorEtapa.map((row) => (
                                <tr key={row.Etapa} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-8 py-4 flex items-center gap-3">
                                        <span className="p-2 rounded-lg bg-white/80 shadow-sm border border-slate-100">{ETAPAS[row.Etapa]?.icon || '❓'}</span>
                                        <span className="font-bold text-slate-700">{ETAPAS[row.Etapa]?.nombre || row.Etapa}</span>
                                    </td>
                                    <td className="px-8 py-4 text-right font-black text-slate-900">{row.Total}</td>
                                    <td className="px-8 py-4 text-center">
                                        {row.AccionesVencidas > 0 ? (
                                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-red-200 ring-4 ring-red-50">
                                                {row.AccionesVencidas}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 font-medium">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default PipelineStats;
