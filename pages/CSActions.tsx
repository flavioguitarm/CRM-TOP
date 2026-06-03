
import React, { useState, useMemo } from 'react';
import { useData } from '../store';
import { 
  Plus, Zap, X, Edit3, Trash2, MessageSquare, 
  Send, User, TrendingUp, DollarSign, Target, 
  Calendar, ArrowRight, CheckCircle2, LayoutGrid, FileSpreadsheet, Download, Check
} from 'lucide-react';
import { CSAction, CSActionActivity } from '../types';
import BulkImportModal from '../components/BulkImportModal';
import * as XLSX from 'xlsx';

const CSActionModal: React.FC<{
  actionToEdit?: CSAction | null;
  onClose: () => void;
}> = ({ actionToEdit, onClose }) => {
  const { classes, addCSAction, updateCSAction, currentUser, users } = useData();
  
  const [formData, setFormData] = useState<Partial<CSAction>>(
    actionToEdit || {
      classId: '',
      type: 'Campanhas de Whatsapp',
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
        id: `cs-${Date.now()}`,
        createdAt: new Date().toISOString(),
        activities: [{
            id: `act-${Date.now()}`,
            userName: currentUser?.name || 'Sistema',
            description: 'Ação criada e iniciada no CRM.',
            timestamp: new Date().toLocaleString()
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Turma Vinculada *</label>
            <select 
                required
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.classId}
                onChange={e => setFormData({...formData, classId: e.target.value})}
            >
              <option value="">Buscar Turma...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Ano e Semestre da Turma</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-500 shadow-inner">
               {selectedClass ? `${selectedClass.graduationYear}.${selectedClass.graduationMonth <= 6 ? '1' : '2'}` : 'Selecione uma turma...'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Tipo de Ação</label>
            <select 
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm mb-2"
                value={isTypeOther ? 'Outro' : formData.type}
                onChange={e => {
                    if (e.target.value === 'Outro') { setIsTypeOther(true); } 
                    else { setIsTypeOther(false); setFormData({...formData, type: e.target.value}); }
                }}
            >
                <option value="Campanhas de Whatsapp">Campanhas de Whatsapp</option>
                <option value="Ação Comercial">Ação Comercial</option>
                <option value="Comunicação Simples">Comunicação Simples</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Cobrança">Cobrança</option>
                <option value="Outro">Outro (Livre)...</option>
            </select>
            {isTypeOther && (
              <input 
                placeholder="Digite o novo tipo de ação..."
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
                value={isStatusOther ? 'Outro' : formData.status}
                onChange={e => {
                    if (e.target.value === 'Outro') { setIsStatusOther(true); } 
                    else { setIsStatusOther(false); setFormData({...formData, status: e.target.value}); }
                }}
            >
                <option value="INICIAR">INICIAR</option>
                <option value="FEITO">FEITO</option>
                <option value="PARADO">PARADO</option>
                <option value="NEGADO">NEGADO</option>
                <option value="Outro">Outro (Livre)...</option>
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
              <option value="">Selecione o consultor...</option>
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

          <div className="space-y-1 pb-10">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">12. Canal</label>
            <input placeholder="Ex: WhatsApp, Instagram, Presencial..." className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value})} />
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all sticky bottom-0">
            Salvar Operação
          </button>
        </form>
      </div>
    </div>
  );
};

const CSActionsView: React.FC = () => {
  const { csActions, classes, moveToTrash, addCSActionActivity, addCSAction, currentUser, users } = useData();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    if (confirm(`Deseja mover ${selectedIds.size} ações do CS para a lixeira?`)) {
      moveToTrash('csAction', Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectedActionId(null);
    }
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionId || !newActivityText.trim()) return;
    const activity: CSActionActivity = {
      id: `act-${Date.now()}`,
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
        case 'INICIAR': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleBulkImport = (data: any[]) => {
    data.forEach(item => {
      addCSAction({
        ...item,
        id: `cs-${Date.now()}-${Math.random()}`,
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
            "Turma Vinculada": cls?.name || 'N/A',
            "Tipo de Ação": a.type,
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
    { key: 'classId', label: '1. Turma Vinculada', required: true },
    { key: 'dummyInfo', label: '2. Ano e Semestre (Derivado da Turma)' },
    { key: 'type', label: '3. Tipo de Ação', required: true },
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

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      <div className={`flex-1 flex flex-col gap-6 transition-all ${selectedActionId ? 'w-1/2' : 'w-full'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Painel de Ações CS</h1>
            <p className="text-slate-500 font-medium">Monitoramento de engajamento e ROI das comunicações.</p>
          </div>
          <div className="flex items-center gap-3">
             {selectedIds.size > 0 && (
                <button onClick={handleBulkDelete} className="bg-rose-50 border-2 border-rose-200 text-rose-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-all animate-in zoom-in-95">
                    <Trash2 size={18} /> Excluir ({selectedIds.size})
                </button>
             )}
             <button onClick={handleExportXLS} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50">
                <Download size={18} /> Exportar XLS
             </button>
             <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800">
                <FileSpreadsheet size={18} /> Importar Planilha
             </button>
            <button onClick={() => { setActionToEdit(null); setIsModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2">
              <Plus size={18} /> Nova Operação
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
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
                  <th className="px-8 py-5">Campanha / Turma</th>
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
                    onClick={() => setSelectedActionId(action.id)}
                  >
                    <td className="px-8 py-5" onClick={(e) => { e.stopPropagation(); toggleSelect(action.id); }}>
                      <button 
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.has(action.id) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}
                      >
                        {selectedIds.has(action.id) && <Check size={14} strokeWidth={4} />}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="font-black text-slate-900 text-sm leading-tight uppercase group-hover:text-amber-600 transition-colors">{action.type}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                            {classes.find(c => c.id === action.classId)?.name}
                        </p>
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
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedActionId && selectedAction && (
        <div className="w-[640px] bg-white border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-500 shadow-2xl overflow-y-auto">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <Zap size={28} className="text-amber-500" /> Detalhes da Ação
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { setActionToEdit(selectedAction); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={24} /></button>
              <button onClick={() => setSelectedActionId(null)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><X size={28} /></button>
            </div>
          </div>

          <div className="p-8 space-y-10">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Engajamento</p>
                    <p className="text-2xl font-black text-amber-400">{selectedAction.totalReached} / {selectedAction.totalResponses}</p>
                </div>
                <div className="bg-emerald-600 p-6 rounded-[2rem] text-white">
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Faturamento</p>
                    <p className="text-2xl font-black">R$ {selectedAction.revenueResult.toLocaleString()}</p>
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

             <div className="pt-6 border-t border-slate-100">
                 <button 
                    onClick={() => { if(confirm('Mover para lixeira?')) { moveToTrash('csAction', [selectedAction.id]); setSelectedActionId(null); } }}
                    className="w-full py-5 border-2 border-rose-100 text-rose-500 rounded-3xl font-black uppercase tracking-widest hover:bg-rose-50 flex items-center justify-center gap-3"
                 >
                    <Trash2 size={18}/> Excluir Ação
                 </button>
             </div>
          </div>
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
    </div>
  );
};

export default CSActionsView;
