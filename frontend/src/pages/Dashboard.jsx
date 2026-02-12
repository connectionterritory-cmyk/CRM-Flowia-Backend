import React, { useEffect, useState } from 'react';
import { Users, DollarSign, AlertCircle, MessageSquare, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import KPICard from '../components/Dashboard/KPICard';
import AlertasWidget from '../components/Dashboard/AlertasWidget';
import ClientesList from '../components/Dashboard/ClientesList';
import DashboardCharts from '../components/Dashboard/DashboardCharts';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, alertasRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/alertas')
                ]);
                setStats(statsRes.data);
                setAlertas(alertasRes.data);
            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full text-indigo-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
            </div>
        );
    }

    return (
        <div className="workspace-container w-full min-w-[300px] animate-in fade-in slide-in-from-bottom-2 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{t('dashboard.overviewTitle')}</h2>
                    <p className="text-slate-500 font-medium mt-1">{t('dashboard.overviewSubtitle')}</p>
                </div>
                {/* Mock Date Picker for visual appeal */}
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                    <Calendar size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold">{t('dashboard.last30Days')}</span>
                </button>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title={t('dashboard.kpis.customersDirectory')}
                    value={stats?.totalClientes || 0}
                    subtext={t('dashboard.kpis.activeAccounts', { count: stats?.clientesActivos || 0 })}
                    icon={Users}
                    color="blue"
                    trend={{ value: "+12%", isPositive: true }}
                />
                <KPICard
                    title={t('dashboard.kpis.totalPortfolio')}
                    value={formatCurrency(stats?.saldoTotalPendiente)}
                    subtext={t('dashboard.kpis.pendingBalance')}
                    icon={DollarSign}
                    color="green"
                    trend={{ value: "+5%", isPositive: true }}
                />
                <KPICard
                    title={t('dashboard.kpis.overdue')}
                    value={formatCurrency(stats?.saldoVencido)}
                    subtext={t('dashboard.kpis.urgent')}
                    icon={AlertCircle}
                    color="red"
                    trend={{ value: "-2%", isPositive: true }}
                />
                <KPICard
                    title={t('dashboard.kpis.communication')}
                    value={stats?.notasNoLeidas || 0}
                    subtext={t('dashboard.kpis.followUpNotes')}
                    icon={MessageSquare}
                    color="yellow"
                    trend={{ value: "0", isPositive: false }}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Left Column (Charts) */}
                <div className="xl:col-span-2 h-full w-full min-w-[300px]">
                    <DashboardCharts />
                </div>

                {/* Right Column (Alerts/Action Center) */}
                <div className="h-full">
                    <AlertasWidget alertas={alertas} />
                </div>
            </div>

            {/* Bottom Section (Lists) */}
            <div className="grid grid-cols-1 gap-8">
                <ClientesList />
            </div>
        </div>
    );
};

export default Dashboard;
