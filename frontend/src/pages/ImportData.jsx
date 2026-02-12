import React from 'react';
import { useTranslation } from 'react-i18next';
import CSVImporter from '../components/Import/CSVImporter';

const ImportData = () => {
    const { t } = useTranslation();
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('pages.importTitle')}</h1>
                <p className="text-gray-500">{t('pages.importSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <CSVImporter
                    endpoint="/import/clientes"
                    label={t('import.labels.customers')}
                    template="Nombre, Telefono, Email, Direccion, Ciudad, Pais, TipoCliente, Estado"
                />

                <CSVImporter
                    endpoint="/import/ordenes"
                    label={t('import.labels.orders')}
                    template="ClienteID, NumeroOrden, Fecha, FechaVencimiento, TipoOrden, Subtotal, Impuestos, Total, Estado"
                />

                <CSVImporter
                    endpoint="/import/transacciones"
                    label={t('import.labels.transactions')}
                    template="ClienteID, CuentaID, OrdenID, Tipo, Monto, Fecha, MetodoPago, Referencia, Descripcion"
                />
            </div>
        </div>
    );
};

export default ImportData;
