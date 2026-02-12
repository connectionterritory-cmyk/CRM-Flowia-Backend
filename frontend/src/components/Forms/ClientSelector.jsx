import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../services/api';

const ClientSelector = ({ onSelect, selectedClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchTerm.length > 2) {
            const searchClients = async () => {
                setLoading(true);
                try {
                    // In a real app, use a search endpoint. For MVP, filtering client list.
                    // Ideally /clientes?search=...
                    const response = await api.get('/clientes');
                    const filtered = response.data.filter(c =>
                        c.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.Telefono && c.Telefono.includes(searchTerm))
                    );
                    setResults(filtered.slice(0, 5));
                    setIsOpen(true);
                } catch (error) {
                    console.error('Error searching clients:', error);
                } finally {
                    setLoading(false);
                }
            };

            const timeoutId = setTimeout(searchClients, 500);
            return () => clearTimeout(timeoutId);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [searchTerm]);

    const handleSelect = (client) => {
        onSelect(client);
        setIsOpen(false);
        setSearchTerm('');
    };

    const clearSelection = () => {
        onSelect(null);
        setSearchTerm('');
    };

    if (selectedClient) {
        return (
            <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg">
                <div>
                    <div className="font-medium text-blue-900">{selectedClient.Nombre}</div>
                    <div className="text-xs text-blue-700">{selectedClient.Email || selectedClient.Telefono}</div>
                </div>
                <button
                    onClick={clearSelection}
                    className="p-1 hover:bg-blue-100 rounded-full text-blue-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((client) => (
                        <button
                            key={client.ClienteID}
                            onClick={() => handleSelect(client)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                            <div className="font-medium text-gray-900">{client.Nombre}</div>
                            <div className="text-xs text-gray-500">{client.Telefono} • {client.Email}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientSelector;
