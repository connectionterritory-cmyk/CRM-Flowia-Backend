import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const CSVImporter = ({ endpoint, label, template }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const { t } = useTranslation();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResult(response.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || t('import.uploadError'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                {t('import.cardTitle', { label })}
            </h3>

            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id={`file-${label}`}
                />
                <label htmlFor={`file-${label}`} className="cursor-pointer flex flex-col items-center">
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <span className="text-gray-600 font-medium">{t('buttons.selectFile')}</span>
                    <span className="text-xs text-gray-400 mt-1">{t('buttons.fileFormat')}</span>
                </label>
                {file && (
                    <div className="mt-4 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm">
                        <FileText size={14} />
                        {file.name}
                    </div>
                )}
            </div>

            {/* Template Info */}
            <div className="mt-4 text-xs text-gray-400 bg-gray-50 p-3 rounded">
                <span className="font-semibold">{t('import.expectedFormat')} </span>
                {template}
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {uploading ? t('buttons.uploading') : t('buttons.uploadProcess')}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="mt-4 bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-bold">{t('import.completed')}</p>
                        <p>{t('import.processed', { count: result.count })}</p>
                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-2 text-red-600">
                                <p className="font-semibold">{t('import.errors', { count: result.errors.length })}</p>
                                <ul className="list-disc list-inside text-xs">
                                    {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                                    {result.errors.length > 5 && <li>{t('import.more', { count: result.errors.length - 5 })}</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}
        </div>
    );
};

export default CSVImporter;
