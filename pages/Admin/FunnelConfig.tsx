
import React, { useState } from 'react';
import { useData } from '../../store';
import { 
  Plus, Settings, Trash2, GripVertical, UserPlus, Check, X, 
  AlertCircle, Layers, Users, ChevronUp, ChevronDown, Flag, Target, XCircle, Palette
} from 'lucide-react';
import { Funnel, FunnelStage, UserRole, FunnelStageType } from '../../types';
import { GenericRegistry, Column } from '../../components/GenericRegistry';

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
  const { funnels, users, updateFunnel, addFunnel, deleteFunnel, isStageOccupied, currentUser } = useData();
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [isAddingFunnel, setIsAddingFunnel] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');

  const isAdmin = currentUser?.role === UserRole.ADMIN;

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

  const handleAddStage = () => {
    if (!selectedFunnel) return;
    const newStage: FunnelStage = {
      id: `s-${Date.now()}`,
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

  // ... (Keep existing column definitions and logic for Funnel listing)
  const funnelColumns: Column<Funnel>[] = [
    { header: 'Nome do Funil', accessor: (item: Funnel) => <span className="font-bold">{item.name}</span> },
    { header: 'Etapas', accessor: (item: Funnel) => <span className="text-xs bg-slate-100 px-2 py-1 rounded">{item.stages.length}</span> }
  ];

  return (
    <div className="space-y-6">
      {!selectedFunnel ? (
        <GenericRegistry
          title="Configuração de Funis"
          description="Crie e gerencie os fluxos de trabalho comerciais da empresa."
          entityType="funnel"
          data={funnels}
          columns={funnelColumns}
          onAdd={() => setIsAddingFunnel(true)}
          onEdit={(item) => setSelectedFunnel(item)}
          onDelete={(ids) => ids.forEach(id => deleteFunnel(id))}
        />
      ) : (
        <div className="animate-in fade-in duration-300">
           <button onClick={() => setSelectedFunnel(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black uppercase text-xs mb-6 transition-colors"><X size={20} /> Voltar</button>
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
                       <button onClick={() => isStageOccupied(stage.id) ? alert('Em uso!') : handleUpdateStage(stage.id, {})} className="p-3 text-slate-300 hover:text-rose-500"><Trash2 size={20}/></button>
                    </div>
                 ))}
                 <button onClick={handleAddStage} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-amber-400 hover:text-amber-500 transition-all flex items-center justify-center gap-2"><Plus size={16}/> Adicionar Nova Etapa</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FunnelConfig;
