
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Settings2,
  ListTodo,
} from 'lucide-react';
import { useData } from '../store';
import { UserRole } from '../types';
import { canAccessModule, AppModule } from '../src/hooks/usePermissions';

// ─── Definição de itens de menu ───────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  module: AppModule;
}

const OPERACAO_ITEMS: NavItem[] = [
  { path: '/',                 label: 'Dashboard',               icon: LayoutDashboard, module: 'dashboard'      },
  { path: '/funil',            label: 'Negociações',             icon: Funnel,          module: 'funil'          },
  { path: '/clientes',         label: 'Clientes',                icon: Users,           module: 'clientes'       },
  { path: '/acoes-cs',         label: 'Painel de Ações CS',      icon: Zap,             module: 'acoesCs'        },
  { path: '/atendimentos-cs',  label: 'Atendimentos Diários CS', icon: Headset,         module: 'atendimentosCs' },
  { path: '/agenda',           label: 'Agenda Integrada',        icon: Calendar,        module: 'agenda'         },
];

// Cadastro Geral — ADMIN + GESTOR
const CADASTRO_ITEMS: NavItem[] = [
  { path: '/admin/instituicoes',    label: 'Instituições',      icon: Building2,    module: 'instituicoes'  },
  { path: '/admin/cursos',          label: 'Cursos',            icon: BookOpen,     module: 'cursos'        },
  { path: '/admin/produtos',        label: 'Catálogo de Vendas',icon: Package,      module: 'produtos'      },
  { path: '/admin/turmas',          label: 'Gestão de Turmas',  icon: GraduationCap,module: 'turmas'        },
  { path: '/admin/eventos',         label: 'Cronograma Mestre', icon: Calendar,     module: 'eventos'       },
  { path: '/admin/funis',           label: 'Config. Funil',     icon: Funnel,       module: 'funis'         },
  { path: '/admin/tipos-atividade', label: 'Tipos de Atividade',icon: ListTodo,     module: 'activityTypes' },
  { path: '/admin/lixeira',         label: 'Lixeira',           icon: Trash2,       module: 'lixeira'       },
];

// Restritos — ADMIN apenas
const RESTRITO_ITEMS: NavItem[] = [
  { path: '/admin/usuarios',  label: 'Usuários',        icon: UserCircle2, module: 'usuarios' },
  { path: '/admin/seguranca', label: 'Segurança & DB',  icon: Settings2,   module: 'database' },
];

// ─── Helpers visuais ──────────────────────────────────────────────────────────

interface NavLinkProps { item: NavItem; collapsed: boolean; pathname: string; }

const NavLink: React.FC<NavLinkProps> = ({ item, collapsed, pathname }) => {
  const active = pathname === item.path;
  if (collapsed) {
    return (
      <Link
        to={item.path}
        title={item.label}
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
      to={item.path}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
        active ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800'
      }`}
    >
      <item.icon size={22} className={active ? 'text-white' : 'text-slate-400'} />
      <span className="font-semibold text-sm">{item.label}</span>
    </Link>
  );
}

const SmallNavLink: React.FC<NavLinkProps> = ({ item, collapsed, pathname }) => {
  const active = pathname === item.path;
  if (collapsed) {
    return (
      <Link
        to={item.path}
        title={item.label}
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
      to={item.path}
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
  const [isOperacaoExpanded,  setIsOperacaoExpanded]  = useState(true);
  const [isCadastroExpanded,  setIsCadastroExpanded]  = useState(true);
  const [isRestritoExpanded,  setIsRestritoExpanded]  = useState(true);

  const role = currentUser?.role as UserRole | undefined;

  // Filtra cada grupo de itens pelo role atual
  const operacaoVisible = OPERACAO_ITEMS.filter(i => canAccessModule(role, i.module));
  const cadastroVisible  = CADASTRO_ITEMS.filter(i => canAccessModule(role, i.module));
  const restritoVisible  = RESTRITO_ITEMS.filter(i => canAccessModule(role, i.module));

  const hasCadastro = cadastroVisible.length > 0;
  const hasRestrito = restritoVisible.length > 0;

  // Badge de role para mostrar no rodapé expandido
  const roleBadge: Record<UserRole, { label: string; color: string }> = {
    [UserRole.ADMIN]:       { label: 'Admin',       color: 'bg-amber-500/20 text-amber-400' },
    [UserRole.GESTOR]:      { label: 'Gestor',      color: 'bg-emerald-500/20 text-emerald-400' },
    [UserRole.CONSULTOR]:   { label: 'Consultor',   color: 'bg-slate-500/20 text-slate-400' },
    [UserRole.VISUALIZADOR]:{ label: 'Visualizador',color: 'bg-slate-700/40 text-slate-500' },
  };
  const badge = role ? roleBadge[role] : null;

  return (
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
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isOperacaoExpanded ? 'max-h-[600px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
              {operacaoVisible.map(item => (
                <NavLink key={item.path} item={item} collapsed={false} pathname={location.pathname} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-1 mb-4">
            {operacaoVisible.map(item => (
              <NavLink key={item.path} item={item} collapsed={true} pathname={location.pathname} />
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
                    <SmallNavLink key={item.path} item={item} collapsed={false} pathname={location.pathname} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-px bg-slate-800 mx-3 my-3" />
                {cadastroVisible.map(item => (
                  <SmallNavLink key={item.path} item={item} collapsed={true} pathname={location.pathname} />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Grupo Restrito (ADMIN apenas) ── */}
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
                    <SmallNavLink key={item.path} item={item} collapsed={false} pathname={location.pathname} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-px bg-slate-800 mx-3 my-3" />
                {restritoVisible.map(item => (
                  <SmallNavLink key={item.path} item={item} collapsed={true} pathname={location.pathname} />
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
  );
};

export default Sidebar;
