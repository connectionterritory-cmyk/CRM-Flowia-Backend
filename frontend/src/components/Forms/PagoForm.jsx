import React, { useState } from 'react';
import api from '../../services/api';

const PagoForm = ({ clienteId, onSuccess, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Transferencia');
    const [reference, setReference] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !clienteId) return;

        setLoading(true);
        try {
            await api.post('/transacciones', {
                ClienteID: clienteId,
                CuentaID: clienteId, // Assuming 1:1 relation logic from earlier
                OrdenID: null, // Global payment
                Tipo: 'Pago',
                Monto: -Math.abs(parseFloat(amount)), // Payments are negative
                Fecha: new Date().toISOString().split('T')[0],
                MetodoPago: method,
                Referencia: reference,
                Descripcion: `Pago recibido via ${method}`
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Error al registrar pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Pago</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Monto ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-11 px-4 mt-2 border rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Método de Pago</label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full h-11 px-4 mt-2 border rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none"
                    >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Tarjeta">Tarjeta</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Referencia / No. Comprobante</label>
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="w-full h-11 px-4 mt-2 border rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none"
                    />
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : 'Confirmar Pago'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PagoForm;
