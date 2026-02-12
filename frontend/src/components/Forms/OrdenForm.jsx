import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import api from '../../services/api';
import ClientSelector from './ClientSelector';
import { formatCurrency } from '../../utils/formatters';

const OrdenForm = ({ initialData, clienteId, onSuccess, onCancel, loading: externalLoading }) => {
    const [formData, setFormData] = useState({
        NumeroOrden: `ORD-${Date.now().toString().slice(-6)}`,
        TipoOrden: 'Servicio',
        Fecha: new Date().toISOString().split('T')[0],
        Notas: '',
        Impuestos: 0,
        ...initialData
    });

    // Items State
    const [items, setItems] = useState(initialData?.items || []);
    const [selectedClient, setSelectedClient] = useState(null);
    const [loading, setLoading] = useState(false);

    // Pre-select client if provided
    useEffect(() => {
        if (clienteId && !selectedClient) {
            // Fetch client details if needed, or just assume ID is enough for form
            // For display purposes, we might need name. 
            // If clienteId is passed, we assume context is known.
        }
    }, [clienteId]);

    const handleClientSelect = (client) => {
        setSelectedClient(client);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        // Recalculate subtotal for item
        if (field === 'Cantidad' || field === 'PrecioUnitario') {
            newItems[index].Subtotal = newItems[index].Cantidad * newItems[index].PrecioUnitario;
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { Descripcion: '', Cantidad: 1, PrecioUnitario: 0, Subtotal: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.Cantidad) * Number(item.PrecioUnitario)), 0);
        const total = subtotal + Number(formData.Impuestos);
        return { subtotal, total };
    };

    const { subtotal, total } = calculateTotals();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!clienteId && !selectedClient) {
            alert('Por favor seleccione un cliente');
            return;
        }

        if (items.length === 0) {
            alert('Debe agregar al menos un ítem');
            return;
        }

        setLoading(true);
        try {
            await api.post('/ordenes', {
                ClienteID: clienteId || selectedClient.ClienteID,
                CuentaID: clienteId || selectedClient.ClienteID, // Simplified 1:1
                ...formData,
                items
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Error al crear orden');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header: Client & Basic Info */}
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
                {!clienteId && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Cliente</label>
                        <ClientSelector onSelect={handleClientSelect} selectedClient={selectedClient} />
                    </div>
                )}

                <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Número de Orden</label>
                        <input
                            type="text"
                            value={formData.NumeroOrden}
                            onChange={(e) => setFormData({ ...formData, NumeroOrden: e.target.value })}
                            className="w-full h-11 px-4 mt-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Tipo</label>
                        <select
                            value={formData.TipoOrden}
                            onChange={(e) => setFormData({ ...formData, TipoOrden: e.target.value })}
                            className="w-full h-11 px-4 mt-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                        >
                        <option value="Servicio">Servicio</option>
                        <option value="Venta">Venta</option>
                        <option value="Alquiler">Alquiler</option>
                    </select>
                </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Fecha</label>
                        <input
                            type="date"
                            value={formData.Fecha}
                            onChange={(e) => setFormData({ ...formData, Fecha: e.target.value })}
                            className="w-full h-11 px-4 mt-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                        />
                    </div>
            </div>

            {/* Items Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700">Ítems</h4>
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <Plus size={16} /> Agregar Ítem
                    </button>
                </div>

                <div className="space-y-6">
                    {items.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg group">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Descripción"
                                    value={item.Descripcion}
                                    onChange={(e) => handleItemChange(index, 'Descripcion', e.target.value)}
                                    className="w-full h-11 px-4 border rounded text-sm focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="w-20">
                                <input
                                    type="number"
                                    placeholder="Cant"
                                    value={item.Cantidad}
                                    onChange={(e) => handleItemChange(index, 'Cantidad', parseFloat(e.target.value) || 0)}
                                    className="w-full h-11 px-4 border rounded text-sm focus:border-blue-500 outline-none text-right"
                                    step="0.01"
                                />
                            </div>
                            <div className="w-24">
                                <input
                                    type="number"
                                    placeholder="Precio"
                                    value={item.PrecioUnitario}
                                    onChange={(e) => handleItemChange(index, 'PrecioUnitario', parseFloat(e.target.value) || 0)}
                                    className="w-full h-11 px-4 border rounded text-sm focus:border-blue-500 outline-none text-right"
                                    step="0.01"
                                />
                            </div>
                            <div className="w-24 py-3 text-right font-medium text-gray-700 text-sm">
                                {formatCurrency(item.Cantidad * item.PrecioUnitario)}
                            </div>
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-1.5 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            No hay ítems en la orden
                        </div>
                    )}
                </div>
            </div>

            {/* Totals & Footer */}
            <div className="border-t pt-4 flex flex-col items-end gap-2">
                <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                        <span>Impuestos:</span>
                            <input
                                type="number"
                                className="w-24 h-11 text-right border rounded px-4"
                                value={formData.Impuestos}
                                onChange={(e) => setFormData({ ...formData, Impuestos: parseFloat(e.target.value) || 0 })}
                            />
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 w-full md:w-auto">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading || externalLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 w-full md:w-auto"
                    >
                        {loading ? 'Procesando...' : 'Guardar Orden'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default OrdenForm;
