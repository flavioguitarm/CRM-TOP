
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import FunnelView from './pages/Funnel';
import ClientsView from './pages/Clients';
import CSActionsView from './pages/CSActions';
import CSDailyServicesView from './pages/CSDailyServices';
import TurmasAdmin from './pages/Admin/Turmas';
import UsersAdmin from './pages/Admin/Users';
import FunnelConfig from './pages/Admin/FunnelConfig';
import InstituicoesAdmin from './pages/Admin/Instituicoes';
import CursosAdmin from './pages/Admin/Cursos';
import ProdutosAdmin from './pages/Admin/Produtos';
import EventosAdmin from './pages/Admin/Eventos';
import ActivityTypesAdmin from './pages/Admin/ActivityTypes';
import TrashPage from './pages/Admin/Trash';
import DatabaseAdmin from './pages/Admin/Database';
import AgendaView from './pages/Agenda';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, sidebarCollapsed } = useData();
  
  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-inner">
            <GraduationCap size={40} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center text-slate-900">Login CRM Formaturas</h1>
          <p className="text-slate-500 text-center mb-8">Gestão comercial inteligente para empresas de formatura.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
          >
            Entrar como Administrador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 w-full overflow-x-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header />
        <main className="pt-16 min-h-screen w-full flex flex-col">
          <div className="p-4 md:p-8 flex-1 w-full max-w-full overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const GraduationCap = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/funil" element={<FunnelView />} />
      <Route path="/clientes" element={<ClientsView />} />
      <Route path="/acoes-cs" element={<CSActionsView />} />
      <Route path="/atendimentos-cs" element={<CSDailyServicesView />} />
      <Route path="/agenda" element={<AgendaView />} />
      <Route path="/admin/turmas" element={<TurmasAdmin />} />
      <Route path="/admin/usuarios" element={<UsersAdmin />} />
      <Route path="/admin/funis" element={<FunnelConfig />} />
      <Route path="/admin/instituicoes" element={<InstituicoesAdmin />} />
      <Route path="/admin/cursos" element={<CursosAdmin />} />
      <Route path="/admin/produtos" element={<ProdutosAdmin />} />
      <Route path="/admin/eventos" element={<EventosAdmin />} />
      <Route path="/admin/tipos-atividade" element={<ActivityTypesAdmin />} />
      <Route path="/admin/seguranca" element={<DatabaseAdmin />} />
      <Route path="/admin/lixeira" element={<TrashPage />} />
      <Route path="/admin/*" element={
        <div className="p-12 text-center text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Navigate to="/" />
          </div>
          <h2 className="text-xl font-bold text-slate-600">Funcionalidade em desenvolvimento</h2>
          <p>Esta tela faz parte da estrutura administrativa prevista no Cadastro Geral.</p>
        </div>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </DataProvider>
  );
};

export default App;
