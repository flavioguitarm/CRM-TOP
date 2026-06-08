
import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../store';
import { 
  X, Check, User, Mail, Phone, GraduationCap, Building2, Clock3, 
  Tag as TagIcon, MessageSquare, Plus, ShoppingCart, DollarSign,
  TrendingUp, AlertCircle, CheckCircle2, XCircle, ArrowRight, History, Hash,
  ListTodo, Calendar, Clock, Trash2, CheckCircle, Package, AlertTriangle,
  Download
} from 'lucide-react';
import { Activity, UserRole, Task, ProductNegotiation, Sale } from '../types';
import * as XLSX from 'xlsx';
import ConfirmModal from './ConfirmModal';

interface Props {
  clientId: string;
}

const HistoryModal: React.FC<{ activities: Activity[]; onClose: () => void; clientName: string }> = ({ activities, onClose, clientName }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
    <div className="bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-700 animate-in zoom-in-95 duration-200">
      <div className="p-8 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-700 text-white rounded-2xl">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Histórico Completo</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{clientName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-all"><X size={32} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="p-6 bg-slate-700 rounded-3xl border border-slate-600 shadow-sm transition-all hover:border-amber-500 group">
             <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em]">{activity.type}</span>
                <span className="text-[10px] font-bold text-slate-400">{activity.timestamp}</span>
             </div>
             <p className="text-sm text-white font-black leading-relaxed group-hover:not-italic transition-all">
                {activity.description}
             </p>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="py-20 text-center text-slate-500 uppercase text-xs font-black tracking-widest">
             Nenhum registro encontrado.
          </div>
        )}
      </div>
      <div className="p-8 bg-slate-900/50 border-t border-slate-700 text-center">
         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fim do Histórico de Interações</p>
      </div>
    </div>
  </div>
);

const ClientProfileView: React.FC<Props> = ({ clientId }) => {
  const { 
    clients, institutions, courses, classes, currentUser, 
    addClientActivity, products, sales, addSale, updateSale, deleteSale,
    negotiations, addNegotiation, deleteNegotiation, updateNegotiationStatus,
    tasks, addTask, toggleTask, deleteTask
  } = useData();

  const [newActivity, setNewActivity] = useState({ description: '', type: 'note' as any });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [newTask, setNewTask] = useState({ title: '', date: new Date().toISOString().split('T')[0], time: '09:00' });
  const [pendingDeleteNeg, setPendingDeleteNeg] = useState<ProductNegotiation | null>(null);

  const client = clients.find(c => c.id === clientId);
  if (!client) return <div className="p-12 text-center text-slate-400">Lead não encontrado.</div>;

  const clientClass = classes.find(c => c.id === client.classId);
  const isVisualizador = currentUser?.role === UserRole.VISUALIZADOR;

  const allowedClassProducts = useMemo(() => {
    // Se a turma tem produtos configurados, usa eles (com preço/meta da turma)
    if (clientClass && clientClass.classProducts?.length > 0) {
      return clientClass.classProducts.map(cp => {
        const baseInfo = products.find(p => p.id === cp.productId);
        return {
          ...cp,
          name: baseInfo?.name || 'Produto Removido'
        };
      });
    }
    // Fallback: sem turma ou turma sem produtos → lista todos os produtos do catálogo
    return products.map(p => ({
      productId: p.id,
      name: p.name,
      customPrice: 0,
      goalQuantity: 0,
      saleLimit: 'MULTIPLO' as const,
    }));
  }, [clientClass, products]);

  const clientSales = useMemo(() => sales.filter(s => s.clientId === client.id), [sales, client.id]);
  const clientNegotiations = useMemo(() => negotiations.filter(n => n.clientId === client.id), [negotiations, client.id]);

  // IDs de produtos com limite ÚNICO que este cliente já possui (neg ativa ou venda)
  const uniqueLimitProductsOwned = useMemo(() => {
    const ownedProductIds = new Set<string>();
    // Conta negociações não perdidas
    clientNegotiations
      .filter(n => n.status !== 'PERDIDO')
      .forEach(n => ownedProductIds.add(n.productId));
    // Conta vendas diretas
    clientSales.forEach(s => ownedProductIds.add(s.productId));
    // Filtra apenas os que têm saleLimit === 'UNICO'
    return new Set(
      allowedClassProducts
        .filter(cp => cp.saleLimit === 'UNICO' && ownedProductIds.has(cp.productId))
        .map(cp => cp.productId)
    );
  }, [clientNegotiations, clientSales, allowedClassProducts]);
  const clientTasks = useMemo(() => tasks.filter(t => t.clientId === client.id).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)), [tasks, client.id]);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.description) return;
    const activity: Activity = {
      id: Date.now().toString(),
      type: newActivity.type,
      description: newActivity.description,
      timestamp: new Date().toLocaleString('pt-BR'),
    };
    addClientActivity(client.id, activity);
    setNewActivity({ description: '', type: 'note' });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      clientId: client.id,
      title: newTask.title,
      date: newTask.date,
      time: newTask.time,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    // Adiciona a tarefa
    addTask(task);

    // Registra no histórico de atividades automaticamente
    const activity: Activity = {
      id: `act-task-${Date.now()}`,
      type: 'note',
      description: `TAREFA AGENDADA: "${task.title}" para o dia ${new Date(task.date).toLocaleDateString('pt-BR')} às ${task.time}`,
      timestamp: new Date().toLocaleString('pt-BR'),
    };
    addClientActivity(client.id, activity);

    setNewTask({ ...newTask, title: '' });
  };

  const handleExportActivities = () => {
    const dataToExport = client.activities.map(a => ({
      "Atividade": a.description,
      "Data e Horário": a.timestamp
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atividades");
    XLSX.writeFile(wb, `atividades_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleStartNegotiation = () => {
    if (!selectedProductId || !customPrice || !quantity) return;

    // Bloqueia produto ÚNICO já adquirido
    if (uniqueLimitProductsOwned.has(selectedProductId)) return;

    const prod = products.find(p => p.id === selectedProductId);
    const value = parseFloat(customPrice);
    const qty = parseInt(quantity) || 1;

    const neg: ProductNegotiation = {
      id: `neg-${Date.now()}`,
      clientId: client.id,
      productId: selectedProductId,
      value: value,
      quantity: qty,
      status: 'ABERTO',
      createdAt: new Date().toISOString().split('T')[0],
      sellerId: currentUser?.id || ''
    };

    addNegotiation(neg);

    const activity: Activity = {
      id: `act-neg-${Date.now()}`,
      type: 'note',
      description: `Interesse comercial registrado: ${prod?.name || 'Produto'} (Qtd: ${qty} - R$ ${(value * qty).toLocaleString()})`,
      timestamp: new Date().toLocaleString('pt-BR'),
    };
    addClientActivity(client.id, activity);

    setSelectedProductId(''); setCustomPrice(''); setQuantity('1');
  };

  const handleWinNegotiation = (neg: ProductNegotiation) => {
    const sale: Sale = {
      id: `sale-${Date.now()}`,
      clientId: client.id,
      productId: neg.productId,
      sellerId: currentUser?.id || '',
      value: neg.value,
      quantity: neg.quantity,
      date: new Date().toISOString().split('T')[0],
      classId: client.classId,
      negotiationId: neg.id
    };
    addSale(sale);
    updateNegotiationStatus(neg.id, 'GANHO');
  };

  const handleLoseNegotiation = (id: string) => {
    updateNegotiationStatus(id, 'PERDIDO');
  };

  const handleUpdateSaleDate = (saleId: string, newDate: string) => {
      const sale = sales.find(s => s.id === saleId);
      if (sale) updateSale({ ...sale, date: newDate });
  };

  // Função de exclusão liberada com log automático
  const handleDeleteNegotiationWithLog = (neg: ProductNegotiation) => {
    setPendingDeleteNeg(neg);
  };

  const confirmDeleteNegotiation = () => {
    const neg = pendingDeleteNeg;
    if (!neg) return;
    setPendingDeleteNeg(null);
    
    const prod = products.find(p => p.id === neg.productId);
    const activity: Activity = {
      id: `act-del-${Date.now()}`,
      type: 'note',
      description: `REGISTRO EXCLUÍDO: ${prod?.name || 'Produto'} - Qtd: ${neg.quantity} - Total: R$ ${(neg.value * neg.quantity).toLocaleString()} - Excluído por ${currentUser?.name || 'Sistema'} em ${new Date().toLocaleString('pt-BR')}`,
      timestamp: new Date().toLocaleString('pt-BR'),
    };
    
    // Registra no histórico
    addClientActivity(client.id, activity);
    
    // Deleta o registro
    deleteNegotiation(neg.id);
  };

  const visibleActivities = client.activities.slice(0, 3);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-8 space-y-8">
        {/* Header do Perfil */}
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-2xl font-black text-amber-600 border-4 border-white shadow-xl">
            {client.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">{client.name}</h3>
            <div className="flex flex-wrap gap-2">
               {client.tags.map(t => (
                 <span key={t} className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-widest">{t}</span>
               ))}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Turma: {clientClass?.name || 'Não informada'}</p>
          </div>
        </div>

        {/* Plano de Ação / Tarefas */}
        <section className="space-y-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <ListTodo size={14} className="text-amber-500" /> Plano de Ação / Tarefas
          </h4>

          {!isVisualizador && (
            <form onSubmit={handleCreateTask} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nova Atividade Agendada</label>
                  <input required placeholder="Ex: Ligar para confirmar mesa extra" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold shadow-inner" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold shadow-inner outline-none" value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} />
                  </div>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="time" className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold shadow-inner outline-none" value={newTask.time} onChange={e => setNewTask({...newTask, time: e.target.value})} />
                  </div>
               </div>
               <button type="submit" className="w-full bg-amber-500 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-amber-600 transition-all shadow-lg shadow-amber-200">Agendar na Agenda</button>
            </form>
          )}

          <div className="space-y-2">
            {clientTasks.map(task => (
              <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${task.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-amber-200 shadow-sm'}`}>
                 <div className="flex items-center gap-3">
                    <button onClick={() => toggleTask(task.id)} className={`p-1.5 rounded-lg transition-all ${task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 hover:text-emerald-500'}`}><CheckCircle size={16} /></button>
                    <div>
                       <p className={`text-xs font-black uppercase tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</p>
                       <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-slate-400 uppercase">
                          <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(task.date).toLocaleDateString('pt-BR')}</span>
                          <span className="flex items-center gap-1"><Clock size={10}/> {task.time}</span>
                       </div>
                    </div>
                 </div>
                 {!isVisualizador && (
                    <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                 )}
              </div>
            ))}
          </div>
        </section>

        {/* Negociações & Pedidos - DESTAQUE AUMENTADO E EXCLUSÃO LIBERADA */}
        <section className="space-y-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <ShoppingCart size={14} className="text-amber-500" /> Negociações & Pedidos
          </h4>
          
          <div className="space-y-4">
            {clientNegotiations.map(neg => {
              const prod = products.find(p => p.id === neg.productId);
              const sale = sales.find(s => s.negotiationId === neg.id);
              const isResolved = neg.status !== 'ABERTO';

              return (
                <div 
                  key={neg.id} 
                  className={`flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all ${
                    isResolved 
                    ? 'bg-slate-50 border-slate-100 opacity-60' 
                    : 'bg-white border-amber-400 border-l-[12px] border-l-amber-500 shadow-xl scale-[1.01]'
                  } group relative overflow-hidden`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-3xl border-2 transition-all ${
                      neg.status === 'ABERTO' ? 'bg-amber-100 text-amber-600 border-amber-200 animate-pulse' :
                      neg.status === 'GANHO' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                      'bg-rose-100 text-rose-600 border-rose-200'
                    }`}>
                      <Package size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-black uppercase tracking-tight leading-none ${isResolved ? 'text-slate-500 text-xs' : 'text-slate-900 text-base'}`}>
                          {prod?.name || 'Produto Removido'}
                        </p>
                        {!isResolved && <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400 uppercase">
                        <span className={`px-2 py-0.5 rounded-lg border font-black ${
                            neg.status === 'ABERTO' ? 'bg-amber-500 text-white border-amber-500' : 
                            neg.status === 'GANHO' ? 'bg-emerald-500 text-white border-emerald-500' : 
                            'bg-rose-500 text-white border-rose-500'
                        }`}>
                          {neg.status === 'ABERTO' ? 'Pendente' : neg.status === 'GANHO' ? 'Venda' : 'Perda'}
                        </span>
                        <span>•</span>
                        <span className="font-black text-slate-600 bg-slate-100 px-2 rounded-md">Qtd: {neg.quantity}</span>
                        {neg.status === 'GANHO' && sale && (
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                             <Calendar size={10} className="text-emerald-500" />
                             <input 
                               type="date" 
                               className="text-[9px] font-black text-slate-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                               value={sale.date}
                               onChange={(e) => handleUpdateSaleDate(sale.id, e.target.value)}
                             />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                       <p className={`font-black tracking-tight ${isResolved ? 'text-sm text-slate-500' : 'text-xl text-slate-900'}`}>
                         R$ {(neg.value * neg.quantity).toLocaleString()}
                       </p>
                       {neg.status === 'ABERTO' && !isVisualizador && (
                         <div className="flex gap-1.5 mt-2 justify-end">
                            <button onClick={() => handleWinNegotiation(neg)} className="text-[8px] font-black uppercase bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100">Venda</button>
                            <button onClick={() => handleLoseNegotiation(neg.id)} className="text-[8px] font-black uppercase bg-rose-500 text-white px-3 py-1 rounded-lg hover:bg-rose-600 transition-all shadow-md shadow-rose-100">Perda</button>
                         </div>
                       )}
                    </div>
                    {/* Botão Excluir liberado para todos com Log */}
                    <button 
                      onClick={() => handleDeleteNegotiationWithLog(neg)}
                      className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                      title="Excluir Registro"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!isVisualizador && (() => {
            const selectedCp = allowedClassProducts.find(cp => cp.productId === selectedProductId);
            const isUnicoBlocked = selectedProductId !== '' && uniqueLimitProductsOwned.has(selectedProductId);
            const isUnicoSelected = selectedCp?.saleLimit === 'UNICO';

            return (
              <div className="p-8 bg-white rounded-[3rem] border border-slate-200 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Registrar Interesse Comercial</p>

                <select
                  className="w-full p-4 text-xs border border-slate-200 rounded-2xl bg-white font-bold shadow-inner outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    const item = allowedClassProducts.find(cp => cp.productId === e.target.value);
                    if (item) setCustomPrice(item.customPrice.toString());
                    setQuantity('1');
                  }}
                >
                  <option value="">Escolher Produto...</option>
                  {allowedClassProducts.map(p => {
                    const blocked = uniqueLimitProductsOwned.has(p.productId);
                    const lotLabel = p.lotType ? ` · ${p.lotType.replace('_', ' ')}` : '';
                    const planLabel = p.planName ? ` · ${p.planName}` : '';
                    return (
                      <option key={p.productId} value={p.productId} disabled={blocked}>
                        {p.name}{planLabel}{lotLabel}{p.saleLimit === 'UNICO' ? ' · ① Único' : ''}
                        {blocked ? ' — já adquirido' : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Badge de limite + plano + lote do produto selecionado */}
                {selectedProductId && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex-wrap ${
                    isUnicoSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span>{isUnicoSelected ? '①' : '∞'}</span>
                    {isUnicoSelected ? 'Produto com limite único por aluno' : 'Produto sem limite de unidades'}
                    {selectedCp?.planName && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 border border-current/20">
                        {selectedCp.planName}
                      </span>
                    )}
                    {selectedCp?.lotType && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 border border-current/20">
                        {selectedCp.lotType.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                )}

                {/* Mensagem de bloqueio */}
                {isUnicoBlocked && (
                  <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-rose-500 mt-0.5 shrink-0 text-base">⊘</span>
                    <p className="text-[10px] font-black text-rose-700 uppercase leading-relaxed">
                      Este produto já foi adquirido por este cliente e possui limite de 1 unidade.
                    </p>
                  </div>
                )}

                <div className={`grid grid-cols-3 gap-3 transition-opacity ${isUnicoBlocked ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="col-span-2 relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" placeholder="Preço" className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-2xl text-xs font-black shadow-inner bg-white outline-none focus:ring-2 focus:ring-amber-500" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={isUnicoSelected ? 1 : undefined}
                    placeholder="Qtd"
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-black shadow-inner bg-white outline-none focus:ring-2 focus:ring-amber-500 text-center"
                    value={quantity}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      setQuantity(isUnicoSelected ? '1' : String(val));
                    }}
                  />
                </div>

                <button
                  onClick={handleStartNegotiation}
                  disabled={!selectedProductId || !customPrice || isUnicoBlocked}
                  className="w-full bg-slate-900 text-white py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                >
                  <Plus size={16} /> Adicionar à Lista de Desejos
                </button>
              </div>
            );
          })()}
        </section>

        {/* Histórico de Atividades */}
        <section className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <MessageSquare size={14} className="text-amber-500" /> Atividades
                </h4>
                <button 
                    onClick={handleExportActivities}
                    title="Exportar Atividades (Excel)"
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                >
                    <Download size={16} />
                </button>
            </div>
            {client.activities.length > 3 && (
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest"
              >
                Ver Todas
              </button>
            )}
          </div>

          {!isVisualizador && (
            <form onSubmit={handleAddActivity} className="space-y-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <textarea 
                className="w-full p-4 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[100px] bg-white font-medium shadow-inner"
                placeholder="Ex: Cliente demonstrou interesse no álbum de luxo..."
                value={newActivity.description}
                onChange={(e) => setNewActivity(p => ({...p, description: e.target.value}))}
              />
              <div className="flex items-center justify-between">
                <select 
                    className="text-[10px] font-black uppercase border border-slate-200 rounded-xl px-4 py-2 bg-white text-slate-600 outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                    value={newActivity.type}
                    onChange={(e) => setNewActivity(p => ({...p, type: e.target.value as any}))}
                  >
                    <option value="note">Nota Interna</option>
                    <option value="call">Ligação</option>
                    <option value="email">E-mail</option>
                    <option value="meeting">Reunião</option>
                </select>
                <button className="bg-amber-500 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all">
                  Salvar Nota
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {visibleActivities.map(activity => (
              <div key={activity.id} className="relative pl-8 pb-4 border-l-2 border-slate-100 last:border-0">
                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-4 border-amber-500 rounded-full shadow-sm" />
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest">{activity.type}</span>
                    <span className="text-[9px] font-bold text-slate-400">{activity.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isHistoryModalOpen && (
        <HistoryModal 
          activities={client.activities} 
          onClose={() => setIsHistoryModalOpen(false)} 
          clientName={client.name} 
        />
      )}

      {pendingDeleteNeg && (
        <ConfirmModal
          title="Excluir Registro"
          message="Deseja excluir este registro? Se for uma venda já efetivada, o valor será estornado do financeiro do cliente."
          confirmLabel="Sim, Excluir"
          onConfirm={confirmDeleteNegotiation}
          onCancel={() => setPendingDeleteNeg(null)}
        />
      )}
    </div>
  );
};

export default ClientProfileView;
