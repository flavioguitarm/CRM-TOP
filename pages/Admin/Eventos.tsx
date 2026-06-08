
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../store';
import { Event, EventActivity, ActivityType } from '../../types';
import {
  Calendar, Clock, Tag, MapPin, CheckCircle2, AlertCircle, X, Check,
  GraduationCap, Filter, Building2, Search, CheckSquare, Edit3, Trash2,
  Plus, Info, ChevronDown, FileSpreadsheet, Download, MessageSquare, Send,
  PlusCircle, Layers, Square
} from 'lucide-react';
import BulkImportModal from '../../components/BulkImportModal';
import ConfirmModal from '../../components/ConfirmModal';
import * as XLSX from 'xlsx';

// Converte serial Excel (número de dias desde 01/01/1900) ou string para ISO datetime
const excelDateToISO = (value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'number' && value > 0) {
    const corrected = value > 59 ? value - 1 : value; // corrige bug bissexto do Excel
    const ms = (corrected - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
};

const SearchableSelect: React.FC<{
  options: { id: string; label: string }[]; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string; 
  label: string; 
}> = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); 
    };
    document.addEventListener('mousedown', handleClick); 
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => o.id === value);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div 
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm flex items-center justify-between cursor-pointer hover:border-amber-400 font-bold transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400 italic'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] max-h-60 overflow-y-auto p-2 animate-in fade-in zoom-in-95 duration-150">
          <input 
            className="w-full p-3 text-xs border-b border-slate-100 focus:outline-none mb-2 font-bold bg-slate-50 rounded-xl" 
            placeholder="Pesquisar na lista..." 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            autoFocus 
          />
          <div className="px-3 py-2 text-xs text-slate-400 font-black cursor-pointer hover:text-amber-600" onClick={() => { onChange(''); setQuery(''); setIsOpen(false); }}>
            NENHUM VÍNCULO (EVENTO GERAL)
          </div>
          {filtered.map(o => (
            <div 
              key={o.id} 
              className={`px-4 py-3 text-xs font-bold rounded-xl cursor-pointer mb-1 transition-colors ${value === o.id ? 'bg-amber-500 text-white' : 'hover:bg-amber-50 text-slate-600'}`} 
              onClick={() => { onChange(o.id); setQuery(''); setIsOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActivityTypeModal: React.FC<{
  type?: ActivityType | null;
  onClose: () => void;
  onSave: (data: Partial<ActivityType>) => void;
}> = ({ type, onClose, onSave }) => {
  const [name, setName] = useState(type?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-2xl text-slate-600">
               <PlusCircle size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
              {type ? 'Editar Tipo' : 'Novo Tipo de Atividade'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome da Atividade *</label>
            <input 
              required 
              autoFocus
              placeholder="Ex: AÇÃO COMERCIAL, REUNIÃO, etc."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-amber-500 outline-none transition-all" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <Check size={16} /> Salvar Tipo de Atividade
          </button>
        </form>
      </div>
    </div>
  );
};

const EventModal: React.FC<{ 
  event?: Event | null; 
  onClose: () => void; 
  onSave: (data: Partial<Event>) => void; 
}> = ({ event, onClose, onSave }) => {
  const { classes, activityTypes } = useData();
  const [formData, setFormData] = useState<Partial<Event>>(event || { 
    name: '', type: '', startDateTime: '', endDateTime: '', status: 'Previsão', classId: '', activities: []
  });

  const classOptions = classes.map(c => ({ id: c.id, label: c.name }));

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!formData.name || !formData.startDateTime) return; 
    onSave(formData); 
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Configurar Evento</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Evento *</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <SearchableSelect 
            label="Projeto Vinculado (Cronograma)"
            placeholder="Selecionar Projeto da Base..." 
            options={classOptions} 
            value={formData.classId || ''} 
            onChange={v => setFormData({...formData, classId: v})} 
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Atividade</label>
              <select 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="">Selecionar Tipo...</option>
                {activityTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              {activityTypes.length === 0 && <p className="text-[8px] text-rose-500 font-bold uppercase mt-1">Nenhum tipo cadastrado no sistema!</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                <option value="Previsão">Previsão</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Realizado">Realizado</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Horário de Início</label>
            <input type="datetime-local" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" value={formData.startDateTime} onChange={e => setFormData({...formData, startDateTime: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Salvar no Cronograma</button>
        </form>
      </div>
    </div>
  );
};

const EventosAdmin: React.FC = () => {
  const { events, deleteEvent, classes, updateEvent, addEvent, institutions, addEventActivity, currentUser, activityTypes, setActivityTypes, addActivityType, updateActivityType, moveToTrash } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'events' | 'types'>('events');
  const [selectedEvtId, setSelectedEvtId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [newActivityText, setNewActivityText] = useState('');
  const [selectedEvtIds, setSelectedEvtIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<string>>(new Set());

  const toggleSelectEvt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvtIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectType = (id: string) => {
    setSelectedTypeIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAllEvts = () => setSelectedEvtIds(prev =>
    prev.size === events.length ? new Set() : new Set(events.map(e => e.id))
  );
  const toggleSelectAllTypes = () => setSelectedTypeIds(prev =>
    prev.size === activityTypes.length ? new Set() : new Set(activityTypes.map(t => t.id))
  );
  const handleBulkDeleteEvts = () => {
    if (!selectedEvtIds.size) return;
    const ids = [...selectedEvtIds];
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} evento(s) para a Lixeira?`, onConfirm: () => { moveToTrash('event', ids); setSelectedEvtIds(new Set()); setSelectedEvtId(null); setConfirmConfig(null); } });
  };
  const handleBulkDeleteTypes = () => {
    if (!selectedTypeIds.size) return;
    const ids = [...selectedTypeIds];
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} tipo(s) de atividade para a Lixeira?`, onConfirm: () => { moveToTrash('activityType', ids); setSelectedTypeIds(new Set()); setConfirmConfig(null); } });
  };

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && events.some(e => e.id === idFromUrl)) {
      setSelectedEvtId(idFromUrl);
    }
  }, [searchParams, events]);

  const selectedEvt = useMemo(() => events.find(e => e.id === selectedEvtId), [events, selectedEvtId]);
  
  const linkedClass = useMemo(() => {
    if (!selectedEvt?.classId) return null;
    return classes.find(c => c.id === selectedEvt.classId);
  }, [selectedEvt, classes]);

  const handleExportXLS = () => {
    const exportData = events.map(e => {
        const cls = classes.find(c => c.id === e.classId);
        return {
            "ID": e.id,
            "Evento": e.name,
            "Tipo": e.type,
            "Data": new Date(e.startDateTime).toLocaleString('pt-BR'),
            "Status": e.status,
            "Projeto Vinculado": cls?.name || 'Geral'
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cronograma");
    XLSX.writeFile(workbook, `eventos_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkImport = async (data: any[]) => {
    for (const item of data) {
      const safeStart = excelDateToISO(item.startDateTime);
      if (!safeStart) continue; // startDateTime é obrigatório
      const safeEnd = excelDateToISO(item.endDateTime) ?? safeStart;
      await addEvent({
        ...item,
        id:            crypto.randomUUID(),
        startDateTime: safeStart,
        endDateTime:   safeEnd,
        status:        item.status || 'Previsão',
        activities:    []
      } as Event);
    }
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvtId || !newActivityText.trim()) return;

    const activity: EventActivity = {
      id: crypto.randomUUID(),
      userName: currentUser?.name || 'Operador',
      description: newActivityText,
      timestamp: new Date().toLocaleString('pt-BR')
    };

    addEventActivity(selectedEvtId, activity);
    setNewActivityText('');
  };

  const handleSaveType = (data: Partial<ActivityType>) => {
    if (itemToEdit) {
      updateActivityType({ ...itemToEdit, ...data } as ActivityType);
    } else {
      addActivityType(data as Omit<ActivityType, 'id' | 'createdAt'>);
    }
    setTypeModalOpen(false);
  };

  const handleCloseProfile = () => {
    setSelectedEvtId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('id');
    setSearchParams(newParams);
  };

  // Fix: Defined importFields to fix the 'Cannot find name importFields' error at line 510
  const importFields = [
    { key: 'name', label: 'Nome do Evento', required: true },
    { key: 'type', label: 'Tipo de Atividade', required: true },
    { key: 'startDateTime', label: 'Data e Hora (AAAA-MM-DD HH:MM)', required: true },
    { key: 'status', label: 'Status' },
    { key: 'classId', label: 'ID da Turma' },
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Cronograma Mestre</h1>
          <p className="text-slate-500 font-medium">Controle total dos eventos físicos, comerciais e financeiros.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportXLS} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-2">
            <Download size={18} /> Exportar XLS
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
            <FileSpreadsheet size={18} /> Importar Planilha
          </button>
          <button 
            onClick={() => { setItemToEdit(null); activeTab === 'events' ? setModalOpen(true) : setTypeModalOpen(true); }} 
            className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2"
          >
            <Plus size={18} /> {activeTab === 'events' ? 'Novo Evento' : 'Novo Tipo'}
          </button>
        </div>
      </div>

      <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm self-start mb-2">
        <button 
          onClick={() => setActiveTab('events')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'events' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Calendar size={16}/> Cronograma Mestre
        </button>
        <button 
          onClick={() => setActiveTab('types')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'types' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Layers size={16}/> Configurar Tipos
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-hidden">
          {activeTab === 'events' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto pb-10">
               {events.map(evt => {
                 const cls = classes.find(c => c.id === evt.classId);
                 return (
                   <div
                     key={evt.id}
                     onClick={() => setSelectedEvtId(prev => prev === evt.id ? null : evt.id)}
                     className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all bg-white relative group ${selectedEvtId === evt.id ? 'border-amber-500 shadow-2xl scale-[1.02]' : selectedEvtIds.has(evt.id) ? 'border-rose-400 shadow-lg' : 'border-white hover:border-slate-200 shadow-sm'}`}
                   >
                     <button onClick={(e) => toggleSelectEvt(evt.id, e)} className={`absolute top-3 left-3 p-1 rounded-lg transition-all z-10 ${selectedEvtIds.has(evt.id) ? 'text-rose-500' : 'text-slate-200 opacity-0 group-hover:opacity-100'}`}>
                       {selectedEvtIds.has(evt.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                     </button>
                     <div className="flex items-center gap-2 mb-3">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${evt.status === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                         {evt.status}
                       </span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{evt.type}</span>
                     </div>
                     <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight">{evt.name}</h3>
                     <div className="mt-3 flex items-center gap-3">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                         <Calendar size={12} />
                         {new Date(evt.startDateTime).toLocaleDateString()}
                       </div>
                       {cls && (
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                           <GraduationCap size={12} />
                           {cls.name}
                         </div>
                       )}
                     </div>
                     <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
                       <button onClick={(e) => { e.stopPropagation(); setItemToEdit(evt); setModalOpen(true); }} className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-amber-600"><Edit3 size={16} /></button>
                       <button onClick={(e) => { e.stopPropagation(); setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover o evento "${evt.name}" para a Lixeira?`, onConfirm: () => { moveToTrash('event', [evt.id]); setConfirmConfig(null); } }); }} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:bg-rose-600"><Trash2 size={16} /></button>
                     </div>
                   </div>
                 );
               })}
             </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                    <th className="px-4 py-5 w-12">
                      <button onClick={toggleSelectAllTypes} className="p-1 rounded hover:bg-slate-200 transition-colors">
                        {selectedTypeIds.size === activityTypes.length && activityTypes.length > 0 ? <CheckSquare size={16} className="text-rose-500"/> : <Square size={16}/>}
                      </button>
                    </th>
                    <th className="px-8 py-5">Nome do Tipo de Atividade</th>
                    <th className="px-8 py-5">Identificador Interno</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activityTypes.map(type => (
                    <tr key={type.id} className={`hover:bg-slate-50 group transition-colors ${selectedTypeIds.has(type.id) ? 'bg-rose-50' : ''}`}>
                      <td className="px-4 py-5">
                        <button onClick={() => toggleSelectType(type.id)} className="p-1 rounded hover:bg-slate-200 transition-colors">
                          {selectedTypeIds.has(type.id) ? <CheckSquare size={16} className="text-rose-500"/> : <Square size={16} className="text-slate-300"/>}
                        </button>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Tag size={16}/></div>
                           <span className="font-black text-slate-900 uppercase tracking-tight">{type.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[10px] font-mono font-bold text-slate-300">#{type.id.split('-').pop()}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setItemToEdit(type); setTypeModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 transition-all"><Edit3 size={18}/></button>
                            <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover o tipo "${type.name}" para a Lixeira?`, onConfirm: () => { moveToTrash('activityType', [type.id]); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18}/></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {activityTypes.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-slate-300 italic uppercase text-xs font-black tracking-widest">Nenhum tipo de atividade configurado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedEvtId && selectedEvt && activeTab === 'events' && (
          <div className="w-[520px] flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 gap-3">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2 min-w-0 truncate">
                <Calendar size={20} className="text-amber-500 flex-shrink-0" /> {selectedEvt.name}
              </h2>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => { setItemToEdit(selectedEvt); setModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar"><Edit3 size={18} /></button>
                <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover o evento "${selectedEvt.name}" para a Lixeira?`, onConfirm: () => { moveToTrash('event', [selectedEvt.id]); handleCloseProfile(); setConfirmConfig(null); } })} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Excluir"><Trash2 size={18} /></button>
                <button onClick={handleCloseProfile} className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl transition-all"><X size={22} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info size={14}/> Detalhamento</h4>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status do Evento</p>
                     <span className={`text-sm font-black uppercase ${selectedEvt.status === 'Confirmado' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedEvt.status}</span>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de Atividade</p>
                     <span className="text-sm font-black text-slate-900 uppercase">{selectedEvt.type}</span>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Projeto Vinculado</p>
                     {linkedClass ? (
                       <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-slate-900 uppercase">{linkedClass.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Building2 size={10} />
                            {institutions.find(i => i.id === linkedClass.institutionId)?.name}
                          </span>
                       </div>
                     ) : (
                       <span className="text-sm font-black text-slate-400 uppercase">Evento de âmbito geral</span>
                     )}
                   </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Agendamento</h4>
                <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Data e Hora</p>
                      <p className="text-lg font-black text-amber-900">
                        {new Date(selectedEvt.startDateTime).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs font-bold text-amber-700 mt-0.5">
                        Às {new Date(selectedEvt.startDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                   </div>
                   <Calendar className="text-amber-200" size={40} />
                </div>
              </section>

              <section className="space-y-6 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14}/> Atividades e Notas</h4>
                  
                  <form onSubmit={handleAddActivity} className="space-y-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                      <textarea 
                          className="w-full p-4 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[100px] bg-white font-medium shadow-inner"
                          placeholder="Registrar nota sobre este evento..."
                          value={newActivityText}
                          onChange={(e) => setNewActivityText(e.target.value)}
                      />
                      <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                          <Send size={14} /> Salvar Atualização
                      </button>
                  </form>

                  <div className="space-y-4 relative pl-4">
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
                      {(selectedEvt.activities || []).map(activity => (
                          <div key={activity.id} className="relative pl-8 pb-4">
                              <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white shadow-sm" />
                              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{activity.userName.charAt(0)}</div>
                                          <span className="text-[8px] font-black text-slate-700 uppercase">{activity.userName}</span>
                                      </div>
                                      <span className="text-[8px] font-bold text-slate-400">{activity.timestamp}</span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{activity.description}</p>
                              </div>
                          </div>
                      ))}
                  </div>
               </section>

            </div>
          </div>
        )}
      </div>

      {modalOpen && <EventModal event={itemToEdit} onClose={() => setModalOpen(false)} onSave={(d) => { if(itemToEdit) updateEvent({...itemToEdit, ...d} as Event); else addEvent({...d, id: crypto.randomUUID()} as Event); setModalOpen(false); }} />}
      {(selectedEvtIds.size > 0 || selectedTypeIds.size > 0) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom duration-200">
          {activeTab === 'events' && selectedEvtIds.size > 0 && (
            <>
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">{selectedEvtIds.size} evento{selectedEvtIds.size > 1 ? 's' : ''}</span>
              <div className="w-px h-5 bg-slate-700" />
              <button onClick={handleBulkDeleteEvts} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                <Trash2 size={14} /> Mover para Lixeira
              </button>
              <button onClick={() => setSelectedEvtIds(new Set())} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"><X size={16} /></button>
            </>
          )}
          {activeTab === 'types' && selectedTypeIds.size > 0 && (
            <>
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">{selectedTypeIds.size} tipo{selectedTypeIds.size > 1 ? 's' : ''}</span>
              <div className="w-px h-5 bg-slate-700" />
              <button onClick={handleBulkDeleteTypes} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                <Trash2 size={14} /> Mover para Lixeira
              </button>
              <button onClick={() => setSelectedTypeIds(new Set())} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"><X size={16} /></button>
            </>
          )}
        </div>
      )}

      {typeModalOpen && <ActivityTypeModal type={itemToEdit} onClose={() => setTypeModalOpen(false)} onSave={handleSaveType} />}
      
      {isImportModalOpen && (
        <BulkImportModal
            title="Eventos"
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

export default EventosAdmin;
