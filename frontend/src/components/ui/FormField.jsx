import React from 'react';

const FormField = ({ label, required = false, error, helper, children, className = '' }) => {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="text-xs font-semibold text-slate-500">
                    {label}
                    {required && <span className="text-rose-500"> *</span>}
                </label>
            )}
            {children}
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
            {!error && helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
        </div>
    );
};

export default FormField;
