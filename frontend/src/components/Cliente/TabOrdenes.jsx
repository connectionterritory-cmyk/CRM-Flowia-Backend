import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';

const TabOrdenes = ({ cliente }) => {
    const [ordenes, setOrdenes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrdenes = async () => {
            if (!cliente?.ClienteID) return;
            try {
                const response = await api.get(`/ordenes?clienteId=${cliente.ClienteID}`);
                setOrdenes(response.data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrdenes();
    }, [cliente]);

    if (loading) return <div className="p-8 text-center bg-white rounded-xl">Cargando órdenes...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Historial de Órdenes</h3>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Plus size={16} /> Nueva Orden
                </button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">Orden #</th>
                            <th className="px-6 py-3 font-medium">Fecha</th>
                            <th className="px-6 py-3 font-medium">Tipo</th>
                            <th className="px-6 py-3 font-medium text-right">Total</th>
                            <th className="px-6 py-3 font-medium text-right">Balance</th>
                            <th className="px-6 py-3 font-medium text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {ordenes.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                    No hay órdenes registradas.
                                </td>
                            </tr>
                        ) : (
                            ordenes.map((orden) => (
                                <tr key={orden.OrdenID} className="hover:bg-gray-50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4 font-medium text-gray-900">{orden.NumeroOrden}</td>
                                    <td className="px-6 py-4 text-gray-600">{formatDate(orden.Fecha)}</td>
                                    <td className="px-6 py-4 text-gray-600">{orden.TipoOrden}</td>
                                    <td className="px-6 py-4 text-gray-900 font-medium text-right">{formatCurrency(orden.Total)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={orden.Balance > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                            {formatCurrency(orden.Balance)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(orden.Estado)}`}>
                                            {orden.Estado}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TabOrdenes;
