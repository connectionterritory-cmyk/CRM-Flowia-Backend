import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <h1 className="text-6xl font-bold text-gray-200">404</h1>
            <p className="text-gray-500 mt-4 mb-8">Página no encontrada</p>
            <Link to="/" className="text-blue-600 hover:underline">
                Volver al Dashboard
            </Link>
        </div>
    );
};

export default NotFound;
