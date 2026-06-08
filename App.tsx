
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './store';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { canAccessModule, AppModule } from './src/hooks/usePermissions';
import { UserRole } from './types';
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
import UserProfile from './pages/UserProfile';
import { Bot } from 'lucide-react';

// ─── Placeholder: Automação de Funis ─────────────────────────────────────────
const AutomacaoFunisPlaceholder: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 py-24">
    <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
      <Bot size={32} className="text-slate-300" />
    </div>
    <h2 className="text-xl font-black text-slate-700 uppercase tracking-tight">Automação de Funis</h2>
    <p className="text-sm font-medium text-slate-400">Em desenvolvimento — em breve aqui.</p>
  </div>
);

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

// ─── Guard de rota por módulo/role ───────────────────────────────────────────

const RoleGuard: React.FC<{ module: AppModule; children: React.ReactNode }> = ({ module, children }) => {
  const { currentUser } = useData();
  const role = currentUser?.role as UserRole | undefined;
  if (!canAccessModule(role, module)) {
    return <Navigate to="/" replace />;
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
    {/* Operação — todos os roles autenticados */}
    <Route path="/"              element={<RoleGuard module="dashboard">      <Dashboard />           </RoleGuard>} />
    <Route path="/funil"         element={<RoleGuard module="funil">          <FunnelView />          </RoleGuard>} />
    <Route path="/clientes"      element={<RoleGuard module="clientes">       <ClientsView />         </RoleGuard>} />
    <Route path="/acoes-cs"      element={<RoleGuard module="acoesCs">        <CSActionsView />       </RoleGuard>} />
    <Route path="/atendimentos-cs" element={<RoleGuard module="atendimentosCs"><CSDailyServicesView /></RoleGuard>} />
    <Route path="/agenda"        element={<RoleGuard module="agenda">         <AgendaView />          </RoleGuard>} />

    {/* Cadastro Geral — ADMIN + GESTOR */}
    <Route path="/admin/turmas"          element={<RoleGuard module="turmas">       <TurmasAdmin />       </RoleGuard>} />
    <Route path="/admin/funis"           element={<RoleGuard module="funis">        <FunnelConfig />      </RoleGuard>} />
    <Route path="/admin/instituicoes"    element={<RoleGuard module="instituicoes"> <InstituicoesAdmin /> </RoleGuard>} />
    <Route path="/admin/cursos"          element={<RoleGuard module="cursos">       <CursosAdmin />       </RoleGuard>} />
    <Route path="/admin/produtos"        element={<RoleGuard module="produtos">     <ProdutosAdmin />     </RoleGuard>} />
    <Route path="/admin/eventos"         element={<RoleGuard module="eventos">      <EventosAdmin />      </RoleGuard>} />
    <Route path="/admin/tipos-atividade" element={<RoleGuard module="activityTypes"><ActivityTypesAdmin /></RoleGuard>} />
    <Route path="/admin/automacao-funis" element={<RoleGuard module="funis"><AutomacaoFunisPlaceholder /></RoleGuard>} />

    {/* Sistema — ADMIN apenas */}
    <Route path="/admin/lixeira"         element={<RoleGuard module="lixeira">      <TrashPage />         </RoleGuard>} />

    {/* Restritos — ADMIN apenas */}
    <Route path="/admin/usuarios"  element={<RoleGuard module="usuarios"> <UsersAdmin />   </RoleGuard>} />
    <Route path="/admin/seguranca" element={<RoleGuard module="database"> <DatabaseAdmin /> </RoleGuard>} />

    {/* Fallbacks */}
    <Route path="/admin/*" element={<Navigate to="/" replace />} />
    <Route path="/perfil"  element={<UserProfile />} />
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
