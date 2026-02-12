import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
                    <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-center">
                        <h1 className="text-xl font-semibold text-slate-800">Algo salio mal</h1>
                        <p className="mt-3 text-sm text-slate-600">
                            Ocurrio un error inesperado. Puedes intentar recargar la pagina.
                        </p>
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                        >
                            Recargar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
