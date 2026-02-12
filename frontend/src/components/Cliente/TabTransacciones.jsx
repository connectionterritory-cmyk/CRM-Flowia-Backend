import React, { useEffect, useState } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const TabTransacciones = ({ cliente }) => {
    const [transacciones, setTransacciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransacciones = async () => {
            if (!cliente?.ClienteID) return;
            try {
                const response = await api.get(`/transacciones?clienteId=${cliente.ClienteID}`);
                setTransacciones(response.data);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTransacciones();
    }, [cliente]);

    if (loading) return <div className="p-8 text-center bg-white rounded-xl">Cargando transacciones...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Historial de Transacciones</h3>
                <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <Plus size={16} /> Registrar Pago
                </button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">Fecha</th>
                            <th className="px-6 py-3 font-medium">Tipo</th>
                            <th className="px-6 py-3 font-medium">Descripción</th>
                            <th className="px-6 py-3 font-medium">Método</th>
                            <th className="px-6 py-3 font-medium text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {transacciones.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                    No hay transacciones registradas.
                                </td>
                            </tr>
                        ) : (
                            transacciones.map((tx) => (
                                <tr key={tx.TransaccionID} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-600">{formatDate(tx.Fecha)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {tx.Tipo === 'Pago'
                                                ? <ArrowDownLeft size={16} className="text-green-500" />
                                                : <ArrowUpRight size={16} className="text-red-500" />
                                            }
                                            <span className="font-medium text-gray-900">{tx.Tipo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{tx.Descripcion || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">{tx.MetodoPago || '-'}</td>
                                    <td className={`px-6 py-4 text-right font-medium ${tx.Monto < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                        {formatCurrency(tx.Monto)}
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

export default TabTransacciones;
