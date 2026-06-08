
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../store';
import {
  Search, Plus, ArrowRightLeft, Mail, Phone, X, Check,
  GraduationCap, Building2, Layers, Eye, User, ChevronDown,
  UserPlus, Users, AlertCircle, SearchCode, Calendar, Tag, Info,
  CheckCircle2, XCircle, TrendingUp, AlertTriangle, MessageSquare,
  Target, ListTodo, Clock, Trash2, CheckSquare, Square, Filter,
  MousePointer2, Move, CreditCard, BookOpen, MapPin, Hash, Edit3
} from 'lucide-react';
import { Client, Activity, Task, Campus, FunnelStage } from '../types';
import ClientProfileView from '../components/ClientProfileView';
import ConfirmModal from '../components/ConfirmModal';
import { usePermissions } from '../src/hooks/usePermissions';

// --- Componente de Select com Busca para o Modal ---
const SearchableSelect: React.FC<{ 
  options: { id: string; label: string }[]; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string; 
  label: string; 
  disabled?: boolean;
}> = ({ options, value, onChange, placeholder, label, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => o.id === value);

  return (
    <div className={`space-y-1 relative ${disabled ? 'opacity-50' : ''}`} ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div 
        className={`w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm flex items-center justify-between shadow-sm transition-all ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-amber-400 font-bold'}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400 italic'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-50 sticky top-0 bg-white">
            <input className="w-full p-2 text-xs border border-slate-100 rounded-lg focus:outline-none bg-slate-50 font-bold" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          {filtered.map(o => (
            <div key={o.id} className={`px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${value === o.id ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-50 text-slate-600'}`} onClick={() => { onChange(o.id); setQuery(''); setIsOpen(false); }}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Modal de Inserção de Negociação (Novo Lead ou Da Base) ---
const NewLeadModal: React.FC<{
  funnelId: string;
  onClose: () => void;
}> = ({ funnelId, onClose }) => {
  const { clients, institutions, courses, classes, currentUser, addClient, updateClient, funnels } = useData();
  const [tab, setTab] = useState<'manual' | 'base'>('manual');
  const currentFunnel = funnels.find(f => f.id === funnelId);
  
  // Tab Manual State - Formulário Completo de Clientes
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', email: '', phone: '', cpf: '', birthDate: '', gender: '',
    institutionId: '', campus: '', courseId: '', classId: '', shift: '', tags: [],
    funnelId: funnelId, stageId: currentFunnel?.stages[0]?.id || '',
    totalValue: 0, purchasesCount: 0, activities: [], createdAt: new Date().toISOString().split('T')[0], sellerId: currentUser?.id || ''
  });
  const [tagsInput, setTagsInput] = useState('');

  // Tab Base (Filtros) State
  const [filterInst, setFilterInst] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [targetStageId, setTargetStageId] = useState(currentFunnel?.stages[0]?.id || '');
  const [selectedBaseIds, setSelectedBaseIds] = useState<Set<string>>(new Set());

  // Lógica de Vínculos de Turma/Curso para o Form Manual
  const selectedClass = useMemo(() => classes.find(c => c.id === formData.classId), [formData.classId, classes]);
  
  const campusOptions = useMemo(() => {
    const inst = institutions.find(i => i.id === formData.institutionId);
    if (!inst) return [];
    return inst.campi?.map((c: Campus) => ({ id: c.name, label: `${c.name} (${c.city})` })) || [];
  }, [institutions, formData.institutionId]);

  const courseOptions = useMemo(() => {
    if (selectedClass) {
      return courses.filter(c => selectedClass.courseIds.includes(c.id)).map(c => ({ id: c.id, label: c.name }));
    }
    return courses.map(c => ({ id: c.id, label: c.name }));
  }, [selectedClass, courses]);

  const handleClassChange = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      setFormData(prev => ({
        ...prev,
        classId,
        institutionId: cls.institutionId,
        courseId: cls.courseIds.length === 1 ? cls.courseIds[0] : prev.courseId
      }));
    } else {
      setFormData(prev => ({ ...prev, classId: '' }));
    }
  };

  // Duplicidade Real-time
  const duplicate = useMemo(() => {
    if (tab !== 'manual') return { email: false, cpf: false, phone: false };
    return {
      email: !!formData.email && clients.some(c => c.email.toLowerCase() === formData.email?.toLowerCase()),
      cpf: !!formData.cpf && clients.some(c => c.cpf === formData.cpf),
      phone: !!formData.phone && clients.some(c => c.phone === formData.phone)
    };
  }, [formData, clients, tab]);

  // Filtro de leads da base
  const eligibleFromBase = useMemo(() => {
    return clients.filter(c => {
      const notInThisFunnel = c.funnelId !== funnelId;
      const matchInst = !filterInst || c.institutionId === filterInst;
      const matchClass = !filterClass || c.classId === filterClass;
      const matchCourse = !filterCourse || c.courseId === filterCourse;
      return notInThisFunnel && matchInst && matchClass && matchCourse;
    });
  }, [clients, funnelId, filterInst, filterClass, filterCourse]);

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicate.email || duplicate.cpf || duplicate.phone) {
      alert("Corrija os dados duplicados antes de prosseguir.");
      return;
    }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    addClient({ 
      ...formData, 
      id: crypto.randomUUID(),
      tags,
      activities: [{
        id: crypto.randomUUID(),
        type: 'note',
        description: `Negociação iniciada via cadastro individual completo na etapa: ${currentFunnel?.stages.find(s => s.id === formData.stageId)?.name}`,
        timestamp: new Date().toLocaleString('pt-BR')
      }]
    } as Client);
    onClose();
  };

  const handleBaseSave = () => {
    if (selectedBaseIds.size === 0 || !targetStageId) return;
    const stageName = currentFunnel?.stages.find(s => s.id === targetStageId)?.name || 'Etapa selecionada';
    selectedBaseIds.forEach(id => {
      const client = clients.find(c => c.id === id);
      if (client) {
        updateClient({
          ...client,
          funnelId: funnelId,
          stageId: targetStageId,
          activities: [{
            id: crypto.randomUUID(),
            type: 'note',
            description: `Lead importado para o funil "${currentFunnel?.name}" na etapa "${stageName}" por ${currentUser?.name}.`,
            timestamp: new Date().toLocaleString('pt-BR')
          }, ...client.activities]
        });
      }
    });
    onClose();
  };

  const toggleSelectAll = () => {
    if (selectedBaseIds.size === eligibleFromBase.length) setSelectedBaseIds(new Set());
    else setSelectedBaseIds(new Set(eligibleFromBase.map(c => c.id)));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Inserir Negociação</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gestão de Entrada de Leads</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>

        <div className="flex bg-slate-50 p-2 m-8 rounded-2xl border border-slate-200 self-start">
           <button onClick={() => setTab('manual')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'manual' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-200'}`}>Cadastro Individual (Completo)</button>
           <button onClick={() => setTab('base')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'base' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-200'}`}>Importar da Base de Clientes</button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {tab === 'manual' ? (
            <form onSubmit={handleManualSave} className="space-y-10">
               {/* Seção 1: Dados Pessoais */}
               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-100 pb-2">1. Informações do Formando</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Nome Completo *</label>
                      <input required className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-amber-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Nascimento</label>
                      <input type="date" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Sexo</label>
                      <select className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                        <option value="">Escolher...</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase ${duplicate.email ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>E-mail * {duplicate.email && '(Existente!)'}</label>
                      <input required className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${duplicate.email ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase ${duplicate.cpf ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>CPF {duplicate.cpf && '(Existente!)'}</label>
                      <input className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${duplicate.cpf ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white'}`} value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase ${duplicate.phone ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>Telefone * {duplicate.phone && '(Existente!)'}</label>
                      <input required className={`w-full border rounded-2xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${duplicate.phone ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white'}`} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
               </div>

               {/* Seção 2: Dados Acadêmicos */}
               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-100 pb-2">2. Vínculo Acadêmico</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Projeto (Filtro Mestre)</label>
                      <select className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-amber-500" value={formData.classId || ''} onChange={e => handleClassChange(e.target.value)}>
                        <option value="">Selecionar Turma...</option>
                        {classes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <SearchableSelect label="Instituição" options={institutions.map(i => ({id: i.id, label: i.name}))} value={formData.institutionId || ''} onChange={v => setFormData({...formData, institutionId: v, campus: ''})} placeholder="Selecionar..." disabled={!!formData.classId} />
                    <SearchableSelect label="Curso" options={courseOptions} value={formData.courseId || ''} onChange={v => setFormData({...formData, courseId: v})} placeholder="Buscar curso..." />
                    <SearchableSelect label="Campus" options={campusOptions} value={formData.campus || ''} onChange={v => setFormData({...formData, campus: v})} placeholder="Lista de campus..." disabled={!formData.institutionId} />
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Turno</label>
                      <select className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
                        <option value="">Escolher...</option><option value="Manhã">Manhã</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option><option value="Integral">Integral</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Etiquetas (separar por vírgula)</label>
                      <input className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm" placeholder="Ex: LeadVIP, Ativo" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
                    </div>
                  </div>
               </div>

               {/* Seção 3: Local no Funil */}
               <div className="space-y-6 pt-4">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-100 pb-2">3. Posicionamento no Funil</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-900 uppercase">Etapa de Entrada *</label>
                      <select required className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-4 text-sm font-black text-amber-900 shadow-xl" value={formData.stageId} onChange={e => setFormData({...formData, stageId: e.target.value})}>
                        {currentFunnel?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
               </div>

               <div className="pt-10">
                 <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                   <UserPlus size={20}/> Salvar Cliente e Criar Negociação
                 </button>
               </div>
            </form>
          ) : (
            <div className="space-y-6">
               <div className="grid grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Instituição</label>
                    <select className="w-full bg-white border-none rounded-xl text-[10px] font-bold py-2 shadow-sm" value={filterInst} onChange={e => setFilterInst(e.target.value)}>
                       <option value="">Todas</option>
                       {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Projeto</label>
                    <select className="w-full bg-white border-none rounded-xl text-[10px] font-bold py-2 shadow-sm" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                       <option value="">Todas</option>
                       {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Curso</label>
                    <select className="w-full bg-white border-none rounded-xl text-[10px] font-bold py-2 shadow-sm" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                       <option value="">Todos</option>
                       {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Destino no Funil</label>
                    <select className="w-full bg-amber-100 border-none rounded-xl text-[10px] font-black py-2 text-amber-900 shadow-sm" value={targetStageId} onChange={e => setTargetStageId(e.target.value)}>
                       {currentFunnel?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
               </div>

               <div className="flex items-center justify-between px-4">
                  <button onClick={toggleSelectAll} className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedBaseIds.size === eligibleFromBase.length && eligibleFromBase.length > 0 ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>{selectedBaseIds.size === eligibleFromBase.length && eligibleFromBase.length > 0 && <Check size={10} strokeWidth={4}/>}</div>
                    Selecionar Todos ({eligibleFromBase.length})
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {eligibleFromBase.map(c => (
                    <div key={c.id} onClick={() => setSelectedBaseIds(prev => { const n = new Set(prev); if(n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedBaseIds.has(c.id) ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                       <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedBaseIds.has(c.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-200'}`}>{selectedBaseIds.has(c.id) && <Check size={12} strokeWidth={4}/>}</div>
                       <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-slate-700 truncate">{c.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{classes.find(cl => cl.id === c.classId)?.name || 'Sem Turma'}</p>
                       </div>
                    </div>
                  ))}
                  {eligibleFromBase.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
                      Nenhum lead disponível para importação com os filtros atuais.
                    </div>
                  )}
               </div>
               <button 
                  onClick={handleBaseSave} 
                  disabled={selectedBaseIds.size === 0} 
                  className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest disabled:opacity-20 shadow-xl transition-all hover:bg-slate-800 mt-4"
               >
                  Inserir Selecionados ({selectedBaseIds.size})
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BulkMoveModal: React.FC<{ onClose: () => void; funnelId: string; }> = ({ onClose, funnelId }) => {
  const { clients, funnels, updateClientStage } = useData();
  const currentFunnel = funnels.find(f => f.id === funnelId);
  const [sourceStage, setSourceStage] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stageOptions = currentFunnel?.stages.map(s => ({ id: s.id, label: s.name })) || [];
  const eligibleLeads = useMemo(() => clients.filter(c => c.funnelId === funnelId && c.stageId === sourceStage), [clients, funnelId, sourceStage]);

  const handleApply = () => {
    if (selectedIds.size && targetStage) {
      selectedIds.forEach(id => updateClientStage(id, targetStage));
      onClose();
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === eligibleLeads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(eligibleLeads.map(c => c.id)));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Mover em Lote</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900"><X size={32} /></button>
        </div>
        <div className="p-8 space-y-6 flex-1 overflow-y-auto bg-white">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</label>
                <select className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm" value={sourceStage} onChange={e => { setSourceStage(e.target.value); setSelectedIds(new Set()); }}>
                  <option value="">Filtrar por Etapa...</option>
                  {stageOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino</label>
                <select className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm" value={targetStage} onChange={e => setTargetStage(e.target.value)}>
                  <option value="">Mover Para...</option>
                  {stageOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
           </div>
           {sourceStage && (
             <div className="space-y-4">
                <button onClick={toggleAll} className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-2">
                   <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedIds.size === eligibleLeads.length && eligibleLeads.length > 0 ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>{selectedIds.size === eligibleLeads.length && eligibleLeads.length > 0 && <Check size={10} strokeWidth={4}/>}</div>
                   Selecionar Todos nesta etapa ({eligibleLeads.length})
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  {eligibleLeads.map(c => (
                    <div key={c.id} onClick={() => setSelectedIds(p => { const n = new Set(p); if(n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedIds.has(c.id) ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-100 bg-white hover:border-amber-200'}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedIds.has(c.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-200'}`}>{selectedIds.has(c.id) && <Check size={12} strokeWidth={4}/>}</div>
                      <span className="text-xs font-bold uppercase truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
        <div className="p-8 bg-slate-900 flex justify-end">
           <button onClick={handleApply} disabled={selectedIds.size === 0 || !targetStage} className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs disabled:opacity-30 shadow-xl shadow-amber-500/20">Executar Movimentação ({selectedIds.size})</button>
        </div>
      </div>
    </div>
  );
};

const FunnelView: React.FC = () => {
  const { funnels, clients, updateClientStage, currentUser, updateClient, moveToTrash, updateNegotiationStatus, addSale } = useData();
  const [selectedFunnelId, setSelectedFunnelId] = useState(funnels[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [moveBulkOpen, setMoveBulkOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const currentFunnel = funnels.find(f => f.id === selectedFunnelId);
  const perms = usePermissions('funil');

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.funnelId === selectedFunnelId && (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  }, [clients, searchTerm, selectedFunnelId]);

  const handleWinQuick = (client: Client) => {
    const winStage = currentFunnel?.stages.find(s => s.type === 'WON');
    if (!winStage) return alert("Não há uma etapa de 'VENDA' configurada neste funil.");
    
    updateClientStage(client.id, winStage.id);
    updateNegotiationStatus(client.id, 'GANHO');
    
    const activity = { id: crypto.randomUUID(), type: 'note', description: 'Venda confirmada via botão rápido no Funil.', timestamp: new Date().toLocaleString() };
    updateClient({ ...client, stageId: winStage.id, activities: [activity, ...client.activities] });
  };

  const handleLoseQuick = (client: Client) => {
    const loseStage = currentFunnel?.stages.find(s => s.type === 'LOST');
    if (!loseStage) return alert("Não há uma etapa de 'PERDA' configurada neste funil.");
    
    updateClientStage(client.id, loseStage.id);
    updateNegotiationStatus(client.id, 'PERDIDO');
    
    const activity = { id: crypto.randomUUID(), type: 'note', description: 'Negociação marcada como perdida via botão rápido.', timestamp: new Date().toLocaleString() };
    updateClient({ ...client, stageId: loseStage.id, activities: [activity, ...client.activities] });
  };

  // Drag and Drop Logic
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('dealId', id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetStageId: string) => {
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) updateClientStage(dealId, targetStageId);
  };

  if (!currentFunnel) return null;

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Negociações</h1>
          <p className="text-slate-500 font-medium mt-1">Gestão tática do fluxo de conversão.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDealIds.size > 0 && perms.canDelete && (
             <button onClick={() => { const ids = Array.from(selectedDealIds); setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} negociação(ões) para a Lixeira?`, onConfirm: () => { moveToTrash('client', ids); setSelectedDealIds(new Set()); setConfirmConfig(null); } }); }} className="flex items-center gap-2 bg-rose-500 px-6 py-3 rounded-2xl text-white hover:bg-rose-600 transition-all font-black text-xs uppercase tracking-widest shadow-xl">
                <Trash2 size={18} /> Excluir ({selectedDealIds.size})
             </button>
          )}
          <button onClick={() => setMoveBulkOpen(true)} className="flex items-center gap-2 bg-slate-900 px-6 py-3 rounded-2xl text-white hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"><ArrowRightLeft size={18} /> Mover em Lote</button>
          {perms.canInsert && (
            <button onClick={() => setIsNewLeadModalOpen(true)} className="flex items-center gap-2 bg-amber-500 px-6 py-3 rounded-2xl text-white hover:bg-amber-600 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/30">
              <Plus size={18} /> Novo Lead
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Filtrar por nome ou etiqueta..." className="w-full pl-14 pr-6 py-3 rounded-2xl border-none focus:ring-2 focus:ring-amber-500 text-sm bg-white font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 px-6 border-l border-slate-100">
           <Layers className="text-slate-400" size={20} />
           <select className="text-xs font-black bg-transparent border-none focus:ring-0 text-slate-700 cursor-pointer uppercase font-bold" value={selectedFunnelId} onChange={(e) => setSelectedFunnelId(e.target.value)}>
             {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
           </select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex gap-6 min-w-max h-full pr-10">
          {currentFunnel.stages.sort((a, b) => a.order - b.order).map(stage => {
            const stageClients = filteredClients.filter(c => c.stageId === stage.id);
            const isSelectedAll = stageClients.length > 0 && stageClients.every(c => selectedDealIds.has(c.id));

            return (
              <div key={stage.id} className="min-w-[340px] w-[340px] flex flex-col gap-4" onDragOver={onDragOver} onDrop={(e) => onDrop(e, stage.id)}>
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: stage.color || '#cbd5e1' }} />
                    <h3 className="font-black text-slate-700 text-[10px] uppercase tracking-widest">{stage.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">{stageClients.length}</span>
                    <button 
                      onClick={(e) => {
                         const idsInStage = stageClients.map(c => c.id);
                         const next = new Set(selectedDealIds);
                         if (isSelectedAll) idsInStage.forEach(id => next.delete(id));
                         else idsInStage.forEach(id => next.add(id));
                         setSelectedDealIds(next);
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${isSelectedAll ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500'}`}
                    >
                      {isSelectedAll ? <CheckSquare size={14}/> : <Square size={14}/>}
                    </button>
                  </div>
                </div>
                <div className="kanban-column flex-1 bg-slate-200/20 rounded-[2.5rem] p-4 border border-slate-200/50 space-y-4 overflow-y-auto min-h-[500px]">
                  {stageClients.map(client => {
                    const isChecked = selectedDealIds.has(client.id);
                    return (
                      <div 
                        key={client.id} 
                        draggable={perms.canEdit}
                        onDragStart={(e) => onDragStart(e, client.id)}
                        onClick={() => setSelectedClientId(prev => prev === client.id ? null : client.id)}
                        className={`bg-white p-6 rounded-[2rem] border-2 transition-all cursor-grab active:cursor-grabbing relative group ${isChecked ? 'border-amber-500 shadow-xl scale-[0.98]' : 'border-white hover:border-amber-300 shadow-sm'}`}
                      >
                         <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                               <button 
                                onClick={(e) => { e.stopPropagation(); const n = new Set(selectedDealIds); if(n.has(client.id)) n.delete(client.id); else n.add(client.id); setSelectedDealIds(n); }}
                                className={`p-1.5 rounded-xl transition-all ${isChecked ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-200 group-hover:text-slate-400'}`}
                               >
                                 {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                               </button>
                               <div className="min-w-0">
                                  <h4 className="font-black text-sm uppercase truncate max-w-[180px] leading-tight">{client.name}</h4>
                                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">#{client.id.split('-').pop()}</p>
                               </div>
                            </div>
                            <div className="p-2 text-slate-100 group-hover:text-slate-300"><Move size={18}/></div>
                         </div>
                         
                         <div className="flex flex-wrap gap-1.5 mb-4 min-h-[22px]">
                            {client.tags.slice(0, 3).map(t => <span key={t} className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white uppercase">{t}</span>)}
                            {client.tags.length > 3 && <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 uppercase">+{client.tags.length - 3}</span>}
                         </div>

                         <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-1">
                               <div className={`w-2 h-2 rounded-full ${client.totalValue > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                               <span className="text-[10px] font-black text-slate-900 uppercase">R$ {client.totalValue.toLocaleString()}</span>
                            </div>
                            
                            {perms.canEdit && stage.type === 'NORMAL' && (
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                  <button onClick={(e) => { e.stopPropagation(); handleWinQuick(client); }} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100" title="Venda (Mover para Won)"><CreditCard size={14}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleLoseQuick(client); }} className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-100" title="Perda (Mover para Lost)"><Trash2 size={14}/></button>
                               </div>
                            )}
                            
                            <div className="p-2 bg-slate-50 text-slate-300 rounded-xl group-hover:hidden"><Eye size={14}/></div>
                         </div>
                      </div>
                    );
                  })}
                  {stageClients.length === 0 && (
                    <div className="py-12 text-center text-slate-200 border-4 border-dashed border-slate-100/50 rounded-[2.5rem]">
                      <p className="text-[9px] font-black uppercase tracking-widest">Solte aqui para mover</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {moveBulkOpen && <BulkMoveModal onClose={() => setMoveBulkOpen(false)} funnelId={selectedFunnelId} />}
      {isNewLeadModalOpen && <NewLeadModal funnelId={selectedFunnelId} onClose={() => setIsNewLeadModalOpen(false)} />}

      {selectedClientId && (
        <div className="fixed right-6 top-24 bottom-6 z-[100] w-[480px] bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 gap-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter truncate min-w-0">Perfil da Negociação</h2>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {perms.canDelete && (
                <button
                  onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: 'Deseja mover este lead para a Lixeira?', onConfirm: () => { moveToTrash('client', [selectedClientId]); setSelectedClientId(null); setConfirmConfig(null); } })}
                  className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 size={18}/>
                </button>
              )}
              <button onClick={() => setSelectedClientId(null)} className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl transition-all"><X size={22}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto"><ClientProfileView clientId={selectedClientId} /></div>
        </div>
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

export default FunnelView;
