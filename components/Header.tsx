
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../store';
import { useAuth } from '../src/hooks/useAuth';
import { LogOut, ChevronDown, User, Shield, Bell, Clock, Calendar, Zap, ListTodo, ChevronRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  const { currentUser, sidebarCollapsed, tasks, events, classes } = useData();
  const { signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(event.target as Node)) {
        setIsNotifyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const upcomingActivities = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filtrar Tarefas pendentes de hoje em diante
    const pendingTasks = tasks
      .filter(t => !t.completed && t.date >= todayStr)
      .map(t => ({
        id: t.id,
        title: t.title,
        date: t.date,
        time: t.time,
        type: 'TASK' as const,
        dateTime: new Date(`${t.date}T${t.time}`)
      }));

    // Filtrar Eventos não realizados
    const pendingEvents = events
      .filter(e => e.status !== 'Realizado' && e.startDateTime >= now.toISOString())
      .map(e => ({
        id: e.id,
        title: e.name,
        date: e.startDateTime.split('T')[0],
        time: e.startDateTime.split('T')[1].substring(0, 5),
        type: 'EVENT' as const,
        dateTime: new Date(e.startDateTime)
      }));

    // Combinar e ordenar por proximidade (mais próximo primeiro)
    return [...pendingTasks, ...pendingEvents]
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
      .slice(0, 5); // Apenas um resumo das 5 mais próximas
  }, [tasks, events]);

  const hasUrgent = upcomingActivities.some(a => a.date === new Date().toISOString().split('T')[0]);

  if (!currentUser) return null;

  return (
    <header 
      className={`fixed top-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-40 flex items-center justify-end px-8 shadow-lg transition-all duration-300 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      <div className="flex items-center gap-2">
        
        {/* Lembretes de Atividade */}
        <div className="relative mr-2" ref={notifyRef}>
          <button 
            onClick={() => setIsNotifyOpen(!isNotifyOpen)}
            className={`p-2.5 rounded-xl transition-all relative group ${isNotifyOpen ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Bell size={20} />
            {upcomingActivities.length > 0 && (
              <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${hasUrgent ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
            )}
          </button>

          {isNotifyOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-black/5">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Atividades Próximas</h4>
                  <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">{upcomingActivities.length} Pendentes</span>
                </div>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto">
                {upcomingActivities.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {upcomingActivities.map((act) => {
                      const isToday = act.date === new Date().toISOString().split('T')[0];
                      return (
                        <div key={act.id} className="p-4 hover:bg-slate-50 transition-colors group">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 p-2 rounded-lg ${act.type === 'TASK' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-600'}`}>
                              {act.type === 'TASK' ? <ListTodo size={14} /> : <Calendar size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-black uppercase truncate tracking-tight ${isToday ? 'text-slate-900' : 'text-slate-600'}`}>
                                {act.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isToday ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  {isToday ? 'Hoje' : new Date(act.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                  <Clock size={10} /> {act.time}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="text-slate-200" size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tudo em dia!</p>
                  </div>
                )}
              </div>

              <Link 
                to="/agenda" 
                onClick={() => setIsNotifyOpen(false)}
                className="block w-full p-4 bg-slate-900 text-white text-center text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Ver Agenda Completa <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Menu do Usuário */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-all group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentUser.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border-2 border-amber-400 shadow-sm overflow-hidden">
              <span className="text-amber-400">{currentUser.name.charAt(0)}</span>
            </div>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 animate-in fade-in zoom-in duration-150 ring-1 ring-black ring-opacity-5">
              <div className="px-4 py-2 border-b border-slate-50 mb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso do Usuário</p>
              </div>
              
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 transition-colors">
                <User size={18} className="text-slate-400" />
                Minhas Informações
              </button>
              
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 transition-colors">
                <Shield size={18} className="text-slate-400" />
                Segurança
              </button>
              
              <div className="border-t border-slate-50 mt-1 pt-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-bold"
                >
                  <LogOut size={18} />
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
