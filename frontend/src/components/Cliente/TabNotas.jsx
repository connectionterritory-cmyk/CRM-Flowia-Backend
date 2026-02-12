import React, { useEffect, useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/formatters';

const TabNotas = ({ cliente }) => {
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newNota, setNewNota] = useState('');
    const [notaTipo, setNotaTipo] = useState('General');

    const fetchNotas = async () => {
        if (!cliente?.ClienteID) return;
        try {
            const response = await api.get(`/notas?clienteId=${cliente.ClienteID}`);
            setNotas(response.data);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotas();
    }, [cliente]);

    const handleAddNota = async (e) => {
        e.preventDefault();
        if (!newNota.trim()) return;

        try {
            await api.post('/notas', {
                ClienteID: cliente.ClienteID,
                Tipo: notaTipo,
                Contenido: newNota,
                CreadoPor: 'Usuario' // Hardcoded for MVP
            });
            setNewNota('');
            fetchNotas();
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await api.put(`/notas/${id}/marcar-leido`);
            fetchNotas();
        } catch (error) {
            console.error('Error marking note as read:', error);
        }
    };

    if (loading) return <div className="p-8 text-center bg-white rounded-xl">Cargando notas...</div>;

    return (
        <div className="space-y-6">
            {/* Add Note Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Nueva Nota</h3>
                <form onSubmit={handleAddNota} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <select
                            value={notaTipo}
                            onChange={(e) => setNotaTipo(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 outline-none focus:border-blue-500"
                        >
                            <option value="General">General</option>
                            <option value="Cobranza">Cobranza</option>
                            <option value="Servicio">Servicio</option>
                            <option value="Importante">Importante</option>
                        </select>
                        <input
                            type="text"
                            value={newNota}
                            onChange={(e) => setNewNota(e.target.value)}
                            placeholder="Escribe una nota..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg h-11 px-4 outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newNota.trim()}
                            className="bg-blue-600 text-white px-6 h-11 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Agregar
                        </button>
                    </div>
                </form>
            </div>

            {/* Notes List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">Historial de Notas</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {notas.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No hay notas registradas.</div>
                    ) : (
                        notas.map((nota) => (
                            <div key={nota.NotaID} className={`p-6 transition-colors ${nota.Leido ? 'bg-white' : 'bg-yellow-50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${nota.Tipo === 'Cobranza' ? 'bg-red-50 text-red-700 border-red-100' :
                                                nota.Tipo === 'Importante' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                    'bg-gray-50 text-gray-700 border-gray-100'
                                            }`}>
                                            {nota.Tipo}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatDateTime(nota.FechaCreacion)}</span>
                                    </div>
                                    {!nota.Leido && (
                                        <button
                                            onClick={() => handleMarkRead(nota.NotaID)}
                                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            <Check size={14} /> Marcar leído
                                        </button>
                                    )}
                                </div>
                                <p className="text-gray-800">{nota.Contenido}</p>
                                {nota.Leido === 1 && (
                                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                        <Check size={12} /> Leído el {formatDateTime(nota.FechaLeido)}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TabNotas;
