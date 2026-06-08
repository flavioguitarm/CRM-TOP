
import React, { useState, useMemo } from 'react';
import { useData } from '../store';
import {
  Plus, Zap, X, Edit3, Trash2, MessageSquare,
  Send, TrendingUp, DollarSign, Target,
  Calendar, CheckCircle2, LayoutGrid, FileSpreadsheet, Download, Check,
  Settings, Palette, Save
} from 'lucide-react';
import { CSAction, CSActionActivity, DemandType, ChannelType } from '../types';
import BulkImportModal from '../components/BulkImportModal';
import ConfirmModal from '../components/ConfirmModal';
import { usePermissions } from '../src/hooks/usePermissions';
import * as XLSX from 'xlsx';

// ── Modal de criação/edição de Ação CS ────────────────────────────────────────
const CSActionModal: React.FC<{
  actionToEdit?: CSAction | null;
  onClose: () => void;
}> = ({ actionToEdit, onClose }) => {
  const { classes, addCSAction, updateCSAction, currentUser, users, demandTypes } = useData();

  const [formData, setFormData] = useState<Partial<CSAction>>(
    actionToEdit || {
      classId: '',
      type: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'INICIAR',
      responsibleUserId: currentUser?.id || '',
      totalReached: 0,
      totalResponses: 0,
      volumeSold: 0,
      revenueResult: 0,
      channel: 'WhatsApp',
      activities: []
    }
  );

  const [customType, setCustomType] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [isTypeOther, setIsTypeOther] = useState(false);
  const [isStatusOther, setIsStatusOther] = useState(false);

  const selectedClass = useMemo(() => classes.find(c => c.id === formData.classId), [formData.classId, classes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId) return;

    const finalType = isTypeOther ? customType : formData.type;
    const finalStatus = isStatusOther ? customStatus : formData.status;

    const finalData = {
      ...formData,
      type: finalType || 'Geral',
      status: finalStatus || 'INICIAR',
    } as CSAction;

    if (actionToEdit) {
      updateCSAction(finalData);
    } else {
      addCSAction({
        ...finalData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        activities: [{
            id: crypto.randomUUID(),
            userName: currentUser?.name || 'Sistema',
            description: 'Ação criada e iniciada no CRM.',
            timestamp: new Date().toLocaleString('pt-BR')
        }]
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {actionToEdit ? 'Editar Ação CS' : 'Nova Operação de CS'}
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Preencha os campos para o registro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Projeto Vinculado *</label>
            <select
                required
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.classId}
                onChange={e => setFormData({...formData, classId: e.target.value})}
            >
              <option value="" className="italic">Buscar Turma...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Ano e Semestre do Projeto</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-500 shadow-inner">
               {selectedClass ? `${selectedClass.graduationYear}.${selectedClass.graduationMonth <= 6 ? '1' : '2'}` : 'Selecione um projeto...'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Tipo de Demanda</label>
            <select
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm mb-2"
                value={isTypeOther ? '__outro__' : formData.type}
                onChange={e => {
                    if (e.target.value === '__outro__') { setIsTypeOther(true); }
                    else { setIsTypeOther(false); setFormData({...formData, type: e.target.value}); }
                }}
            >
                <option value="" className="italic">Selecione um tipo de demanda...</option>
                {demandTypes.map(dt => (
                  <option key={dt.id} value={dt.name}>{dt.name}</option>
                ))}
                {demandTypes.length === 0 && (
                  <option value="" disabled>Nenhum tipo cadastrado — configure em "Tipos de Demanda"</option>
                )}
                <option value="__outro__">Outro (Livre)...</option>
            </select>
            {isTypeOther && (
              <input
                placeholder="Digite o tipo de demanda..."
                className="w-full bg-white border border-amber-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm animate-in slide-in-from-top-2"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Data Inicial</label>
                <input type="date" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5. Data Final</label>
                <input type="date" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6. Status da Ação</label>
            <select
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm mb-2"
                value={isStatusOther ? '__outro__' : formData.status}
                onChange={e => {
                    if (e.target.value === '__outro__') { setIsStatusOther(true); }
                    else { setIsStatusOther(false); setFormData({...formData, status: e.target.value}); }
                }}
            >
                <option value="INICIAR">INICIAR</option>
                <option value="FEITO">FEITO</option>
                <option value="PARADO">PARADO</option>
                <option value="NEGADO">NEGADO</option>
                <option value="__outro__">Outro (Livre)...</option>
            </select>
            {isStatusOther && (
                <input
                    placeholder="Digite o status customizado..."
                    className="w-full bg-white border border-amber-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm animate-in slide-in-from-top-2"
                    value={customStatus}
                    onChange={e => setCustomStatus(e.target.value)}
                    autoFocus
                />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">7. Consultor Responsável</label>
            <select
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm"
                value={formData.responsibleUserId || ''}
                onChange={e => setFormData({...formData, responsibleUserId: e.target.value})}
            >
              <option value="" className="italic">Selecione o consultor...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">8. Total de Atingidos</label>
                <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.totalReached} onChange={e => setFormData({...formData, totalReached: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">9. Número de Resposta</label>
                <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.totalResponses} onChange={e => setFormData({...formData, totalResponses: parseInt(e.target.value) || 0})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">10. Resultado Volume</label>
                <input type="number" className="w-full bg-white border border-emerald-100 text-emerald-900 rounded-2xl px-6 py-4 text-sm font-black shadow-sm" value={formData.volumeSold} onChange={e => setFormData({...formData, volumeSold: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">11. Resultado $ (R$)</label>
                <input type="number" step="0.01" className="w-full bg-white border border-emerald-100 text-emerald-900 rounded-2xl px-6 py-4 text-sm font-black shadow-sm" value={formData.revenueResult} onChange={e => setFormData({...formData, revenueResult: parseFloat(e.target.value) || 0})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">12. Canal</label>
            <input placeholder="Ex: WhatsApp, Instagram, Presencial..." className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value})} />
          </div>

          <div className="space-y-1 pb-10">
            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">13. Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="w-full bg-rose-50 border border-rose-100 text-rose-900 rounded-2xl px-6 py-4 text-sm font-black shadow-sm focus:ring-2 focus:ring-rose-400 outline-none"
              value={formData.cost ?? 0}
              onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
            />
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all sticky bottom-0">
            Salvar Operação
          </button>
        </form>
      </div>
    </div>
  );
};

// ── View: Configurar Tipos de Demanda ────────────────────────────────────────
const DemandTypesConfig: React.FC = () => {
  const { demandTypes, addDemandType, updateDemandType, deleteDemandType } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#94a3b8');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#f59e0b');
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (dt: DemandType) => {
    setEditingId(dt.id);
    setEditName(dt.name);
    setEditColor(dt.color);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateDemandType({ id: editingId, name: editName.trim(), color: editColor, createdAt: '' });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addDemandType({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor('#f59e0b');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Tipos de Demanda</h2>
          <p className="text-slate-400 text-xs mt-1">Tipos compartilhados entre Painel de Ações e Atendimentos Diários.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2 hover:bg-amber-600 transition-all"
        >
          <Plus size={16} /> Novo Tipo
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Formulário de adição */}
        {isAdding && (
          <div className="p-6 border-b border-slate-100 bg-amber-50 animate-in slide-in-from-top-2">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4">Novo Tipo de Demanda</p>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer flex-shrink-0"
                title="Escolha a cor"
              />
              <input
                autoFocus
                placeholder="Nome do tipo de demanda..."
                className="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
              />
              <button onClick={handleAdd} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2">
                <Save size={14} /> Salvar
              </button>
              <button onClick={() => setIsAdding(false)} className="p-3 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50">
              <th className="px-8 py-5">Cor</th>
              <th className="px-8 py-5">Nome do Tipo</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {demandTypes.map(dt => (
              <tr key={dt.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-4 w-20">
                  {editingId === dt.id ? (
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer"
                    />
                  ) : (
                    <span
                      className="inline-block w-8 h-8 rounded-xl border-2 border-white shadow-sm"
                      style={{ backgroundColor: dt.color }}
                    />
                  )}
                </td>
                <td className="px-8 py-4">
                  {editingId === dt.id ? (
                    <input
                      autoFocus
                      className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none w-full max-w-xs"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-900">{dt.name}</span>
                  )}
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {editingId === dt.id ? (
                      <>
                        <button onClick={saveEdit} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"><Save size={16}/></button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><X size={16}/></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(dt)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDemandType(dt.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {demandTypes.length === 0 && !isAdding && (
              <tr>
                <td colSpan={3} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Palette size={48} />
                    <p className="font-black uppercase text-xs tracking-widest">Nenhum tipo cadastrado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── View: Configurar Tipos de Canal ──────────────────────────────────────────
const ChannelTypesConfig: React.FC = () => {
  const { channelTypes, addChannelType, updateChannelType, deleteChannelType } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#94a3b8');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#f59e0b');
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (ct: ChannelType) => { setEditingId(ct.id); setEditName(ct.name); setEditColor(ct.color); };
  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateChannelType({ id: editingId, name: editName.trim(), color: editColor, createdAt: '' });
    setEditingId(null);
  };
  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addChannelType({ name: newName.trim(), color: newColor });
    setNewName(''); setNewColor('#f59e0b'); setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Tipos de Canal</h2>
          <p className="text-slate-400 text-xs mt-1">Canais utilizados nas ações CS (WhatsApp, Instagram, etc.).</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2 hover:bg-amber-600 transition-all">
          <Plus size={16} /> Novo Canal
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {isAdding && (
          <div className="p-6 border-b border-slate-100 bg-amber-50/50 flex items-center gap-4 animate-in slide-in-from-top-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do canal..." autoFocus className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-400 outline-none" />
            <div className="flex items-center gap-3">
              <label className="text-[9px] font-black text-slate-400 uppercase">Cor</label>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5" />
            </div>
            <button onClick={handleAdd} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-slate-800 transition-all flex items-center gap-2"><Check size={16}/> Salvar</button>
            <button onClick={() => { setIsAdding(false); setNewName(''); }} className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><X size={18}/></button>
          </div>
        )}
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50">
              <th className="px-8 py-4">Cor</th>
              <th className="px-8 py-4">Nome do Canal</th>
              <th className="px-8 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {channelTypes.map(ct => (
              <tr key={ct.id} className="group hover:bg-slate-50 transition-colors">
                <td className="px-8 py-4">
                  {editingId === ct.id
                    ? <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-9 h-9 rounded-xl cursor-pointer border border-slate-200 p-0.5" />
                    : <span className="w-7 h-7 rounded-full inline-block border-2 border-white shadow-sm" style={{ backgroundColor: ct.color }} />
                  }
                </td>
                <td className="px-8 py-4">
                  {editingId === ct.id
                    ? <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} className="bg-white border border-amber-300 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-400 outline-none w-full" />
                    : <span className="text-sm font-bold text-slate-900 uppercase">{ct.name}</span>
                  }
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {editingId === ct.id ? (
                      <>
                        <button onClick={saveEdit} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"><Save size={16}/></button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><X size={16}/></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(ct)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={16}/></button>
                        <button onClick={() => deleteChannelType(ct.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {channelTypes.length === 0 && !isAdding && (
              <tr>
                <td colSpan={3} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Palette size={48} />
                    <p className="font-black uppercase text-xs tracking-widest">Nenhum canal cadastrado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── View principal: Painel de Ações ───────────────────────────────────────────
const CSActionsView: React.FC = () => {
  const { csActions, classes, moveToTrash, addCSActionActivity, addCSAction, currentUser, users, demandTypes } = useData();
  const perms = usePermissions('acoesCs');
  const [activeTab, setActiveTab] = useState<'painel' | 'canais' | 'tipos'>('painel');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionToEdit, setActionToEdit] = useState<CSAction | null>(null);
  const [newActivityText, setNewActivityText] = useState('');

  const selectedAction = useMemo(() => csActions.find(a => a.id === selectedActionId), [csActions, selectedActionId]);

  const toggleSelectAll = () => {
    if (selectedIds.size === csActions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(csActions.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} ação(ões) do CS para a Lixeira?`, onConfirm: () => { moveToTrash('csAction', ids); setSelectedIds(new Set()); setSelectedActionId(null); setConfirmConfig(null); } });
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionId || !newActivityText.trim()) return;
    const activity: CSActionActivity = {
      id: crypto.randomUUID(),
      userName: currentUser?.name || 'Operador',
      description: newActivityText,
      timestamp: new Date().toLocaleString('pt-BR')
    };
    addCSActionActivity(selectedActionId, activity);
    setNewActivityText('');
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
        case 'FEITO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'PARADO': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'NEGADO': return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'INICIAR': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleBulkImport = (data: any[]) => {
    data.forEach(item => {
      addCSAction({
        ...item,
        id: crypto.randomUUID(),
        activities: [],
        createdAt: new Date().toISOString(),
        totalReached: parseInt(item.totalReached) || 0,
        totalResponses: parseInt(item.totalResponses) || 0,
        volumeSold: parseInt(item.volumeSold) || 0,
        revenueResult: parseFloat(item.revenueResult) || 0
      } as CSAction);
    });
  };

  const handleExportXLS = () => {
    const exportData = csActions.map(a => {
        const cls = classes.find(c => c.id === a.classId);
        const user = users.find(u => u.id === a.responsibleUserId);
        return {
            "Projeto Vinculado": cls?.name || 'N/A',
            "Tipo de Demanda": a.type,
            "Data Inicial": a.startDate,
            "Data Final": a.endDate,
            "Status": a.status,
            "Consultor Responsável": user?.name || 'N/A',
            "Total de Atingidos": a.totalReached,
            "Número de Resposta": a.totalResponses,
            "Resultado Volume": a.volumeSold,
            "Resultado $": a.revenueResult,
            "Canal": a.channel
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ações CS");
    XLSX.writeFile(workbook, `acoes_cs_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const importFields = [
    { key: 'classId', label: '1. Projeto Vinculado', required: true },
    { key: 'dummyInfo', label: '2. Ano e Semestre (Derivado do Projeto)' },
    { key: 'type', label: '3. Tipo de Demanda', required: true },
    { key: 'startDate', label: '4. Data Inicial', required: true },
    { key: 'endDate', label: '5. Data Final', required: true },
    { key: 'status', label: '6. Status da Ação', required: true },
    { key: 'responsibleUserId', label: '7. Consultor Responsável', required: true },
    { key: 'totalReached', label: '8. Total de Atingidos' },
    { key: 'totalResponses', label: '9. Número de Resposta' },
    { key: 'volumeSold', label: '10. Resultado Volume' },
    { key: 'revenueResult', label: '11. Resultado $ (R$)' },
    { key: 'channel', label: '12. Canal', required: true },
  ];

  // Resolve a cor do tipo de demanda para exibição
  const getDemandColor = (typeName: string) => {
    const dt = demandTypes.find(d => d.name === typeName);
    return dt?.color || '#94a3b8';
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      {/* Header com tabs */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Painel de Ações</h1>
          <p className="text-slate-500 font-medium">Monitoramento de engajamento e ROI das comunicações.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('painel')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'painel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={14} /> Ações
            </button>
            <button
              onClick={() => setActiveTab('canais')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'canais' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Palette size={14} /> Tipo de Canal
            </button>
            <button
              onClick={() => setActiveTab('tipos')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'tipos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings size={14} /> Tipo de Demanda
            </button>
          </div>
        </div>
      </div>

      {/* Tab: Tipo de Canal */}
      {activeTab === 'canais' && <ChannelTypesConfig />}

      {/* Tab: Configurar Tipos de Demanda */}
      {activeTab === 'tipos' && <DemandTypesConfig />}

      {/* Tab: Painel de Ações */}
      {activeTab === 'painel' && (
        <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
          <div className={`flex-1 flex flex-col gap-4 transition-all overflow-hidden ${selectedActionId ? 'w-1/2' : 'w-full'}`}>
            {/* Barra de ações */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {selectedIds.size > 0 && perms.canDelete && (
                <button onClick={handleBulkDelete} className="bg-rose-50 border-2 border-rose-200 text-rose-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-all animate-in zoom-in-95">
                    <Trash2 size={18} /> Excluir ({selectedIds.size})
                </button>
              )}
              <button onClick={handleExportXLS} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50">
                <Download size={18} /> Exportar XLS
              </button>
              {perms.canInsert && (
                <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800">
                  <FileSpreadsheet size={18} /> Importar Planilha
                </button>
              )}
              {perms.canInsert && (
                <button onClick={() => { setActionToEdit(null); setIsModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2">
                  <Plus size={18} /> Nova Operação
                </button>
              )}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                      <th className="px-8 py-5 w-10">
                        <button
                          onClick={toggleSelectAll}
                          className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.size === csActions.length && csActions.length > 0 ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}
                        >
                          {selectedIds.size === csActions.length && csActions.length > 0 && <Check size={14} strokeWidth={4} />}
                        </button>
                      </th>
                      <th className="px-8 py-5">Tipo de Demanda / Turma</th>
                      <th className="px-8 py-5">Consultor</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Financeiro (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {csActions.map(action => (
                      <tr
                        key={action.id}
                        className={`hover:bg-amber-50 cursor-pointer transition-colors group ${selectedIds.has(action.id) ? 'bg-amber-50/50' : ''} ${selectedActionId === action.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-500' : ''}`}
                        onClick={() => setSelectedActionId(prev => prev === action.id ? null : action.id)}
                      >
                        <td className="px-8 py-5" onClick={(e) => { e.stopPropagation(); toggleSelect(action.id); }}>
                          <button
                            className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.has(action.id) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}
                          >
                            {selectedIds.has(action.id) && <Check size={14} strokeWidth={4} />}
                          </button>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getDemandColor(action.type) }} />
                            <div>
                              <p className="font-black text-slate-900 text-sm leading-tight uppercase group-hover:text-amber-600 transition-colors">{action.type || '—'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                                  {classes.find(c => c.id === action.classId)?.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                           <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase">
                             {users.find(u => u.id === action.responsibleUserId)?.name || 'N/A'}
                           </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${getStatusStyle(action.status)}`}>
                            {action.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <p className="text-sm font-black text-emerald-600">R$ {action.revenueResult.toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">{action.volumeSold} unidades</p>
                        </td>
                      </tr>
                    ))}
                    {csActions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-10">
                            <Zap size={64} />
                            <p className="font-black uppercase text-xs tracking-widest">Nenhuma ação registrada</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedActionId && selectedAction && (
            <div className="w-[580px] flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200 overflow-y-auto">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                  <Zap size={28} className="text-amber-500" /> Detalhes da Ação
                </h2>
                <div className="flex items-center gap-2">
                  {perms.canEdit && <button onClick={() => { setActionToEdit(selectedAction); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={24} /></button>}
                  <button onClick={() => setSelectedActionId(null)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><X size={28} /></button>
                </div>
              </div>

              <div className="p-8 space-y-10">
                {/* ── Cards de métricas ─────────────────────────────────── */}
                {(() => {
                  const cost = selectedAction.cost ?? 0;
                  const reached = selectedAction.totalReached ?? 0;
                  const cac = cost > 0 && reached > 0 ? cost / reached : null;
                  const roi = cost > 0 ? selectedAction.revenueResult - cost : null;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-rose-600 p-5 rounded-[2rem] text-white">
                          <p className="text-[9px] font-black text-rose-200 uppercase tracking-widest mb-1">Custo Total</p>
                          <p className="text-xl font-black">R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-slate-900 p-5 rounded-[2rem] text-white">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Atingidos / Respostas</p>
                          <p className="text-xl font-black text-amber-400">{reached} <span className="text-slate-500 text-sm">/ {selectedAction.totalResponses}</span></p>
                        </div>
                        <div className="bg-emerald-600 p-5 rounded-[2rem] text-white">
                          <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">Faturamento</p>
                          <p className="text-xl font-black">R$ {selectedAction.revenueResult.toLocaleString()}</p>
                          {roi !== null && (
                            <p className="text-[9px] font-black mt-1 text-emerald-100">ROI líquido: R$ {roi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          )}
                        </div>
                        <div className={`p-5 rounded-[2rem] text-white ${cac !== null ? 'bg-purple-600' : 'bg-slate-700'}`}>
                          <p className="text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">CAC</p>
                          {cac !== null
                            ? <>
                                <p className="text-xl font-black">R$ {cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[8px] text-purple-200 mt-1 uppercase">Custo / Atingidos</p>
                              </>
                            : <p className="text-sm font-bold text-slate-400">Sem custo informado</p>
                          }
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Info do tipo de demanda */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getDemandColor(selectedAction.type) }} />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Demanda</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{selectedAction.type || '—'}</p>
                  </div>
                </div>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={14}/> Timeline de Atividades</h4>
                  <form onSubmit={handleAddActivity} className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                      <textarea
                          className="w-full p-4 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px] bg-white font-bold shadow-inner"
                          placeholder="O que aconteceu hoje?..."
                          value={newActivityText}
                          onChange={(e) => setNewActivityText(e.target.value)}
                      />
                      <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 flex items-center justify-center gap-2">
                          <Send size={14} /> Registrar Nota
                      </button>
                  </form>

                  <div className="space-y-4">
                      {selectedAction.activities.map(activity => (
                          <div key={activity.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black text-slate-700 uppercase">{activity.userName}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{activity.timestamp}</span>
                              </div>
                              <p className="text-xs font-bold text-slate-600 leading-relaxed">{activity.description}</p>
                          </div>
                      ))}
                  </div>
                </section>

                {perms.canDelete && (
                  <div className="pt-6 border-t border-slate-100">
                    <button
                      onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover a ação "${selectedAction.type}" para a Lixeira?`, onConfirm: () => { moveToTrash('csAction', [selectedAction.id]); setSelectedActionId(null); setConfirmConfig(null); } })}
                      className="w-full py-5 border-2 border-rose-100 text-rose-500 rounded-3xl font-black uppercase tracking-widest hover:bg-rose-50 flex items-center justify-center gap-3"
                    >
                      <Trash2 size={18}/> Excluir Ação
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && <CSActionModal actionToEdit={actionToEdit} onClose={() => setIsModalOpen(false)} />}
      {isImportModalOpen && (
        <BulkImportModal
          title="Ações CS"
          fields={importFields}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleBulkImport}
        />
      )}
      {confirmConfig && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel="Sim, Mover"
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};

export default CSActionsView;
