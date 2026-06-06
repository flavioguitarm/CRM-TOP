
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Funnel,
  Users,
  Settings,
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
} from 'lucide-react';
import { useData } from '../store';
import { UserRole } from '../types';

const Sidebar: React.FC = () => {
  const { currentUser, sidebarCollapsed, setSidebarCollapsed } = useData();
  const location = useLocation();
  const [isGeneralRegistryExpanded, setIsGeneralRegistryExpanded] = useState(true);
  const [isMainMenuExpanded, setIsMainMenuExpanded] = useState(true);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.CONSULTOR, UserRole.VISUALIZADOR] },
    { path: '/funil', label: 'Negociações', icon: Funnel, roles: [UserRole.ADMIN, UserRole.CONSULTOR, UserRole.VISUALIZADOR] },
    { path: '/clientes', label: 'Clientes', icon: Users, roles: [UserRole.ADMIN, UserRole.CONSULTOR, UserRole.VISUALIZADOR] },
    { path: '/acoes-cs', label: 'Painel de Ações CS', icon: Zap, roles: [UserRole.ADMIN, UserRole.CONSULTOR, UserRole.VISUALIZADOR] },
    { path: '/atendimentos-cs', label: 'Atendimentos Diários CS', icon: Headset, roles: [UserRole.ADMIN, UserRole.CONSULTOR, UserRole.VISUALIZADOR] },
    { path: '/agenda', label: 'Agenda Integrada', icon: Calendar, roles: [UserRole.ADMIN, UserRole.CONSULTOR, UserRole.VISUALIZADOR] },
  ];

  const adminItems = [
    { path: '/admin/instituicoes', label: 'Instituições', icon: Building2 },
    { path: '/admin/cursos', label: 'Cursos', icon: BookOpen },
    { path: '/admin/produtos', label: 'Catálogo de Vendas', icon: Package },
    { path: '/admin/turmas', label: 'Gestão de Turmas', icon: GraduationCap },
    { path: '/admin/eventos', label: 'Cronograma Mestre', icon: Calendar },
    { path: '/admin/usuarios', label: 'Usuários', icon: UserCircle2 },
    { path: '/admin/funis', label: 'Config. Funil', icon: Funnel },
    { path: '/admin/lixeira',   label: 'Lixeira', icon: Trash2 },
  ];

  return (
    <div 
      className={`bg-slate-900 h-screen flex flex-col text-slate-300 fixed left-0 top-0 overflow-y-auto z-50 transition-all duration-300 shadow-2xl ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`p-6 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!sidebarCollapsed && (
          <h1 className="text-xl font-bold text-white flex items-center gap-2 animate-in fade-in duration-300">
            <GraduationCap className="text-amber-400" />
            CRM Formaturas
          </h1>
        )}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-sm"
        >
          {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {!sidebarCollapsed ? (
          <>
            <button 
              onClick={() => setIsMainMenuExpanded(!isMainMenuExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors group mb-1"
            >
              <span>Operação</span>
              {isMainMenuExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isMainMenuExpanded ? 'max-h-[600px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
              {navItems.filter(item => item.roles.includes(currentUser?.role || UserRole.VISUALIZADOR)).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    location.pathname === item.path 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <item.icon size={22} className={location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                  <span className="font-semibold text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-1">
            {navItems.filter(item => item.roles.includes(currentUser?.role || UserRole.VISUALIZADOR)).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center px-3 py-3 rounded-xl transition-all ${
                  location.pathname === item.path 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                    : 'hover:bg-slate-800'
                }`}
                title={item.label}
              >
                <item.icon size={22} className={location.pathname === item.path ? 'text-white' : 'text-slate-400'} />
              </Link>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-8">
            {!sidebarCollapsed ? (
              <>
                <button 
                  onClick={() => setIsGeneralRegistryExpanded(!isGeneralRegistryExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors group"
                >
                  <span>Cadastro Geral</span>
                  {isGeneralRegistryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                <div className={`mt-2 space-y-1 overflow-hidden transition-all duration-300 ${isGeneralRegistryExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        location.pathname === item.path ? 'bg-slate-800 text-white shadow-inner' : 'hover:bg-slate-800'
                      }`}
                    >
                      <item.icon size={18} className={location.pathname === item.path ? 'text-amber-400' : 'text-slate-500'} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-px bg-slate-800 mx-3 i-my-4" />
            )}
            
            {sidebarCollapsed && adminItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center px-3 py-3 rounded-xl mb-1 transition-all ${
                  location.pathname === item.path ? 'bg-slate-800 text-amber-400 shadow-inner' : 'hover:bg-slate-800 text-slate-500'
                }`}
                title={item.label}
              >
                <item.icon size={20} />
              </Link>
            ))}
          </div>
        )}
      </nav>
      
      {!sidebarCollapsed && (
        <div className="p-6 text-[10px] text-slate-600 text-center uppercase tracking-widest border-t border-slate-800/50">
          CRM v1.2 Platinum
        </div>
      )}
    </div>
  );
};

export default Sidebar;
