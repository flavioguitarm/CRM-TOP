
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Funnel,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Package,
  Calendar,
  UserCircle2,
  ChevronDown,
  ChevronRight,
  Menu,
  ChevronLeft,
  Zap,
  Trash2,
  Headset,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertTriangle,
  GitBranch,
  Bot,
} from 'lucide-react';
import { useData } from '../store';
import { UserRole } from '../types';
import { canAccessModule, AppModule } from '../src/hooks/usePermissions';
import { supabase } from '../src/lib/supabase';

// ─── Definição de itens de menu ───────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  module: AppModule;
  /** Se true, clique abre gate de senha antes de navegar */
  passwordGated?: boolean;
}

const OPERACAO_ITEMS: NavItem[] = [
  { path: '/',                label: 'Dashboard',            icon: LayoutDashboard, module: 'dashboard'      },
  // Negociações é tratado separadamente (sub-menu) — mantido aqui apenas para filtro de permissão
  { path: '/clientes',        label: 'Clientes',             icon: Users,           module: 'clientes'       },
  { path: '/acoes-cs',        label: 'Painel de Ações',      icon: Zap,             module: 'acoesCs'        },
  { path: '/atendimentos-cs', label: 'Atendimentos Diários', icon: Headset,         module: 'atendimentosCs' },
  { path: '/agenda',          label: 'Agenda Integrada',     icon: Calendar,        module: 'agenda'         },
];

// Cadastro Geral — ADMIN + GESTOR
const CADASTRO_ITEMS: NavItem[] = [
  { path: '/admin/instituicoes', label: 'Instituições',       icon: Building2,     module: 'instituicoes' },
  { path: '/admin/cursos',       label: 'Cursos',             icon: BookOpen,      module: 'cursos'       },
  { path: '/admin/produtos',     label: 'Catálogo de Vendas', icon: Package,       module: 'produtos'     },
  { path: '/admin/turmas',       label: 'Gestão de Projetos', icon: GraduationCap, module: 'turmas'       },
  { path: '/admin/eventos',      label: 'Cronograma Mestre',  icon: Calendar,      module: 'eventos'      },
];

// Sistema — ADMIN apenas
const RESTRITO_ITEMS: NavItem[] = [
  { path: '/admin/usuarios', label: 'Usuários', icon: UserCircle2, module: 'usuarios', passwordGated: true },
  { path: '/admin/lixeira',  label: 'Lixeira',  icon: Trash2,      module: 'lixeira',  passwordGated: true },
];

// ─── Helpers visuais ──────────────────────────────────────────────────────────

interface NavLinkProps { item: NavItem; collapsed: boolean; pathname: string; onGatedClick?: (path: string) => void; }

const NavLink: React.FC<NavLinkProps> = ({ item, collapsed, pathname, onGatedClick }) => {
  const active = pathname === item.path;
  const handleClick = item.passwordGated && onGatedClick
    ? (e: React.MouseEvent) => { e.preventDefault(); onGatedClick(item.path); }
    : undefined;

  if (collapsed) {
    return (
      <Link
        to={item.passwordGated ? '#' : item.path}
        title={item.label}
        onClick={handleClick}
        className={`flex items-center justify-center px-3 py-3 rounded-xl transition-all ${
          active ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800 text-slate-400'
        }`}
      >
        <item.icon size={22} className={active ? 'text-white' : ''} />
      </Link>
    );
  }
  return (
    <Link
      to={item.passwordGated ? '#' : item.path}
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
        active ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800'
      }`}
    >
      <item.icon size={22} className={active ? 'text-white' : 'text-slate-400'} />
      <span className="font-semibold text-sm">{item.label}</span>
    </Link>
  );
}

const SmallNavLink: React.FC<NavLinkProps> = ({ item, collapsed, pathname, onGatedClick }) => {
  const active = pathname === item.path;
  const handleClick = item.passwordGated && onGatedClick
    ? (e: React.MouseEvent) => { e.preventDefault(); onGatedClick(item.path); }
    : undefined;

  if (collapsed) {
    return (
      <Link
        to={item.passwordGated ? '#' : item.path}
        title={item.label}
        onClick={handleClick}
        className={`flex items-center justify-center px-3 py-3 rounded-xl mb-1 transition-all ${
          active ? 'bg-slate-800 text-amber-400 shadow-inner' : 'hover:bg-slate-800 text-slate-500'
        }`}
      >
        <item.icon size={20} />
      </Link>
    );
  }
  return (
    <Link
      to={item.passwordGated ? '#' : item.path}
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        active ? 'bg-slate-800 text-white shadow-inner' : 'hover:bg-slate-800'
      }`}
    >
      <item.icon size={18} className={active ? 'text-amber-400' : 'text-slate-500'} />
      <span className="font-medium text-sm">{item.label}</span>
    </Link>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const Sidebar: React.FC = () => {
  const { currentUser, sidebarCollapsed, setSidebarCollapsed } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOperacaoExpanded,  setIsOperacaoExpanded]  = useState(true);
  const [isCadastroExpanded,  setIsCadastroExpanded]  = useState(true);
  const [isRestritoExpanded,  setIsRestritoExpanded]  = useState(true);
  const [isNegExpanded,       setIsNegExpanded]       = useState(false);

  // ── Gate de senha ──────────────────────────────────────────────────────────
  const [pwdModalOpen,  setPwdModalOpen]  = useState(false);
  const [pwdTarget,     setPwdTarget]     = useState('');
  const [pwdPassword,   setPwdPassword]   = useState('');
  const [pwdShowPwd,    setPwdShowPwd]    = useState(false);
  const [pwdLoading,    setPwdLoading]    = useState(false);
  const [pwdError,      setPwdError]      = useState<string | null>(null);

  const openPwdGate = (path: string) => {
    setPwdTarget(path);
    setPwdPassword('');
    setPwdError(null);
    setPwdShowPwd(false);
    setPwdModalOpen(true);
  };

  const handlePwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email || !pwdPassword) return;
    setPwdLoading(true);
    setPwdError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: pwdPassword,
    });
    setPwdLoading(false);
    if (error) {
      setPwdError('Senha incorreta. Tente novamente.');
      return;
    }
    setPwdModalOpen(false);
    setPwdPassword('');
    navigate(pwdTarget);
  };

  const role = currentUser?.role as UserRole | undefined;

  // Filtra cada grupo de itens pelo role atual
  const operacaoVisible = OPERACAO_ITEMS.filter(i => canAccessModule(role, i.module));
  const cadastroVisible  = CADASTRO_ITEMS.filter(i => canAccessModule(role, i.module));
  const restritoVisible  = RESTRITO_ITEMS.filter(i => canAccessModule(role, i.module));

  const showNegociacoes = canAccessModule(role, 'funil');
  const hasCadastro = cadastroVisible.length > 0;
  const hasRestrito = restritoVisible.length > 0;

  const pathname = location.pathname;
  const negActive = ['/funil', '/admin/funis', '/admin/automacao-funis'].includes(pathname);

  // Badge de role para mostrar no rodapé expandido
  const roleBadge: Record<UserRole, { label: string; color: string }> = {
    [UserRole.ADMIN]:        { label: 'Admin',        color: 'bg-amber-500/20 text-amber-400'   },
    [UserRole.GESTOR]:       { label: 'Gestor',       color: 'bg-emerald-500/20 text-emerald-400' },
    [UserRole.CONSULTOR]:    { label: 'Consultor',    color: 'bg-slate-500/20 text-slate-400'   },
    [UserRole.VISUALIZADOR]: { label: 'Visualizador', color: 'bg-slate-700/40 text-slate-500'   },
  };
  const badge = role ? roleBadge[role] : null;

  return (
    <>
    <div
      className={`bg-slate-900 h-screen flex flex-col text-slate-300 fixed left-0 top-0 overflow-y-auto z-50 transition-all duration-300 shadow-2xl ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ── Header ── */}
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center gap-3 pt-5 pb-4 px-2">
          <img src="/assets/logo-top.png.png" alt="TOP Formaturas" className="h-10 w-full object-contain" />
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-sm"
          >
            <Menu size={18} />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center justify-center pt-6 pb-5 px-4">
          <img
            src="/assets/logo-top.png.png"
            alt="TOP Formaturas"
            className="h-14 w-auto object-contain animate-in fade-in duration-300"
          />
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1 pb-4">

        {/* ── Grupo Operação ── */}
        {!sidebarCollapsed ? (
          <>
            <button
              onClick={() => setIsOperacaoExpanded(!isOperacaoExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors mb-1"
            >
              <span>Operação</span>
              {isOperacaoExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isOperacaoExpanded ? 'max-h-[800px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>

              {/* Dashboard */}
              <NavLink key="/" item={OPERACAO_ITEMS[0]} collapsed={false} pathname={pathname} />

              {/* Negociações (expandível) */}
              {showNegociacoes && (
                <div>
                  <button
                    onClick={() => setIsNegExpanded(!isNegExpanded)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      negActive && !isNegExpanded ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800'
                    }`}
                  >
                    <Funnel size={22} className={negActive && !isNegExpanded ? 'text-white' : 'text-slate-400'} />
                    <span className="font-semibold text-sm flex-1 text-left">Negociações</span>
                    {isNegExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                  </button>

                  <div className={`overflow-hidden transition-all duration-200 ${isNegExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                      <Link
                        to="/funil"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === '/funil' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Funnel size={15} className={pathname === '/funil' ? 'text-amber-400' : 'text-slate-500'} />
                        Negociações
                      </Link>
                      <Link
                        to="/admin/funis"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === '/admin/funis' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <GitBranch size={15} className={pathname === '/admin/funis' ? 'text-amber-400' : 'text-slate-500'} />
                        Funis
                      </Link>
                      <Link
                        to="/admin/automacao-funis"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname === '/admin/automacao-funis' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Bot size={15} className={pathname === '/admin/automacao-funis' ? 'text-amber-400' : 'text-slate-500'} />
                        Automação de Funis
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Demais itens de Operação (já sem /funil) */}
              {operacaoVisible.map(item => (
                <NavLink key={item.path} item={item} collapsed={false} pathname={pathname} onGatedClick={openPwdGate} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-1 mb-4">
            {showNegociacoes && (
              <Link
                to="/funil"
                title="Negociações"
                className={`flex items-center justify-center px-3 py-3 rounded-xl transition-all ${
                  negActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <Funnel size={22} />
              </Link>
            )}
            {operacaoVisible.map(item => (
              <NavLink key={item.path} item={item} collapsed={true} pathname={pathname} onGatedClick={openPwdGate} />
            ))}
          </div>
        )}

        {/* ── Grupo Cadastro Geral (ADMIN + GESTOR) ── */}
        {hasCadastro && (
          <div className="mt-2">
            {!sidebarCollapsed ? (
              <>
                <button
                  onClick={() => setIsCadastroExpanded(!isCadastroExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  <span>Cadastro Geral</span>
                  {isCadastroExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className={`mt-2 space-y-1 overflow-hidden transition-all duration-300 ${isCadastroExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {cadastroVisible.map(item => (
                    <SmallNavLink key={item.path} item={item} collapsed={false} pathname={pathname} onGatedClick={openPwdGate} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-px bg-slate-800 mx-3 my-3" />
                {cadastroVisible.map(item => (
                  <SmallNavLink key={item.path} item={item} collapsed={true} pathname={pathname} onGatedClick={openPwdGate} />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Grupo Sistema (ADMIN apenas) ── */}
        {hasRestrito && (
          <div className="mt-4">
            {!sidebarCollapsed ? (
              <>
                <button
                  onClick={() => setIsRestritoExpanded(!isRestritoExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  <span>Sistema</span>
                  {isRestritoExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className={`mt-2 space-y-1 overflow-hidden transition-all duration-300 ${isRestritoExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {restritoVisible.map(item => (
                    <SmallNavLink key={item.path} item={item} collapsed={false} pathname={pathname} onGatedClick={openPwdGate} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-px bg-slate-800 mx-3 my-3" />
                {restritoVisible.map(item => (
                  <SmallNavLink key={item.path} item={item} collapsed={true} pathname={pathname} onGatedClick={openPwdGate} />
                ))}
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── Rodapé com role badge ── */}
      {!sidebarCollapsed && badge && (
        <div className="p-4 border-t border-slate-800/50 flex flex-col items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest">CRM v1.2 Platinum</span>
        </div>
      )}
    </div>

    {/* ── Modal de senha para Lixeira / Usuários ── */}
    {pwdModalOpen && (
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4"
        onClick={() => setPwdModalOpen(false)}
      >
        <div
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                <Lock size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Área Restrita</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confirme sua senha para continuar</p>
              </div>
            </div>
            <button onClick={() => setPwdModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handlePwdSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Senha da conta</label>
              <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-amber-400 transition-all">
                <input
                  autoFocus
                  type={pwdShowPwd ? 'text' : 'password'}
                  value={pwdPassword}
                  onChange={e => setPwdPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                />
                <button type="button" onClick={() => setPwdShowPwd(v => !v)} className="text-slate-400 hover:text-slate-600 transition-colors ml-2">
                  {pwdShowPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {pwdError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl p-3">
                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                <p className="text-xs font-bold text-rose-700">{pwdError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pwdLoading || !pwdPassword}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {pwdLoading
                ? <><Loader2 size={16} className="animate-spin" /> Verificando…</>
                : <><Shield size={16} /> Confirmar acesso</>
              }
            </button>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

export default Sidebar;
