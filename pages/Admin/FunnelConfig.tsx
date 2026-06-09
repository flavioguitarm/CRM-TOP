
import React, { useState, useMemo } from 'react';
import { useData } from '../../store';
import {
  Plus, Trash2, X,
  ChevronUp, ChevronDown, Palette,
  Download, FileSpreadsheet, Edit3,
  GitBranch,
} from 'lucide-react';
import { Funnel, FunnelStage, UserRole, FunnelStageType } from '../../types';
import ConfirmModal from '../../components/ConfirmModal';
import * as XLSX from 'xlsx';

// Paleta simplificada de 256 cores (amostra representativa por segurança visual)
const COLOR_PALETTE = [
  '#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888', '#999999', '#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE', '#FFFFFF',
  '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00', '#CCFF00', '#99FF00', '#66FF00', '#33FF00', '#00FF00', '#00FF33', '#00FF66', '#00FF99', '#00FFCC', '#00FFFF',
  '#00CCFF', '#0099FF', '#0066FF', '#0033FF', '#0000FF', '#3300FF', '#6600FF', '#9900FF', '#CC00FF', '#FF00FF', '#FF00CC', '#FF0099', '#FF0066', '#FF0033', '#800000', '#808000',
  '#008000', '#800080', '#008080', '#000080', '#C0C0C0', '#808080', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
  '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412',
  '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#fef9c3', '#fef08a', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12',
  '#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d',
  '#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1',
  '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
  '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f',
  '#fdf2f8', '#fce7f3', '#fbcfe8', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c'
];

const ColorPicker: React.FC<{ selected: string, onSelect: (c: string) => void }> = ({ selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden transition-transform hover:scale-110"
                style={{ backgroundColor: selected }}
            >
                {!selected && <Palette size={14} className="text-slate-400"/>}
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 w-[240px] bg-white border border-slate-200 p-3 rounded-[1.5rem] shadow-2xl z-[110] animate-in zoom-in-95 duration-150">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Seleção Profissional (256 Cores)</p>
                        <div className="grid grid-cols-10 gap-1 max-h-[180px] overflow-y-auto p-1 custom-scrollbar">
                            {COLOR_PALETTE.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => { onSelect(c); setIsOpen(false); }}
                                    className={`w-4 h-4 rounded-sm border ${selected === c ? 'ring-2 ring-amber-500 scale-125 z-10' : 'border-slate-100 hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const FunnelConfig: React.FC = () => {
  const { funnels, users, clients, clientFunnelEntries, updateFunnel, addFunnel, deleteFunnel, isStageOccupied, currentUser } = useData();
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null); // modo edição de etapas
  const [detailFunnel,   setDetailFunnel]   = useState<Funnel | null>(null); // painel de detalhes
  const [isAddingFunnel, setIsAddingFunnel] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Contagem de clientes por etapa de um funil (fonte: client_funnels)
  const clientsByStage = useMemo(() => {
    const map: Record<string, number> = {};
    if (!detailFunnel) return map;
    clientFunnelEntries
      .filter(e => e.funnelId === detailFunnel.id)
      .forEach(e => { map[e.stageId] = (map[e.stageId] || 0) + 1; });
    return map;
  }, [clientFunnelEntries, detailFunnel]);

  const handleExportStage = (funnel: Funnel, stage: FunnelStage) => {
    const clientIdsInStage = new Set(
      clientFunnelEntries.filter(e => e.funnelId === funnel.id && e.stageId === stage.id).map(e => e.clientId)
    );
    const rows = clients
      .filter(c => clientIdsInStage.has(c.id))
      .map(c => ({ Nome: c.name, Email: c.email, Telefone: c.phone, Etapa: stage.name }));
    if (!rows.length) { alert('Nenhum cliente nesta etapa.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, stage.name.slice(0, 31));
    XLSX.writeFile(wb, `funil_${funnel.name}_etapa_${stage.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportFunnel = (funnel: Funnel) => {
    const entriesInFunnel = clientFunnelEntries.filter(e => e.funnelId === funnel.id);
    const clientIdsInFunnel = new Set(entriesInFunnel.map(e => e.clientId));
    const rows = clients
      .filter(c => clientIdsInFunnel.has(c.id))
      .map(c => {
        const entry = entriesInFunnel.find(e => e.clientId === c.id);
        const stage = funnel.stages.find(s => s.id === entry?.stageId);
        return { Nome: c.name, Email: c.email, Telefone: c.phone, Etapa: stage?.name || '—', 'Total (R$)': c.totalValue };
      });
    if (!rows.length) { alert('Nenhum cliente neste funil.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, funnel.name.slice(0, 31));
    XLSX.writeFile(wb, `funil_${funnel.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpdateStage = (stageId: string, updates: Partial<FunnelStage>) => {
    if (!selectedFunnel) return;
    
    let newStages = [...selectedFunnel.stages];
    
    // Regra: Apenas uma etapa de cada tipo especial por funil
    if (updates.type && (updates.type === 'WON' || updates.type === 'LOST')) {
      newStages = newStages.map(s => {
        if (s.type === updates.type) return { ...s, type: 'NORMAL' as FunnelStageType };
        return s;
      });
    }

    newStages = newStages.map(s => s.id === stageId ? { ...s, ...updates } : s);
    const updated = { ...selectedFunnel, stages: newStages };
    updateFunnel(updated);
    setSelectedFunnel(updated);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!selectedFunnel) return;
    if (isStageOccupied(stageId)) { alert('Esta etapa está em uso por um ou mais clientes e não pode ser removida.'); return; }
    const stage = selectedFunnel.stages.find(s => s.id === stageId);
    setConfirmConfig({
      title: 'Remover Etapa',
      message: `Deseja remover a etapa "${stage?.name || ''}" do funil?`,
      onConfirm: () => {
        const updated = { ...selectedFunnel, stages: selectedFunnel.stages.filter(s => s.id !== stageId) };
        updateFunnel(updated);
        setSelectedFunnel(updated);
        setConfirmConfig(null);
      },
    });
  };

  const handleAddStage = () => {
    if (!selectedFunnel) return;
    const newStage: FunnelStage = {
      id: crypto.randomUUID(),
      name: 'Nova Etapa',
      order: selectedFunnel.stages.length,
      type: 'NORMAL',
      color: '#cbd5e1'
    };
    const updated = {
      ...selectedFunnel,
      stages: [...selectedFunnel.stages, newStage]
    };
    updateFunnel(updated);
    setSelectedFunnel(updated);
  };

  const handleMoveStage = (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedFunnel) return;
    const newStages = [...selectedFunnel.stages].sort((a, b) => a.order - b.order);
    
    if (direction === 'UP' && index > 0) {
      [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
    } else if (direction === 'DOWN' && index < newStages.length - 1) {
      [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    } else {
      return;
    }

    const reordered = newStages.map((s, idx) => ({ ...s, order: idx }));
    const updated = { ...selectedFunnel, stages: reordered };
    updateFunnel(updated);
    setSelectedFunnel(updated);
  };

  // ── Modo edição de etapas ─────────────────────────────────────────────────
  if (selectedFunnel) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button onClick={() => setSelectedFunnel(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black uppercase text-xs transition-colors">
          <X size={20} /> Voltar para Funis
        </button>
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-8">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-8">Etapas: {selectedFunnel.name}</h2>
          <div className="space-y-3">
            {selectedFunnel.stages.sort((a,b) => a.order - b.order).map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-4 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleMoveStage(index, 'UP')} disabled={index === 0} className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20"><ChevronUp size={16} /></button>
                  <button onClick={() => handleMoveStage(index, 'DOWN')} disabled={index === selectedFunnel.stages.length - 1} className="p-1 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-20"><ChevronDown size={16} /></button>
                </div>
                <ColorPicker selected={stage.color || '#cbd5e1'} onSelect={(c) => handleUpdateStage(stage.id, { color: c })} />
                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 font-black uppercase text-sm"
                  value={stage.name}
                  onChange={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                />
                <select
                  className="text-[9px] font-black uppercase bg-white border border-slate-200 rounded-lg px-2 py-1"
                  value={stage.type || 'NORMAL'}
                  onChange={(e) => handleUpdateStage(stage.id, { type: e.target.value as any })}
                >
                  <option value="NORMAL">Etapa Normal</option>
                  <option value="WON">Venda (Won)</option>
                  <option value="LOST">Perda (Lost)</option>
                </select>
                <button onClick={() => handleDeleteStage(stage.id)} className="p-3 text-slate-300 hover:text-rose-500" title="Remover etapa"><Trash2 size={20}/></button>
              </div>
            ))}
            <button onClick={handleAddStage} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-amber-400 hover:text-amber-500 transition-all flex items-center justify-center gap-2">
              <Plus size={16}/> Adicionar Nova Etapa
            </button>
          </div>
        </div>
        {confirmConfig && <ConfirmModal title={confirmConfig.title} message={confirmConfig.message} confirmLabel="Sim, Remover" onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(null)} />}
      </div>
    );
  }

  // ── Modo lista + painel de detalhes ───────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Configuração de Funis</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Gerencie os fluxos de trabalho comerciais da empresa.</p>
        </div>
        <button
          onClick={() => setIsAddingFunnel(true)}
          className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/30 flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={18}/> Novo Funil
        </button>
      </div>

      {isAddingFunnel && (
        <div className="bg-white rounded-[2.5rem] border border-amber-200 shadow-sm p-6 animate-in fade-in duration-200">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newFunnelName.trim()) return;
            const DEFAULT_STAGES = [
              { name: 'Sem Contato',      color: '#94a3b8' },
              { name: 'Contatado',        color: '#f59e0b' },
              { name: 'Proposta Enviada', color: '#3b82f6' },
              { name: 'Negociação',       color: '#8b5cf6' },
              { name: 'Fechamento',       color: '#10b981' },
            ];
            addFunnel({
              id: crypto.randomUUID(),
              name: newFunnelName.trim(),
              stages: DEFAULT_STAGES.map((s, idx) => ({
                id: crypto.randomUUID(),
                name: s.name,
                order: idx,
                color: s.color,
                type: 'NORMAL' as const,
              })),
              responsibleUserIds: [],
            });
            setNewFunnelName(''); setIsAddingFunnel(false);
          }} className="flex gap-3 items-center">
            <GitBranch size={20} className="text-amber-500 flex-shrink-0" />
            <input autoFocus value={newFunnelName} onChange={(e) => setNewFunnelName(e.target.value)} placeholder="Nome do novo funil..." className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button type="submit" className="bg-amber-500 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors">Criar</button>
            <button type="button" onClick={() => { setIsAddingFunnel(false); setNewFunnelName(''); }} className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
          </form>
        </div>
      )}

      {/* Lista + Painel de detalhes */}
      <div className={`flex gap-4 min-h-[500px]`}>
        {/* Lista de funis */}
        <div className={`${detailFunnel ? 'w-1/2' : 'w-full'} bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all`}>
          <div className="flex-1 divide-y divide-slate-50">
            {funnels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                <GitBranch size={48} className="mb-3 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum funil cadastrado</p>
              </div>
            )}
            {funnels.map(funnel => {
              const totalClients = clientFunnelEntries.filter(e => e.funnelId === funnel.id).length;
              const isSelected = detailFunnel?.id === funnel.id;
              return (
                <div
                  key={funnel.id}
                  onClick={() => setDetailFunnel(isSelected ? null : funnel)}
                  className={`flex items-center gap-4 px-6 py-5 cursor-pointer transition-all group ${isSelected ? 'bg-amber-50 border-l-4 border-amber-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-amber-500' : 'bg-slate-100 group-hover:bg-amber-100'}`}>
                    <GitBranch size={18} className={isSelected ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 uppercase text-sm truncate">{funnel.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{funnel.stages.length} etapas · {totalClients} clientes</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <>
                        <button onClick={() => { setDetailFunnel(null); setSelectedFunnel(funnel); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar etapas">
                          <Edit3 size={16}/>
                        </button>
                        <button onClick={() => setConfirmConfig({ title: 'Excluir Funil', message: `Deseja excluir o funil "${funnel.name}"? Clientes vinculados perderão a etapa.`, onConfirm: () => { deleteFunnel(funnel.id); if (detailFunnel?.id === funnel.id) setDetailFunnel(null); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Excluir">
                          <Trash2 size={16}/>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel de detalhes (sem backdrop) */}
        {detailFunnel && (() => {
          const f = funnels.find(fn => fn.id === detailFunnel.id) || detailFunnel;
          const totalClients = clientFunnelEntries.filter(e => e.funnelId === f.id).length;
          return (
            <div className="w-1/2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-200">
              {/* Cabeçalho */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch size={16} className="text-amber-500" />
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Funil</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{f.name}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{f.stages.length} etapas · {totalClients} clientes</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {isAdmin && (
                    <>
                      <button onClick={() => { setDetailFunnel(null); setSelectedFunnel(f); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar etapas">
                        <Edit3 size={16}/>
                      </button>
                      <button onClick={() => setConfirmConfig({ title: 'Excluir Funil', message: `Deseja excluir o funil "${f.name}"?`, onConfirm: () => { deleteFunnel(f.id); setDetailFunnel(null); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Excluir">
                        <Trash2 size={16}/>
                      </button>
                    </>
                  )}
                  <button onClick={() => handleExportFunnel(f)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Exportar funil completo">
                    <Download size={16}/>
                  </button>
                  <button onClick={() => setDetailFunnel(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                    <X size={16}/>
                  </button>
                </div>
              </div>

              {/* Etapas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 pb-1">Etapas e distribuição de clientes</p>
                {f.stages.sort((a,b) => a.order - b.order).map(stage => {
                  const count = clientsByStage[stage.id] || 0;
                  const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
                  const typeLabel = stage.type === 'WON' ? '🏆 Won' : stage.type === 'LOST' ? '❌ Lost' : null;
                  return (
                    <div key={stage.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group/stage">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#cbd5e1' }} />
                          <span className="text-sm font-black text-slate-800 uppercase">{stage.name}</span>
                          {typeLabel && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">{typeLabel}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-700">{count}</span>
                          <button
                            onClick={() => handleExportStage(f, stage)}
                            className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover/stage:opacity-100"
                            title={`Exportar ${stage.name}`}
                          >
                            <FileSpreadsheet size={13}/>
                          </button>
                        </div>
                      </div>
                      {/* Barra de progresso */}
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.color || '#f59e0b' }} />
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 mt-1">{pct}% do total</p>
                    </div>
                  );
                })}
                {f.stages.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8 font-bold">Nenhuma etapa cadastrada.</p>
                )}
              </div>

              {/* Footer com botão exportar geral */}
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => handleExportFunnel(f)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  <Download size={16}/> Exportar Funil Completo (XLS)
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {confirmConfig && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel="Sim, Excluir"
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};

export default FunnelConfig;
