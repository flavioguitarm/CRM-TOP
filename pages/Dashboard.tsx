
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, 
  LineChart, Line, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, CheckCircle2, Calendar, Filter, Layers,
  XCircle, Clock, ArrowUpRight, Target, ShieldCheck, Database, AlertTriangle,
  FileText, Activity, BarChart3, ChevronRight, Zap, Briefcase, Megaphone,
  TrendingDown, BarChart2
} from 'lucide-react';
import { useData } from '../store';

const Dashboard: React.FC = () => {
  const { sales, clients, users, funnels, classes, csActions } = useData();
  
  // Filtros Solicitados
  const [filterFunnelId, setFilterFunnelId] = useState('');
  const [filterSellerId, setFilterSellerId] = useState('');
  const [dateStart, setDateStart] = useState('2024-01-01');
  const [dateEnd, setDateEnd] = useState('2026-12-31');

  const dashboardData = useMemo(() => {
    const start = new Date(dateStart).getTime();
    const end = new Date(dateEnd).getTime();

    const filteredClients = clients.filter(c => {
      const matchFunnel = !filterFunnelId || c.funnelId === filterFunnelId;
      const matchSeller = !filterSellerId || c.sellerId === filterSellerId;
      const created = new Date(c.createdAt).getTime();
      return matchFunnel && matchSeller && created >= start && created <= end;
    });

    const filteredSales = sales.filter(s => {
      const client = clients.find(c => c.id === s.clientId);
      const matchFunnel = !filterFunnelId || client?.funnelId === filterFunnelId;
      const matchSeller = !filterSellerId || s.sellerId === filterSellerId;
      const soldDate = new Date(s.date).getTime();
      return matchFunnel && matchSeller && soldDate >= start && soldDate <= end;
    });

    // Cálculos de KPI baseados nos filtros
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.value, 0);
    const negTotais = filteredClients.length;
    const negGanhas = filteredClients.filter(c => {
      const funnel = funnels.find(f => f.id === c.funnelId);
      const stage = funnel?.stages.find(s => s.id === c.stageId);
      return stage?.type === 'WON';
    }).length;
    const negPerdidas = filteredClients.filter(c => {
      const funnel = funnels.find(f => f.id === c.funnelId);
      const stage = funnel?.stages.find(s => s.id === c.stageId);
      return stage?.type === 'LOST';
    }).length;
    const negAndamento = negTotais - negGanhas - negPerdidas;
    
    const conversion = negTotais > 0 ? ((negGanhas / negTotais) * 100).toFixed(1) : '0.0';

    const lossReasonsMap: Record<string, number> = {};
    const lostClients = filteredClients.filter(c => {
        const funnel = funnels.find(f => f.id === c.funnelId);
        const stage = funnel?.stages.find(s => s.id === c.stageId);
        return stage?.type === 'LOST';
    });

    lostClients.forEach(c => {
        const lossAct = c.activities.find(act => act.description.includes('Negociação Perdida'));
        if (lossAct) {
            const parts = lossAct.description.split('Motivo: ');
            if (parts[1]) {
                const reason = parts[1].split('.')[0].trim();
                lossReasonsMap[reason] = (lossReasonsMap[reason] || 0) + 1;
            }
        } else {
            lossReasonsMap['Não Informado'] = (lossReasonsMap['Não Informado'] || 0) + 1;
        }
    });

    const lossReasonsData = Object.entries(lossReasonsMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { totalRevenue, negTotais, negGanhas, negPerdidas, negAndamento, conversion, filteredSales, filteredClients, lossReasonsData };
  }, [clients, sales, filterFunnelId, filterSellerId, dateStart, dateEnd, funnels]);

  const monthlyStatusData = useMemo(() => {
    const statusMap: Record<string, { won: number, lost: number, ongoing: number }> = {};
    dashboardData.filteredClients.forEach(c => {
      const monthStr = c.createdAt.substring(0, 7);
      if (!statusMap[monthStr]) statusMap[monthStr] = { won: 0, lost: 0, ongoing: 0 };
      const funnel = funnels.find(f => f.id === c.funnelId);
      const stage = funnel?.stages.find(s => s.id === c.stageId);
      if (stage?.type === 'WON') statusMap[monthStr].won++;
      else if (stage?.type === 'LOST') statusMap[monthStr].lost++;
      else statusMap[monthStr].ongoing++;
    });
    return Object.entries(statusMap).sort().map(([month, counts]) => ({ month: month.split('-')[1] + '/' + month.split('-')[0].substring(2), ...counts })).slice(-12);
  }, [dashboardData.filteredClients, funnels]);

  const salesTimeSeries = useMemo(() => {
    const monthlyMap: Record<string, number> = {};
    dashboardData.filteredSales.forEach(s => {
      const m = s.date.substring(0, 7);
      monthlyMap[m] = (monthlyMap[m] || 0) + s.value;
    });
    return Object.entries(monthlyMap).sort().map(([month, value]) => ({ month: month.split('-')[1] + '/' + month.split('-')[0].substring(2), value }));
  }, [dashboardData.filteredSales]);

  // Card 1 — Meta Total dos Projetos
  const metaData = useMemo(() => {
    let metaQty = 0;
    let metaValue = 0;
    classes.forEach(cls => {
      cls.classProducts.forEach(cp => {
        metaQty   += cp.goalQuantity ?? 0;
        metaValue += cp.goalValue    ?? 0;
      });
    });
    return { metaQty, metaValue };
  }, [classes]);

  // Card 2 — Custos × Faturamento
  const costsData = useMemo(() => {
    const totalCost    = csActions.reduce((acc, a) => acc + (a.cost ?? 0), 0);
    const totalRevenue = sales.reduce((acc, s) => acc + s.value, 0);
    const roi          = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : null;
    return { totalCost, totalRevenue, roi };
  }, [csActions, sales]);

  // Card 3 — Campanhas
  const campaignsData = useMemo(() => {
    const total    = csActions.length;
    const active   = csActions.filter(a => a.status !== 'FEITO' && a.status !== 'ENCERRADO').length;
    const closed   = total - active;
    return { total, active, closed };
  }, [csActions]);

  const StatCard = ({ title, value, icon: Icon, colorClass, bgColorClass, suffix = "", prefix = "" }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform ${colorClass}`}>
        <Icon size={80} />
      </div>
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={`p-3 rounded-2xl ${bgColorClass} ${colorClass} bg-opacity-10`}>
          <Icon size={24} />
        </div>
        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-black text-slate-900 tracking-tight">
          {prefix}{value.toLocaleString()}{suffix}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-2"><Zap size={16} className="animate-pulse" /><span className="text-[11px] font-black uppercase tracking-[0.3em]">Platinum Analytics Core</span></div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Dashboard</h1>
          <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest">Painel Tático de Performance Comercial</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 px-5 py-2 border-r border-slate-100">
            <Layers size={18} className="text-slate-300" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Funil</span>
              <select className="text-xs font-black bg-transparent border-none p-0 focus:ring-0 text-slate-700 uppercase" value={filterFunnelId} onChange={e => setFilterFunnelId(e.target.value)}>
                <option value="">Visão Global</option>
                {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-2 border-r border-slate-100">
            <Users size={18} className="text-slate-300" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Consultor</span>
              <select className="text-xs font-black bg-transparent border-none p-0 focus:ring-0 text-slate-700 uppercase" value={filterSellerId} onChange={e => setFilterSellerId(e.target.value)}>
                <option value="">Time Completo</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-2">
            <Calendar size={18} className="text-slate-300" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Período</span>
              <div className="flex items-center gap-2">
                <input type="date" className="text-[10px] font-black text-slate-700 bg-transparent border-none p-0 focus:ring-0 uppercase" value={dateStart} onChange={e => setDateStart(e.target.value)}/>
                <span className="text-slate-300 text-[10px]">/</span>
                <input type="date" className="text-[10px] font-black text-slate-700 bg-transparent border-none p-0 focus:ring-0 uppercase" value={dateEnd} onChange={e => setDateEnd(e.target.value)}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Vendas Brutas" value={dashboardData.totalRevenue} prefix="R$ " icon={DollarSign} colorClass="text-emerald-500" bgColorClass="bg-emerald-50" />
        <StatCard title="Negociações" value={dashboardData.negTotais} icon={Briefcase} colorClass="text-slate-500" bgColorClass="bg-slate-50" />
        <StatCard title="Em Fluxo" value={dashboardData.negAndamento} icon={Clock} colorClass="text-amber-500" bgColorClass="bg-amber-50" />
        <StatCard title="Ganhos (Won)" value={dashboardData.negGanhas} icon={CheckCircle2} colorClass="text-emerald-600" bgColorClass="bg-emerald-50" />
        <StatCard title="Perdas (Lost)" value={dashboardData.negPerdidas} icon={XCircle} colorClass="text-rose-500" bgColorClass="bg-rose-50" />
        <StatCard title="Conversão" value={parseFloat(dashboardData.conversion)} suffix="%" icon={TrendingUp} colorClass="text-amber-500" bgColorClass="bg-amber-50" />
      </div>

      {/* ── Novos cards: Metas · Custos × Faturamento · Campanhas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1 — Meta Total dos Projetos */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-5 hover:shadow-xl hover:translate-y-[-4px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-500"><Target size={24} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meta Total dos Projetos</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            R$ {metaData.metaValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta de Volume</p>
              <p className="text-lg font-black text-slate-700">{metaData.metaQty.toLocaleString()} un.</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">VGV Alvo</p>
              <p className="text-lg font-black text-amber-600">R$ {(metaData.metaValue / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </div>

        {/* Card 2 — Custos × Faturamento */}
        <div className="bg-slate-900 rounded-[2.5rem] shadow-xl p-8 space-y-5 hover:translate-y-[-4px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-slate-800 text-emerald-400"><BarChart2 size={24} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Custos × Faturamento</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Faturamento Total</p>
                <p className="text-2xl font-black text-emerald-400">R$ {costsData.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Custo Total</p>
                <p className="text-xl font-black text-rose-400">R$ {costsData.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            {/* Barra proporcional */}
            {costsData.totalRevenue > 0 && (
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((costsData.totalRevenue / Math.max(costsData.totalRevenue, costsData.totalCost)) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-slate-800">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">ROI Geral</p>
            {costsData.roi !== null ? (
              <p className={`text-2xl font-black ${costsData.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {costsData.roi >= 0 ? '+' : ''}{costsData.roi.toFixed(1)}%
              </p>
            ) : (
              <p className="text-xl font-black text-slate-600">— Sem custos</p>
            )}
          </div>
        </div>

        {/* Card 3 — Campanhas */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-5 hover:shadow-xl hover:translate-y-[-4px] transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-violet-50 text-violet-500"><Megaphone size={24} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Campanhas (Ações CS)</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{campaignsData.total}</p>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ativas</p>
                <p className="text-lg font-black text-amber-600">{campaignsData.active}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encerradas</p>
                <p className="text-lg font-black text-slate-500">{campaignsData.closed}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-10"><div className="flex items-center gap-4"><div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200"><BarChart3 size={20} /></div><div><h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Cronograma de Faturamento</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evolução baseada em filtros ativos</p></div></div></div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTimeSeries}>
                <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`}/>
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'black' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Target size={240} className="text-white" /></div>
            <div className="relative z-10"><h3 className="text-amber-400 text-xs font-black uppercase tracking-[0.3em] mb-6">Market Intel Insights</h3><div className="space-y-6"><div className="space-y-1"><p className="text-white text-4xl font-black italic tracking-tighter leading-none">{dashboardData.conversion}% <span className="text-lg text-slate-500 not-italic ml-2 tracking-normal">Taxa Total</span></p><div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden"><div className="bg-amber-500 h-full rounded-full" style={{ width: `${dashboardData.conversion}%` }} /></div></div><p className="text-slate-400 text-sm font-medium leading-relaxed">{parseFloat(dashboardData.conversion) > 25 ? "Suas operações estão com tração superior ao benchmark regional." : "Identificamos gargalo no estágio de Apresentação."}</p></div></div>
            <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-slate-800 pt-8 mt-8"><div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ticket Médio</p><p className="text-xl font-black text-white">R$ {dashboardData.negGanhas > 0 ? (dashboardData.totalRevenue / dashboardData.negGanhas).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0}</p></div><div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Perdas Totais</p><p className="text-xl font-black text-rose-400">{dashboardData.negPerdidas}</p></div></div>
        </div>

        <div className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Activity size={20} /></div><div><h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Status da Base</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distribuição por período</p></div></div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStatusData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 800}}/><YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}/>
                    <Tooltip cursor={{fill: '#f8fafc', radius: 12}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'black' }} />
                    <Bar dataKey="won" name="Vendas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} /><Bar dataKey="lost" name="Perdas" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} /><Bar dataKey="ongoing" name="Andamento" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><AlertTriangle size={20} /></div><div><h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Análise de Churn</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Principais motivos de perda filtrados</p></div></div>
          <div className="flex-1">
            {dashboardData.lossReasonsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%"><BarChart data={dashboardData.lossReasonsData} layout="vertical" margin={{ left: 20, right: 40 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} width={110}/>
                        <Tooltip cursor={{fill: '#f8fafc', radius: 12}} contentStyle={{ borderRadius: '24px', border: 'none' }} />
                        <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={32}>{dashboardData.lossReasonsData.map((e, i) => <Cell key={`c-${i}`} fill={i === 0 ? '#f43f5e' : '#fda4af'} />)}</Bar>
                    </BarChart></ResponsiveContainer>
            ) : (<div className="h-full flex flex-col items-center justify-center text-slate-300"><XCircle size={64} className="mb-4 opacity-10" /><p className="font-black uppercase text-xs tracking-widest">Nenhuma perda detectada</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
