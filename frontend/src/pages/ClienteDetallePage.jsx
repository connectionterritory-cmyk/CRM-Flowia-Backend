import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, ArrowLeft, MoreHorizontal, UserPlus } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import ReferralSimpleModal from '../components/Referrals/ReferralSimpleModal';

// Tabs
import TabDetalles from '../components/Cliente/TabDetalles';
import TabCuentaRP from '../components/Cliente/TabCuentaRP';
import TabOrdenes from '../components/Cliente/TabOrdenes';
import TabTransacciones from '../components/Cliente/TabTransacciones';
import TabNotas from '../components/Cliente/TabNotas';
import TabMensajes from '../components/Cliente/TabMensajes';

const ClienteDetallePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('detalles');
    const [showReferralModal, setShowReferralModal] = useState(false);

    const fetchCliente = async () => {
        try {
            const response = await api.get(`/clientes/${id}`);
            setCliente(response.data);
        } catch (error) {
            console.error('Error fetching client:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCliente();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Cargando...</div>;
    if (!cliente) return <div className="p-8 text-center text-slate-500 font-bold">Cliente no encontrado</div>;

    const tabs = [
        { id: 'detalles', label: 'Detalles' },
        { id: 'cuenta', label: 'Cuenta RP' },
        { id: 'ordenes', label: 'Órdenes' },
        { id: 'transacciones', label: 'Transacciones' },
        { id: 'notas', label: 'Notas' },
        { id: 'mensajes', label: 'Mensajes' },
    ];

    return (
        <div className="workspace-container pb-20">
            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{cliente.Nombre}</h1>
                            <span className={`badge ${cliente.Estado === 'Activo' ? 'badge-success' :
                                    cliente.Estado === 'Moroso' ? 'badge-danger' : 'badge-info'
                                }`}>
                                {cliente.Estado}
                            </span>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">ID: CLIENTE-{id.substring(0, 8)} • {cliente.TipoCliente}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowReferralModal(true)}
                        className="btn-secondary !py-2.5 !rounded-2xl flex items-center gap-2 group"
                    >
                        <UserPlus size={16} className="text-emerald-500" />
                        Agregar referido
                    </button>
                    <button className="btn-secondary !py-2.5 !rounded-2xl flex items-center gap-2 group">
                        <MoreHorizontal size={18} className="text-slate-400 group-hover:text-slate-600" />
                        Acciones
                    </button>
                    <button className="btn-primary !py-2.5 !rounded-2xl shadow-indigo-600/10">
                        Generar Cobro
                    </button>
                </div>
            </div>

            {showReferralModal && (
                <ReferralSimpleModal
                    ownerPersonId={cliente.ClienteID}
                    ownerPersonType="CLIENTE"
                    onClose={() => setShowReferralModal(false)}
                    onSuccess={() => {}}
                />
            )}

            {/* Client Summary Bar */}
            <div className="card-premium mb-8 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden">
                <div className="p-8 group hover:bg-slate-50/50 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Saldo Pendiente</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{formatCurrency(cliente.cuenta?.SaldoTotal)}</h3>
                        <span className="text-[11px] font-bold text-slate-400 italic">Total</span>
                    </div>
                </div>
                <div className="p-8 group hover:bg-slate-50/50 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Información de Contacto</p>
                    <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 truncate">
                        <Phone size={14} className="text-indigo-500" />
                        <span className="truncate">{cliente.Telefono || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500 truncate">
                        <Mail size={14} className="text-indigo-400" />
                        <span className="truncate">{cliente.Email || '-'}</span>
                    </div>
                </div>
                </div>
                <div className="p-8 group hover:bg-slate-50/50 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Ubicación</p>
                <div className="flex items-start gap-2 text-sm font-medium text-slate-600 leading-tight">
                    <MapPin size={16} className="text-rose-400 mt-0.5" />
                    <div className="min-w-0">
                        <p className="truncate">{cliente.Direccion || 'No especificada'}</p>
                        <p className="text-xs text-slate-400 truncate">
                            {[cliente.Ciudad, cliente.EstadoProvincia, cliente.Zipcode, cliente.Pais]
                                .filter(Boolean)
                                .join(', ') || 'Ubicación sin detalles'}
                        </p>
                    </div>
                </div>
                </div>
                <div className="p-8 group hover:bg-slate-50/50 transition-colors flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <span className="font-black">MC</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800">Moises Caicedo</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asesor Asignado</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Area */}
            <div className="space-y-8">
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-[18px] w-fit border border-slate-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'detalles' && <TabDetalles cliente={cliente} onUpdate={fetchCliente} />}
                    {activeTab === 'cuenta' && <TabCuentaRP cliente={cliente} />}
                    {activeTab === 'ordenes' && <TabOrdenes cliente={cliente} />}
                    {activeTab === 'transacciones' && <TabTransacciones cliente={cliente} />}
                    {activeTab === 'notas' && <TabNotas cliente={cliente} />}
                    {activeTab === 'mensajes' && <TabMensajes cliente={cliente} />}
                </div>
            </div>
        </div>
    );
};

export default ClienteDetallePage;
