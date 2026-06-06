
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './store';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { supabase } from './src/lib/supabase';
import LoginPage from './src/components/Auth/LoginPage';
import ForgotPasswordPage from './src/components/Auth/ForgotPasswordPage';
import ResetPasswordPage from './src/components/Auth/ResetPasswordPage';
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

// ─── Sincroniza sessão Supabase → currentUser do store ───────────────────────

const AuthSync: React.FC = () => {
  const { supabaseUser } = useAuth();
  const { users, setCurrentUser } = useData();

  useEffect(() => {
    if (!supabaseUser) {
      setCurrentUser(null);
      return;
    }

    // Busca o usuário pelo e-mail cadastrado no store (dados locais/mock)
    const matched = users.find(
      u => u.email.toLowerCase() === supabaseUser.email?.toLowerCase()
    );

    if (matched) {
      setCurrentUser(matched);
    } else {
      // Fallback: cria um perfil a partir da sessão Supabase.
      // Usa o role do user_metadata quando disponível; caso contrário ADMIN,
      // pois qualquer usuário autenticado neste CRM tem acesso completo por padrão
      // até que o gerenciamento de papéis via tabela users esteja implementado.
      setCurrentUser({
        id:        supabaseUser.id,
        name:      supabaseUser.user_metadata?.name ?? supabaseUser.email ?? 'Usuário',
        email:     supabaseUser.email ?? '',
        role:      supabaseUser.user_metadata?.role ?? 'ADMIN',
        phone:     supabaseUser.user_metadata?.phone ?? '',
        password:  '',
        status:    'ATIVO',
        createdAt: supabaseUser.created_at,
      });
    }
  }, [supabaseUser, users]);

  return null;
};

// ─── Guard + roteamento de views de autenticação ─────────────────────────────

type AuthView = 'login' | 'forgot' | 'reset';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');

  // Detecta o evento PASSWORD_RECOVERY que o supabase-js dispara automaticamente
  // quando os tokens de recuperação são encontrados no fragment da URL.
  // Isso acontece quando o usuário clica no link de redefinição do e-mail.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redefinição de senha: exibida mesmo com sessão ativa
  // (o Supabase cria uma sessão temporária durante o fluxo de recovery)
  if (authView === 'reset') {
    return <ResetPasswordPage onDone={() => setAuthView('login')} />;
  }

  if (!session) {
    if (authView === 'forgot') {
      return <ForgotPasswordPage onBack={() => setAuthView('login')} />;
    }
    return <LoginPage onForgotPassword={() => setAuthView('forgot')} />;
  }

  return <>{children}</>;
};

// ─── Layout principal (apenas para rotas protegidas) ─────────────────────────

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sidebarCollapsed } = useData();

  return (
    <div className="min-h-screen flex bg-slate-50 w-full overflow-x-hidden">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
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

// ─── Rotas ───────────────────────────────────────────────────────────────────

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/"                      element={<Dashboard />} />
    <Route path="/funil"                 element={<FunnelView />} />
    <Route path="/clientes"              element={<ClientsView />} />
    <Route path="/acoes-cs"              element={<CSActionsView />} />
    <Route path="/atendimentos-cs"       element={<CSDailyServicesView />} />
    <Route path="/agenda"                element={<AgendaView />} />
    <Route path="/admin/turmas"          element={<TurmasAdmin />} />
    <Route path="/admin/usuarios"        element={<UsersAdmin />} />
    <Route path="/admin/funis"           element={<FunnelConfig />} />
    <Route path="/admin/instituicoes"    element={<InstituicoesAdmin />} />
    <Route path="/admin/cursos"          element={<CursosAdmin />} />
    <Route path="/admin/produtos"        element={<ProdutosAdmin />} />
    <Route path="/admin/eventos"         element={<EventosAdmin />} />
    <Route path="/admin/tipos-atividade" element={<ActivityTypesAdmin />} />
    <Route path="/admin/seguranca"       element={<DatabaseAdmin />} />
    <Route path="/admin/lixeira"         element={<TrashPage />} />
    <Route path="/admin/*"               element={<Navigate to="/" replace />} />
  </Routes>
);

// ─── Raiz ─────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <AuthProvider>
    <DataProvider>
      <Router>
        <AuthSync />
        <ProtectedRoute>
          <Layout>
            <AppRoutes />
          </Layout>
        </ProtectedRoute>
      </Router>
    </DataProvider>
  </AuthProvider>
);

export default App;
