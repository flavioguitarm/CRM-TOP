
import React, { useState, useMemo } from 'react';
import { useData } from '../store';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  GraduationCap, 
  Building2,
  AlertCircle,
  CheckCircle2,
  LayoutGrid,
  List,
  CalendarDays,
  Columns,
  Search,
  ArrowRight,
  Zap,
  TrendingUp,
  Target,
  ListTodo,
  CheckCircle,
  User,
  Flag
} from 'lucide-react';
import { Event, CSAction, Task } from '../types';

type ViewMode = 'dia' | 'mes' | 'trimestre' | 'semestre' | 'ano';

const AgendaView: React.FC = () => {
  const { events, classes, institutions, csActions, tasks, clients } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() - 1);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'trimestre') d.setMonth(d.getMonth() - 3);
    else if (viewMode === 'semestre') d.setMonth(d.getMonth() - 6);
    else if (viewMode === 'ano') d.setFullYear(d.getFullYear() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() + 1);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'trimestre') d.setMonth(d.getMonth() + 3);
    else if (viewMode === 'semestre') d.setMonth(d.getMonth() + 6);
    else if (viewMode === 'ano') d.setFullYear(d.getFullYear() + 1);
    setCurrentDate(d);
  };

  const getLabel = () => {
    if (viewMode === 'dia') return currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (viewMode === 'mes') return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    if (viewMode === 'trimestre') {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
      return `${quarter}º Trimestre de ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'semestre') {
      const semester = currentDate.getMonth() < 6 ? '1º' : '2º';
      return `${semester} Semestre de ${currentDate.getFullYear()}`;
    }
    return `Ano de ${currentDate.getFullYear()}`;
  };

  const isActionOnDay = (action: CSAction, dayStr: string) => {
    const date = new Date(dayStr + 'T12:00:00'); // Normalize to noon to avoid TZ shifts
    const start = new Date(action.startDate + 'T00:00:00');
    const end = new Date(action.endDate + 'T23:59:59');
    return date >= start && date <= end;
  };

  const renderDailyView = () => {
    const ds = currentDate.toISOString().split('T')[0];
    
    const dayEvents = events.filter(e => e.startDateTime.startsWith(ds))
      .sort((a,b) => a.startDateTime.localeCompare(b.startDateTime));

    const dayActions = csActions.filter(a => isActionOnDay(a, ds));
    
    const dayTasks = tasks.filter(t => t.date === ds)
      .sort((a,b) => a.time.localeCompare(b.time));

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex-1 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
          <CalendarIcon className="text-amber-500" size={24} />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Operações do Dia</h2>
        </div>
        
        {(dayEvents.length > 0 || dayActions.length > 0 || dayTasks.length > 0) ? (
          <div className="space-y-6 relative">
            <div className="absolute left-[39px] top-2 bottom-2 w-0.5 bg-slate-100" />
            
            {/* Tarefas de Clientes */}
            {dayTasks.map(t => {
                const client = clients.find(c => c.id === t.clientId);
                return (
                  <div key={t.id} className="relative pl-20 group">
                    <div className="absolute left-0 top-1 w-20 text-right pr-6 text-xs font-black text-slate-400">
                      {t.time}
                    </div>
                    <div className={`absolute left-[33px] top-1.5 w-4 h-4 rounded-full border-4 border-white z-10 ${t.completed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    
                    <div className={`rounded-3xl p-5 border transition-all ${t.completed ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-white border-slate-100 hover:border-rose-200 shadow-sm'}`}>
                      <div className="flex items-center justify-between gap-4">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[9px] font-black uppercase text-rose-600 tracking-widest flex items-center gap-1">
                                  <ListTodo size={12}/> TAREFA CLIENTE
                               </span>
                            </div>
                            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{t.title}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Vinc: {client?.name || 'N/A'}</p>
                         </div>
                         <CheckCircle2 className={`opacity-20 ${t.completed ? 'text-emerald-500' : 'text-rose-400'}`} size={32} />
                      </div>
                    </div>
                  </div>
                );
            })}

            {/* Ações do CS (Campanhas) */}
            {dayActions.map(a => {
               const cls = classes.find(c => c.id === a.classId);
               const isStart = a.startDate === ds;
               const isEnd = a.endDate === ds;
               return (
                <div key={a.id} className="relative pl-20 group">
                  <div className="absolute left-0 top-1 w-20 text-right pr-6 text-[9px] font-black text-amber-500 uppercase leading-tight">
                    {isStart && isEnd ? 'DIA ÚNICO' : isStart ? 'INÍCIO' : isEnd ? 'FINAL' : 'EM CURSO'}
                  </div>
                  <div className="absolute left-[33px] top-1.5 w-4 h-4 rounded-full border-4 border-white z-10 bg-amber-500" />
                  
                  <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 group-hover:bg-amber-100 transition-all shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-amber-300 bg-white text-amber-700 shadow-sm">
                            {a.status}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                             <Zap size={10}/> AÇÃO CS
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{a.type} • {cls?.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 uppercase">
                             <Target size={14} className="text-amber-500" />
                             Canal: {a.channel}
                           </div>
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase">
                             <TrendingUp size={14} />
                             ROI: R$ {a.revenueResult.toLocaleString()}
                           </div>
                        </div>
                      </div>
                      <Zap className="text-amber-400 opacity-20 group-hover:opacity-100 transition-all" size={32} />
                    </div>
                  </div>
                </div>
               );
            })}

            {/* Eventos Pontuais (Reuniões, Eventos Turma) */}
            {dayEvents.map(e => {
              const cls = classes.find(c => c.id === e.classId);
              const time = new Date(e.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let statusStyle = "bg-slate-500";
              let statusLabelStyle = "bg-slate-50 text-slate-700 border-slate-100";
              if (e.status === 'Confirmado') {
                statusStyle = "bg-emerald-500";
                statusLabelStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
              } else if (e.status === 'Realizado') {
                statusStyle = "bg-slate-700";
                statusLabelStyle = "bg-slate-100 text-slate-700 border-slate-200";
              }

              return (
                <div key={e.id} className="relative pl-20 group">
                  <div className="absolute left-0 top-1 w-20 text-right pr-6 text-xs font-black text-slate-400 group-hover:text-slate-600 transition-colors">
                    {time}
                  </div>
                  <div className={`absolute left-[33px] top-1.5 w-4 h-4 rounded-full border-4 border-white z-10 ${statusStyle}`} />
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 hover:border-amber-400 hover:bg-white transition-all shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${statusLabelStyle}`}>
                            {e.status}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{e.type}</span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{e.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                             <GraduationCap size={14} className="text-slate-300" />
                             {cls?.name || 'Turma não vinculada'}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-slate-300">
            <CalendarIcon size={64} className="mb-4 opacity-10" />
            <p className="font-black text-xs uppercase tracking-widest">Nenhuma operação detectada para este dia.</p>
          </div>
        )}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.startDateTime.startsWith(ds));
      const dayActions = csActions.filter(a => isActionOnDay(a, ds));
      const dayTasks = tasks.filter(t => t.date === ds);
      days.push({ day: d, dateString: ds, events: dayEvents, actions: dayActions, tasks: dayTasks });
    }

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-100 last:border-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {days.map((dayData, idx) => {
            const isToday = dayData && new Date().toDateString() === new Date(year, month, dayData.day).toDateString();
            const isSelected = dayData && selectedDate === dayData.dateString;

            return (
              <div 
                key={idx} 
                onClick={() => {
                  if(dayData) {
                    setSelectedDate(dayData.dateString);
                    if (isSelected) {
                      setCurrentDate(new Date(dayData.dateString + 'T12:00:00'));
                      setViewMode('dia');
                    }
                  }
                }}
                className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-all cursor-pointer relative group ${!dayData ? 'bg-slate-50/30' : 'hover:bg-slate-50'} ${isSelected ? 'bg-amber-50/50 ring-2 ring-inset ring-amber-500 z-10' : ''}`}
              >
                {dayData && (
                  <>
                    <div className={`text-xs font-black w-8 h-8 flex items-center justify-center rounded-xl mb-1 transition-all ${isToday ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-600'}`}>
                      {dayData.day}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {/* Tarefas */}
                      {dayData.tasks.slice(0, 2).map(t => (
                        <div key={t.id} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white truncate uppercase flex items-center gap-1 shadow-sm">
                           <ListTodo size={8} /> {t.title}
                        </div>
                      ))}

                      {/* Ações CS */}
                      {dayData.actions.slice(0, 2).map(a => (
                        <div key={a.id} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white border border-amber-600 truncate uppercase flex items-center gap-1 shadow-sm">
                          <Zap size={8} /> {a.type}
                        </div>
                      ))}
                      
                      {/* Eventos */}
                      {dayData.events.slice(0, 2).map(e => {
                        let dotColor = "bg-slate-400";
                        if (e.status === 'Confirmado') dotColor = "bg-emerald-500";
                        else if (e.status === 'Realizado') dotColor = "bg-slate-600";
                        return (
                          <div key={e.id} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate uppercase flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${dotColor}`} /> {e.name}
                          </div>
                        );
                      })}
                      
                      {(dayData.events.length + dayData.actions.length + dayData.tasks.length) > 6 && (
                        <div className="text-[7px] font-black text-amber-600 px-1.5 uppercase tracking-tighter text-center">
                          + {dayData.events.length + dayData.actions.length + dayData.tasks.length - 6} itens
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = (monthsCount: number) => {
    const year = currentDate.getFullYear();
    const startMonth = viewMode === 'trimestre' 
      ? Math.floor(currentDate.getMonth() / 3) * 3 
      : (viewMode === 'semestre' ? (currentDate.getMonth() < 6 ? 0 : 6) : 0);
    
    const startRange = new Date(year, startMonth, 1);
    const endRange = new Date(year, startMonth + monthsCount, 0, 23, 59, 59);

    const rangeEvents = events.filter(e => {
      const eventDate = new Date(e.startDateTime);
      return eventDate >= startRange && eventDate <= endRange;
    });

    const rangeActions = csActions.filter(a => {
        const aStart = new Date(a.startDate + 'T00:00:00');
        const aEnd = new Date(a.endDate + 'T23:59:59');
        return (aStart <= endRange && aEnd >= startRange);
    });

    const rangeTasks = tasks.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate >= startRange && tDate <= endRange;
    });

    // Duplicar Ações do CS para mostrar início e fim conforme pedido do usuário
    const csListItems: any[] = [];
    rangeActions.forEach(a => {
        const clsName = classes.find(c => c.id === a.classId)?.name || 'Turma';
        // Entrada de Início
        csListItems.push({ 
            ...a, 
            name: `[INÍCIO] ${a.type} - ${clsName}`, 
            isCS: true, 
            isTask: false, 
            sortDate: a.startDate,
            isStart: true
        });
        // Entrada de Fim (apenas se data for diferente)
        if (a.startDate !== a.endDate) {
            csListItems.push({ 
                ...a, 
                name: `[FINAL] ${a.type} - ${clsName}`, 
                isCS: true, 
                isTask: false, 
                sortDate: a.endDate,
                isEnd: true
            });
        }
    });

    const combined = [
        ...rangeEvents.map(e => ({ ...e, isCS: false, isTask: false, sortDate: e.startDateTime.split('T')[0] })),
        ...csListItems,
        ...rangeTasks.map(t => ({ ...t, name: t.title, isCS: false, isTask: true, sortDate: t.date }))
    ].sort((a,b) => a.sortDate.localeCompare(b.sortDate));

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
            <List size={22} className="text-amber-500" />
            Agenda Integrada de Lançamentos
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100">{combined.length} registros ativos</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {combined.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {combined.map((item: any, idx: number) => {
                const cls = classes.find(c => c.id === item.classId);
                const client = clients.find(c => c.id === item.clientId);
                const eventDate = new Date(item.sortDate + 'T12:00:00');
                const day = eventDate.getDate().toString().padStart(2, '0');
                const month = eventDate.toLocaleString('pt-BR', { month: 'short' });
                const time = item.isTask ? item.time : (!item.isCS ? new Date(item.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'MARCO');
                
                let labelStyle = "bg-slate-100 text-slate-700 border-slate-200";
                if (item.isCS) labelStyle = "bg-amber-500 text-white border-amber-600";
                else if (item.isTask) labelStyle = "bg-rose-500 text-white border-rose-600";
                else if (item.status === 'Confirmado') labelStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                else if (item.status === 'Realizado') labelStyle = "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div 
                    key={`${item.id}-${idx}`} 
                    onClick={() => {
                      setCurrentDate(eventDate);
                      setViewMode('dia');
                    }}
                    className={`p-6 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center gap-8 ${item.isCS ? 'bg-amber-50/20' : (item.isTask ? 'bg-rose-50/5' : '')}`}
                  >
                    <div className={`flex flex-col items-center justify-center min-w-[70px] h-16 rounded-[1.2rem] border-2 transition-all ${item.isCS ? 'bg-amber-500 border-amber-400 text-white' : (item.isTask ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white border-slate-100 group-hover:border-amber-300 shadow-sm')}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${item.isCS || item.isTask ? 'text-white/80' : 'text-slate-400'}`}>{month}</span>
                      <span className="text-xl font-black leading-none">{day}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase flex items-center gap-1 shadow-sm ${labelStyle}`}>
                          {item.isCS && <Zap size={10}/>}
                          {item.isTask && <ListTodo size={10}/>}
                          {item.isTask ? 'Tarefa' : (item.isCS ? 'Operação CS' : item.status)}
                        </span>
                        {!item.isCS && !item.isTask && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.type}</span>}
                        {item.isCS && item.isStart && <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 rounded uppercase">Início</span>}
                        {item.isCS && item.isEnd && <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 rounded uppercase">Término</span>}
                      </div>
                      <h4 className={`text-base font-black uppercase tracking-tight truncate transition-colors ${item.isCS || item.isTask ? 'text-slate-900' : 'text-slate-700 group-hover:text-amber-600'}`}>{item.name}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-tight">
                          {item.isTask ? <User size={14} className="text-slate-300" /> : <GraduationCap size={14} className="text-slate-300" />}
                          {item.isTask ? (client?.name || 'Cliente') : (cls?.name || 'Turma Geral')}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock size={14} className="text-slate-300" />
                          {time}
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center pr-4">
                       <ArrowRight size={24} className="text-slate-100 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-slate-300">
              <Search size={48} className="mb-4 opacity-10" />
              <p className="font-black text-xs uppercase tracking-widest">Nenhum evento mapeado no período solicitado.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Agenda Integrada CRM</h1>
          <p className="text-slate-500 font-medium">Lançamentos de Cronograma, Campanhas de CS e Tarefas Táticas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <span className="font-black text-slate-900 uppercase min-w-[220px] text-center text-sm tracking-[0.1em]">{getLabel()}</span>
            <button onClick={handleNext} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="flex p-1 bg-slate-200/50 rounded-[1.2rem] border border-slate-200">
            {[
              { id: 'dia', label: 'Dia', icon: Clock },
              { id: 'mes', label: 'Mês', icon: CalendarDays },
              { id: 'trimestre', label: 'Tri', icon: Columns },
              { id: 'semestre', label: 'Sem', icon: List },
              { id: 'ano', label: 'Ano', icon: LayoutGrid }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === mode.id 
                    ? 'bg-white text-amber-600 shadow-md ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <mode.icon size={14} />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === 'dia' && renderDailyView()}
        {viewMode === 'mes' && renderMonthlyView()}
        {viewMode === 'trimestre' && renderListView(3)}
        {viewMode === 'semestre' && renderListView(6)}
        {viewMode === 'ano' && renderListView(12)}
      </div>

      {(viewMode === 'dia' || viewMode === 'mes') && (
        <div className="fixed bottom-8 right-8 bg-slate-900/95 backdrop-blur-md px-8 py-4 rounded-[2rem] border border-slate-800 shadow-2xl z-40 flex items-center gap-8 animate-in slide-in-from-bottom-4 ring-4 ring-white">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400">
             <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" /> Tarefa
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400">
             <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> Ação CS
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400">
             <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> Confirmado
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaView;
