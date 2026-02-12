import React, { useEffect, useState } from 'react';
import { MessageSquare, Phone, Mail } from 'lucide-react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/formatters';

const TabMensajes = ({ cliente }) => {
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMensajes = async () => {
            if (!cliente?.ClienteID) return;
            try {
                const response = await api.get(`/mensajes?clienteId=${cliente.ClienteID}`);
                setMensajes(response.data);
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMensajes();
    }, [cliente]);

    if (loading) return <div className="p-8 text-center bg-white rounded-xl">Cargando mensajes...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Registro de Comunicaciones</h3>
                <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-gray-200">
                        <MessageSquare size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200">
                        <Phone size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-gray-200">
                        <Mail size={18} />
                    </button>
                </div>
            </div>

            <div className="divide-y divide-gray-50 flex-1">
                {mensajes.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No hay mensajes registrados.</div>
                ) : (
                    mensajes.map((msg) => (
                        <div key={msg.MensajeID} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${msg.Tipo === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                                        msg.Tipo === 'Email' ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                    }`}>
                                    {msg.Tipo}
                                </span>
                                <span className="text-xs text-gray-400">{formatDateTime(msg.FechaRegistro)}</span>
                            </div>
                            <p className="text-gray-900 font-medium mb-1">{msg.Contenido}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-gray-500">{msg.Direccion}</span>
                                <span className="text-xs font-medium text-gray-400 px-2 py-0.5 bg-gray-100 rounded">
                                    {msg.Estado}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TabMensajes;
