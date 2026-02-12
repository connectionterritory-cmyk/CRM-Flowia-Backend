import React, { useState } from 'react';
import KanbanBoard from '../components/Pipeline/KanbanBoard';
import PipelineStats from '../components/Pipeline/PipelineStats';
import PipelineFilters from '../components/Pipeline/PipelineFilters';
import NuevoLeadModal from '../components/Pipeline/NuevoLeadModal';
import { BarChart2, Layout, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function Pipeline() {
    const { t } = useTranslation();
    const [filters, setFilters] = useState({});
    const [showStats, setShowStats] = useState(false);
    const [showNuevoLead, setShowNuevoLead] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [metricsKey, setMetricsKey] = useState(0);
    const [initialStage, setInitialStage] = useState('NUEVO_LEAD');
    const [openOpportunityId, setOpenOpportunityId] = useState(null);

    const handleNuevoLeadSuccess = (data) => {
        setShowNuevoLead(false);
        setRefreshKey(prev => prev + 1);
        setMetricsKey(prev => prev + 1);
    };

    const handleOpenModal = (stage = 'NUEVO_LEAD') => {
        setInitialStage(stage);
        setShowNuevoLead(true);
    };

    return (
        <div className="workspace-container w-full max-w-full min-w-0 min-h-full h-auto flex flex-col !py-0 !px-0 bg-white" style={{ '--kanban-offset': '300px' }}>
            {/* Pipeline Header */}
            <div className="sticky top-0 z-30 px-4 sm:px-6 md:px-10 py-4 sm:py-6 bg-white/70 border-b border-slate-200/60 backdrop-blur-sm flex-shrink-0 w-full min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{t('pages.opportunitiesTitle')}</h1>
                            <span className="badge badge-info">{t('pages.opportunitiesBadge')}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">{t('pages.opportunitiesSubtitle')}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                        <div className="bg-slate-100 p-1.5 rounded-[14px] flex items-center border border-slate-200 w-full sm:w-auto overflow-x-auto">
                            <button
                                onClick={() => setShowStats(false)}
                                className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all whitespace-nowrap ${!showStats ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Layout size={14} /> {t('pages.opportunitiesBoard')}
                                </div>
                            </button>
                            <button
                                onClick={() => setShowStats(true)}
                                className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all whitespace-nowrap ${showStats ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <BarChart2 size={14} /> {t('pages.opportunitiesMetrics')}
                                </div>
                            </button>
                        </div>
                        <button
                            onClick={() => handleOpenModal('NUEVO_LEAD')}
                            className="btn-primary !py-2.5 !px-4 sm:!px-6 shadow-indigo-600/10 w-full sm:w-auto text-center whitespace-normal leading-tight"
                        >
                            <span className="mr-2">＋</span> {t('buttons.newOpportunity')}
                        </button>
                    </div>
                </div>

                <div className="mt-4 sm:mt-6">
                    <PipelineFilters onFilterChange={setFilters} />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative bg-slate-50/20 w-full min-w-0 overflow-x-auto overflow-y-auto">
                {showStats ? (
                    <div className="p-10 h-full overflow-y-auto">
                        <PipelineStats refreshKey={metricsKey} />
                    </div>
                ) : (
                    <div className="h-full min-h-0">
                        <KanbanBoard
                            filters={filters}
                            key={refreshKey}
                            onMetricsRefresh={() => setMetricsKey(prev => prev + 1)}
                            onCreateInStage={handleOpenModal}
                            openOpportunityId={openOpportunityId}
                            onOpenOpportunityHandled={() => setOpenOpportunityId(null)}
                        />
                    </div>
                )}
            </div>

            <NuevoLeadModal
                isOpen={showNuevoLead}
                onClose={() => setShowNuevoLead(false)}
                onSuccess={handleNuevoLeadSuccess}
                initialStage={initialStage}
                onOpenOpportunity={(id) => setOpenOpportunityId(id)}
            />
        </div>
    );
}

export default Pipeline;
