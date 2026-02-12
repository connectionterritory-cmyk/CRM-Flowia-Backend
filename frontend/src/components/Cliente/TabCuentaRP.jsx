import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const TabCuentaRP = ({ cliente }) => {
    const { cuenta } = cliente;

    if (!cuenta) return <div className="p-4 bg-white rounded-xl">No hay información de cuenta.</div>;

    const items = [
        { label: 'Saldo Total', value: formatCurrency(cuenta.SaldoTotal), bold: true },
        { label: 'Saldo Vencido', value: formatCurrency(cuenta.SaldoVencido), color: 'text-red-600' },
        { label: 'Pago Mínimo', value: formatCurrency(cuenta.PagoMinimo) },
        { label: 'Límite Crédito', value: formatCurrency(cuenta.LimiteCredito) },
        { label: 'Días Crédito', value: cuenta.DiasCredito },
        { label: 'Último Pago', value: `${formatCurrency(cuenta.UltimoPago)} (${formatDate(cuenta.FechaUltimoPago)})` },
    ];

    const agingBuckets = [
        { label: '0-30 días', value: cuenta.Aging_0_30 },
        { label: '31-60 días', value: cuenta.Aging_31_60 },
        { label: '61-90 días', value: cuenta.Aging_61_90 },
        { label: '90+ días', value: cuenta.Aging_90Plus, color: 'text-red-600 font-bold' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Cuenta</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {items.map((item, index) => (
                        <div key={index}>
                            <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                            <p className={`font-medium text-gray-900 ${item.bold ? 'font-bold text-lg' : ''} ${item.color || ''}`}>
                                {item.value || '-'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Antigüedad de Saldos (Aging)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {agingBuckets.map((bucket, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-500 mb-2">{bucket.label}</p>
                            <p className={`text-xl font-medium ${bucket.color || 'text-gray-900'}`}>
                                {formatCurrency(bucket.value)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Registrar Pago (Ir a Transacciones)
                </button>
            </div>
        </div>
    );
};

export default TabCuentaRP;
