import React from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4f46e5', '#94a3b8', '#10b981', '#f43f5e']; // Indigo, Slate, Emerald, Rose

const DashboardCharts = () => {
    const { t } = useTranslation();
    const data = [
        { name: t('months.jan'), ingresos: 4000, gastos: 2400 },
        { name: t('months.feb'), ingresos: 3000, gastos: 1398 },
        { name: t('months.mar'), ingresos: 2000, gastos: 9800 },
        { name: t('months.apr'), ingresos: 2780, gastos: 3908 },
        { name: t('months.may'), ingresos: 1890, gastos: 4800 },
        { name: t('months.jun'), ingresos: 2390, gastos: 3800 },
        { name: t('months.jul'), ingresos: 3490, gastos: 4300 },
    ];

    const clientesData = [
        { name: t('charts.active'), value: 400 },
        { name: t('charts.inactive'), value: 300 },
        { name: t('charts.new'), value: 300 },
        { name: t('charts.overdue'), value: 200 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 card-premium p-6 flex flex-col h-[400px] w-full min-w-[300px]">
                <div className="mb-6">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">{t('charts.revenueTrend')}</h3>
                    <p className="text-xs text-slate-400 font-medium">{t('charts.semiannual')}</p>
                </div>
                <div className="flex-none w-full min-w-0 h-[260px] min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: '#1e293b', fontWeight: 600, fontSize: '13px' }}
                                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="ingresos"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorIngresos)"
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Clients Distribution Chart */}
            <div className="card-premium p-6 flex flex-col h-[400px] w-full min-w-[300px]">
                <div className="mb-6">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">{t('charts.portfolioDistribution')}</h3>
                    <p className="text-xs text-slate-400 font-medium">{t('charts.customerStatus')}</p>
                </div>
                <div className="flex-none w-full min-w-0 h-[260px] min-h-[200px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={clientesData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {clientesData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: '#1e293b', fontWeight: 600, fontSize: '13px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-800 tracking-tighter">1.2k</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('charts.total')}</span>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {clientesData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                            <span className="text-xs font-bold text-slate-600">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;
