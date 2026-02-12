import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import ClienteDetallePage from './pages/ClienteDetallePage';
import ClientesPage from './pages/ClientesPage';
import ClienteFormPage from './pages/ClienteFormPage';
import OrdenesPage from './pages/OrdenesPage';
import OrdenesFormPage from './pages/OrdenesFormPage';
import NotasPage from './pages/NotasPage';
import Pipeline from './pages/Pipeline';
import ImportData from './pages/ImportData';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import ProgramaDetalle from './pages/ProgramaDetalle';
import ProgramasPage from './pages/ProgramasPage';
import ContactosPage from './pages/ContactosPage';
import ContactoDetallePage from './pages/ContactoDetallePage';
import ContactoFormPage from './pages/ContactoFormPage';
import SettingsPage from './pages/SettingsPage';
import RoleLanding from './pages/RoleLanding';
import TelemarketingDashboard from './pages/dashboards/TelemarketingDashboard';
import AsesorDashboard from './pages/dashboards/AsesorDashboard';
import DistribuidorDashboard from './pages/dashboards/DistribuidorDashboard';
import UsersPage from './pages/UsersPage';
import UserFormPage from './pages/UserFormPage';


function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<RoleLanding />} />
                    <Route path="dashboard" element={<RoleLanding />} />
                    <Route
                        path="dashboard/telemarketing"
                        element={
                            <RoleRoute allow={["TELEMARKETING"]}>
                                <TelemarketingDashboard />
                            </RoleRoute>
                        }
                    />
                    <Route
                        path="dashboard/asesor"
                        element={
                            <RoleRoute allow={["VENDEDOR", "ASESOR"]}>
                                <AsesorDashboard />
                            </RoleRoute>
                        }
                    />
                    <Route
                        path="dashboard/distribuidor"
                        element={
                            <RoleRoute allow={["DISTRIBUIDOR", "ADMIN", "GERENTE"]}>
                                <DistribuidorDashboard />
                            </RoleRoute>
                        }
                    />
                    <Route path="dashboard/overview" element={<Dashboard />} />
                    <Route path="clientes" element={<ClientesPage />} />
                    <Route path="contactos" element={<ContactosPage />} />
                    <Route path="contactos/new" element={<ContactoFormPage />} />
                    <Route path="contactos/:id" element={<ContactoDetallePage />} />
                    <Route
                        path="equipo"
                        element={
                            <RoleRoute allow={["ADMIN", "DISTRIBUIDOR"]}>
                                <UsersPage />
                            </RoleRoute>
                        }
                    />
                    <Route
                        path="equipo/new"
                        element={
                            <RoleRoute allow={["ADMIN", "DISTRIBUIDOR"]}>
                                <UserFormPage />
                            </RoleRoute>
                        }
                    />
                    <Route
                        path="equipo/:id"
                        element={
                            <RoleRoute allow={["ADMIN", "DISTRIBUIDOR"]}>
                                <UserFormPage />
                            </RoleRoute>
                        }
                    />
                    <Route
                        path="settings"
                        element={
                            <RoleRoute allow={["DISTRIBUIDOR", "ADMIN", "GERENTE"]}>
                                <SettingsPage />
                            </RoleRoute>
                        }
                    />
                    <Route path="clientes/new" element={<ClienteFormPage />} />
                    <Route path="clientes/:id" element={<ClienteDetallePage />} />
                    <Route path="ordenes" element={<OrdenesPage />} />
                    <Route path="ordenes/new" element={<OrdenesFormPage />} />
                    <Route path="servicios" element={<OrdenesPage type="Servicio" />} />
                    <Route path="notas" element={<NotasPage />} />
                    <Route path="pipeline" element={<Pipeline />} />
                    <Route path="import" element={<ImportData />} />
                    <Route path="programas" element={<ProgramasPage />} />
                    <Route path="programas/:id" element={<ProgramaDetalle />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
