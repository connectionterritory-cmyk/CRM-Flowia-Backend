import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import KanbanColumn from './KanbanColumn';
import EtapaModal from './EtapaModal';
import EstadoCierreModal from './EstadoCierreModal';
import OportunidadDetalleDrawer from './OportunidadDetalleDrawer';
import OportunidadEditModal from './OportunidadEditModal';
import { ETAPAS_ACTIVAS } from '../../utils/etapas';
import api from '../../services/api';

function KanbanBoard({
    filters,
    onMetricsRefresh,
    onCreateInStage,
    openOpportunityId,
    onOpenOpportunityHandled
}) {
    const [columns, setColumns] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalData, setModalData] = useState(null);
    const [estadoModal, setEstadoModal] = useState(null);
    const [detalleOportunidad, setDetalleOportunidad] = useState(null);
    const [editOportunidad, setEditOportunidad] = useState(null);
    const navigate = useNavigate();
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            }
        })
    );

    useEffect(() => {
        loadKanbanData();
    }, [filters]);

    useEffect(() => {
        if (!openOpportunityId) return;
        const fetchOpportunity = async () => {
            try {
                const response = await api.get(`/oportunidades/${openOpportunityId}`);
                setDetalleOportunidad(response.data);
            } catch (error) {
                console.error('Error al abrir oportunidad:', error);
            } finally {
                onOpenOpportunityHandled?.();
            }
        };
        fetchOpportunity();
    }, [openOpportunityId, onOpenOpportunityHandled]);

    const loadKanbanData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/pipeline/kanban', {
                params: {
                    ...filters,
                    estadoCierre: filters.estadoCierre || 'Activo'
                }
            });

            const normalized = normalizeColumns(response.data);
            setColumns(normalized);
        } catch (error) {
            console.error('Error al cargar kanban:', error);
            toast.error(
                error.response?.data?.details ||
                error.response?.data?.error ||
                'No se pudieron cargar las oportunidades. Intenta recargar.'
            );
            setColumns({});
        } finally {
            setLoading(false);
        }
    };

    const normalizeColumns = (data) => {
        const next = {
            NUEVO_LEAD: [],
            CONTACTO_INICIADO: [],
            CALIFICACION: [],
            CITA_AGENDADA: [],
            DEMO_REALIZADA: [],
            CIERRE_GANADO: []
        };

        const stageToColumn = {
            NUEVO_LEAD: 'NUEVO_LEAD',
            INTENTO_CONTACTO: 'CONTACTO_INICIADO',
            CONTACTADO: 'CONTACTO_INICIADO',
            CALIFICACION: 'CALIFICACION',
            CITA_AGENDADA: 'CITA_AGENDADA',
            DEMO_REALIZADA: 'DEMO_REALIZADA',
            CIERRE_GANADO: 'CIERRE_GANADO'
        };

        Object.entries(data || {}).forEach(([etapa, items]) => {
            const columnKey = stageToColumn[etapa];
            if (!columnKey) return;
            next[columnKey].push(...items);
        });

        return next;
    };

    const findColumnByItemId = (itemId) => {
        return Object.keys(columns).find((key) =>
            (columns[key] || []).some((item) => item.OportunidadID === itemId)
        );
    };

    const onDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const sourceColumn = findColumnByItemId(activeId);
        const overIsColumn = Object.prototype.hasOwnProperty.call(columns, overId);
        const destColumn = overIsColumn ? overId : findColumnByItemId(overId);

        if (!sourceColumn || !destColumn) return;

        if (sourceColumn === destColumn) {
            const columnItems = columns[sourceColumn] || [];
            const oldIndex = columnItems.findIndex((item) => item.OportunidadID === activeId);
            const newIndex = columnItems.findIndex((item) => item.OportunidadID === overId);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const reordered = arrayMove(columnItems, oldIndex, newIndex);
                setColumns((prev) => ({
                    ...prev,
                    [sourceColumn]: reordered,
                }));
            }
            return;
        }

        const sourceItems = Array.from(columns[sourceColumn] || []);
        const destItems = Array.from(columns[destColumn] || []);
        const sourceIndex = sourceItems.findIndex((item) => item.OportunidadID === activeId);

        if (sourceIndex === -1) return;

        const [movedItem] = sourceItems.splice(sourceIndex, 1);
        const updatedItem = { ...movedItem, Etapa: destColumn };

        let destIndex = destItems.length;
        if (!overIsColumn) {
            const overIndex = destItems.findIndex((item) => item.OportunidadID === overId);
            if (overIndex !== -1) {
                destIndex = overIndex;
            }
        }

        destItems.splice(destIndex, 0, updatedItem);

        setColumns((prev) => ({
            ...prev,
            [sourceColumn]: sourceItems,
            [destColumn]: destItems,
        }));

        const requiereModal = checkRequiereModal(destColumn);
        if (requiereModal) {
            setModalData({
                oportunidadId: activeId,
                etapa: destColumn,
                oportunidad: updatedItem,
            });
            return;
        }

        await updateEtapa(activeId, destColumn, {});
    };

    const checkRequiereModal = (etapa) => {
        return ['CITA_AGENDADA'].includes(etapa);
    };

    const mapColumnToEtapa = (columnKey) => {
        if (columnKey === 'CONTACTO_INICIADO') return 'CONTACTADO';
        return columnKey;
    };

    const updateEtapa = async (oportunidadId, etapa, data) => {
        try {
            await api.patch(`/oportunidades/${oportunidadId}/etapa`, {
                etapa: mapColumnToEtapa(etapa),
                ...data
            });
            loadKanbanData(); // Recargar para asegurar consistencia
            onMetricsRefresh?.();
        } catch (error) {
            console.error('Error al actualizar etapa:', error);
            alert('Error: ' + (error.response?.data?.error || 'No se pudo actualizar'));
            loadKanbanData(); // Revertir cambios
        }
    };

    const updateEstadoCierre = async (oportunidadId, estadoCierre, extra = {}) => {
        try {
            await api.put(`/oportunidades/${oportunidadId}`, {
                estadoCierre,
                ...extra
            });
            loadKanbanData();
            onMetricsRefresh?.();
        } catch (error) {
            console.error('Error al actualizar estado de cierre:', error);
            alert('Error: ' + (error.response?.data?.error || 'No se pudo actualizar'));
            loadKanbanData();
        }
    };

    const handleEstadoCierre = (oportunidad, estado) => {
        if (estado === 'Activo') {
            updateEstadoCierre(oportunidad.OportunidadID, estado, {
                proximoContactoFecha: null,
                motivoNoInteresado: null
            });
            return;
        }

        setEstadoModal({ oportunidad, estado });
    };

    const handleMoveTo = async (oportunidad, etapa) => {
        const requiereModal = checkRequiereModal(etapa);
        if (requiereModal) {
            setModalData({
                oportunidadId: oportunidad.OportunidadID,
                etapa,
                oportunidad
            });
            return;
        }

        await updateEtapa(oportunidad.OportunidadID, etapa, {});
    };

    const handleOpenPrograma = async (oportunidad, tipoPrograma) => {
        try {
            const ownerType = oportunidad.ContactoID ? 'contacto' : 'cliente';
            const ownerId = oportunidad.ContactoID || oportunidad.ClienteID;

            if (!ownerId) {
                alert('No hay owner disponible para este programa.');
                return;
            }

            const payload = {
                tipo: tipoPrograma,
                opportunity_id: oportunidad.OportunidadID,
                owner_type: ownerType,
                owner_id: ownerId,
                asesor_id: oportunidad.OwnerUserID,
            };

            const createResponse = await api.post('/programas', payload);
            const programa = createResponse.data;

            if (programa?.ProgramaID) {
                navigate(`/programas/${programa.ProgramaID}`);
            }
        } catch (error) {
            console.error('Error al abrir programa:', error);
            alert(error.response?.data?.error || 'No se pudo abrir el programa');
        }
    };

    const handleCrearOrden = async (oportunidad) => {
        try {
            const response = await api.post(`/oportunidades/${oportunidad.OportunidadID}/crear-orden`);
            alert(response.data?.message || 'Orden creada');
        } catch (error) {
            console.error('Error al crear orden:', error);
            alert('Error: ' + (error.response?.data?.error || 'No se pudo crear la orden'));
        }
    };

    const handleDetalleOpen = (oportunidad) => {
        setDetalleOportunidad(oportunidad);
    };

    const handleEditSave = async (payload) => {
        await api.patch(`/oportunidades/${editOportunidad.OportunidadID}`, payload);
        setEditOportunidad(null);
        setDetalleOportunidad(null);
        loadKanbanData();
        onMetricsRefresh?.();
    };

    const handleModalSubmit = async (data) => {
        await updateEtapa(modalData.oportunidadId, modalData.etapa, data);
        setModalData(null);
    };

    const handleModalCancel = () => {
        loadKanbanData(); // Revertir cambios optimistas
        setModalData(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-slate-500 font-medium">Cargando oportunidades...</p>
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
                <div className="h-full min-h-0 min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar kanban-board-scroll safe-bottom">
                    <div className="flex flex-nowrap items-start gap-6 w-max h-full overflow-visible min-h-0 min-w-0">
                        {ETAPAS_ACTIVAS.map(etapa => (
                            <KanbanColumn
                                key={etapa}
                                etapa={etapa}
                                oportunidades={columns[etapa] || []}
                                limitPerColumn={Number(filters?.limitPerColumn ?? 10)}
                                onCreate={() => onCreateInStage?.(etapa)}
                                onMoveTo={handleMoveTo}
                                onOpenPrograma={handleOpenPrograma}
                                onCrearOrden={handleCrearOrden}
                                onUpdateEstadoCierre={handleEstadoCierre}
                                onOpenDetalle={handleDetalleOpen}
                                onRefresh={loadKanbanData}
                            />
                        ))}
                    </div>
                </div>
            </DndContext>

            {modalData && (
                <EtapaModal
                    etapa={modalData.etapa}
                    oportunidad={modalData.oportunidad}
                    onSubmit={handleModalSubmit}
                    onCancel={handleModalCancel}
                />
            )}

            {estadoModal && (
                <EstadoCierreModal
                    estado={estadoModal.estado}
                    oportunidad={estadoModal.oportunidad}
                    onCancel={() => setEstadoModal(null)}
                    onSubmit={(extra) => {
                        updateEstadoCierre(estadoModal.oportunidad.OportunidadID, estadoModal.estado, extra);
                        setEstadoModal(null);
                    }}
                />
            )}

            {detalleOportunidad && (
                <OportunidadDetalleDrawer
                    oportunidad={detalleOportunidad}
                    onClose={() => setDetalleOportunidad(null)}
                    onRefresh={() => {
                        loadKanbanData();
                        onMetricsRefresh?.();
                    }}
                    onEditContacto={() => {
                        if (detalleOportunidad.ContactoID) {
                            navigate(`/contactos/${detalleOportunidad.ContactoID}`);
                        }
                    }}
                    onEditOportunidad={() => {
                        setEditOportunidad(detalleOportunidad);
                    }}
                />
            )}

            {editOportunidad && (
                <OportunidadEditModal
                    oportunidad={editOportunidad}
                    onClose={() => setEditOportunidad(null)}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
}

export default KanbanBoard;
