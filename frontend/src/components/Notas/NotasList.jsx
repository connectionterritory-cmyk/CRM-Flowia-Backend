import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import api from '../../services/api';

const NotasList = ({ notes, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos'); // Todos, No Leidos

    const filteredNotes = notes.filter(note => {
        const matchesSearch =
            note.Contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (note.ClienteNombre && note.ClienteNombre.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = filterStatus === 'Todos' ||
            (filterStatus === 'No Leidos' && note.Leido === 0);

        return matchesSearch && matchesStatus;
    });

    const markAsRead = async (id) => {
        try {
            await api.put(`/notas/${id}/marcar-leido`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error marking note as read:', error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar en notas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-600 cursor-pointer"
                    >
                        <option value="Todos">Todas</option>
                        <option value="No Leidos">No Leídas</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-50">
                {filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => (
                        <div key={note.NotaID} className={`p-4 hover:bg-gray-50 transition-colors ${note.Leido === 0 ? 'bg-blue-50/30' : ''}`}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Link
                                            to={`/clientes/${note.ClienteID}`}
                                            className="font-semibold text-gray-900 hover:text-blue-600 text-sm"
                                        >
                                            {note.ClienteNombre || `Cliente #${note.ClienteID}`}
                                        </Link>
                                        <span className="text-gray-300">•</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${note.Tipo === 'Cobranza' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {note.Tipo}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{note.Contenido}</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                        <Clock size={12} />
                                        {formatDateTime(note.FechaCreacion)}
                                        {note.CreadoPor && <span>por {note.CreadoPor}</span>}
                                    </div>
                                </div>

                                {note.Leido === 0 && (
                                    <button
                                        onClick={() => markAsRead(note.NotaID)}
                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                        title="Marcar como leída"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        No se encontraron notas.
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotasList;
