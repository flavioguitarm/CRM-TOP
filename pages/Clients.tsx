
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../store';
import {
  Plus, Search, FileUp, MoreHorizontal, X, User, Mail, Phone, GraduationCap, Building2, AlertCircle, ChevronDown, Edit3, Filter, Tags, FileSpreadsheet, Calendar, Download, Check, Trash2, CheckSquare, Square
} from 'lucide-react';
import { Client, ClassRoom, Campus, Sale, ProductNegotiation } from '../types';
import ClientProfileView from '../components/ClientProfileView';
import BulkImportModal from '../components/BulkImportModal';
import ConfirmModal from '../components/ConfirmModal';
import HelpTooltip from '../components/HelpTooltip';
import { usePermissions } from '../src/hooks/usePermissions';
import * as XLSX from 'xlsx';

// --- Modal de Seleção de Turmas para Exportação ---
const ExportSelectionModal: React.FC<{
    classes: ClassRoom[];
    onClose: () => void;
    onConfirm: (selectedClassIds: string[]) => void;
}> = ({ classes, onClose, onConfirm }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClasses = useMemo(() => {
        return classes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [classes, searchTerm]);

    const toggleClass = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredClasses.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredClasses.map(c => c.id)));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Exportar Base de Clientes</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Selecione as turmas para o filtro do arquivo XLS</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button>
                </div>
                
                <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            placeholder="Buscar turma..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-bold text-sm bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={toggleAll}
                        className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center gap-2"
                    >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === filteredClasses.length && filteredClasses.length > 0 ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                            {selectedIds.size === filteredClasses.length && filteredClasses.length > 0 && <Check size={12} strokeWidth={4} />}
                        </div>
                        Selecionar Todas as visíveis ({filteredClasses.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 max-h-[400px] grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredClasses.map(c => (
                        <div 
                            key={c.id} 
                            onClick={() => toggleClass(c.id)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedIds.has(c.id) ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                        >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(c.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'}`}>
                                {selectedIds.has(c.id) && <Check size={14} strokeWidth={4} />}
                            </div>
                            <span className="text-xs font-black text-slate-700 uppercase truncate">{c.name}</span>
                        </div>
                    ))}
                    {filteredClasses.length === 0 && (
                        <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-xs italic">Nenhuma turma encontrada.</div>
                    )}
                </div>

                <div className="p-8 bg-slate-900 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedIds.size} turmas selecionadas</span>
                    <button 
                        disabled={selectedIds.size === 0}
                        onClick={() => onConfirm(Array.from(selectedIds))}
                        className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-600 disabled:opacity-20 shadow-xl shadow-amber-500/20 flex items-center gap-2"
                    >
                        <Download size={18} /> Gerar Excel da Seleção
                    </button>
                </div>
            </div>
        </div>
    );
};

const SearchableSelect: React.FC<{ options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; placeholder: string; label: string; disabled?: boolean; labelExtra?: React.ReactNode; }> = ({ options, value, onChange, placeholder, label, disabled, labelExtra }) => {
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">{label}{labelExtra}</label>
      <div className={`w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs flex items-center justify-between shadow-sm transition-all ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-amber-400 font-bold'}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
        <span className={selected ? 'text-slate-900' : 'text-slate-400 italic'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-50 sticky top-0 bg-white">
            <input className="w-full p-2 text-xs border border-slate-100 rounded-lg focus:outline-none bg-slate-50 font-bold" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div className="px-3 py-2 text-[10px] text-slate-400 font-black cursor-pointer hover:bg-slate-50 uppercase tracking-widest" onClick={() => { onChange(''); setQuery(''); setIsOpen(false); }}>Limpar Filtro</div>
          {filtered.map(o => (<div key={o.id} className={`px-4 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${value === o.id ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-50 text-slate-600'}`} onClick={() => { onChange(o.id); setQuery(''); setIsOpen(false); }}>{o.label}</div>))}
        </div>
      )}
    </div>
  );
};

const ClientModal: React.FC<{ client?: Client | null; onClose: () => void; onSave: (data: Partial<Client>) => void; }> = ({ client, onClose, onSave }) => {
  const { institutions, courses, classes, currentUser, clients } = useData();
  const [formData, setFormData] = useState<Partial<Client>>(client || {
    name: '', birthDate: '', gender: '', cpf: '', email: '', phone: '',
    institutionId: '', campus: '', courseId: '', classId: '', shift: '', tags: [],
    funnelId: '', stageId: '', totalValue: 0, purchasesCount: 0, activities: [], createdAt: new Date().toISOString().split('T')[0], sellerId: currentUser?.id || ''
  });
  const [tagsInput, setTagsInput] = useState(client?.tags?.join(', ') || '');

  const duplicateCheck = useMemo(() => {
    return {
      email: clients.some(c => c.id !== client?.id && formData.email && c.email.toLowerCase() === formData.email.toLowerCase()),
      phone: clients.some(c => c.id !== client?.id && formData.phone && c.phone === formData.phone),
      cpf: clients.some(c => c.id !== client?.id && formData.cpf && c.cpf === formData.cpf)
    };
  }, [formData, clients, client]);

  const selectedClass = useMemo(() => classes.find(c => c.id === formData.classId), [formData.classId, classes]);
  
  const campusOptions = useMemo(() => {
    const inst = institutions.find(i => i.id === formData.institutionId);
    if (!inst) return [];
    return inst.campi?.map((c: Campus) => ({ 
        id: c.name, 
        label: `${c.name} (${c.city})` 
    })) || [];
  }, [institutions, formData.institutionId]);

  // Filtra turmas pela instituição selecionada (se houver) — vinculação bidirecional
  const classOptions = useMemo(() => {
    const filtered = formData.institutionId
      ? classes.filter(c => c.institutionId === formData.institutionId)
      : classes;
    return filtered.map(c => ({ id: c.id, label: c.name }));
  }, [classes, formData.institutionId]);

  const instOptions = institutions.map(i => ({ id: i.id, label: i.name }));

  // Ao selecionar instituição, limpa turma se ela não pertencer à nova instituição
  const handleInstChange = (instId: string) => {
    const currentClass = classes.find(c => c.id === formData.classId);
    const classStillValid = currentClass && currentClass.institutionId === instId;
    setFormData(prev => ({
      ...prev,
      institutionId: instId,
      campus: '',
      classId: classStillValid ? prev.classId : '',
      courseId: classStillValid ? prev.courseId : '',
    }));
  };
  
  const courseOptions = useMemo(() => {
    if (selectedClass) {
      return courses
        .filter(c => selectedClass.courseIds.includes(c.id))
        .map(c => ({ id: c.id, label: c.name }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateCheck.email || duplicateCheck.phone || duplicateCheck.cpf) {
        alert("Não é possível salvar. Existem dados duplicados na base.");
        return;
    }
    const tags = tagsInput.split(',').map(t => t.trim().replace(/\s+/g, '')).filter(t => t);
    onSave({ ...formData, tags });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {client ? 'Editar Perfil' : 'Novo Cadastro na Base'}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={28} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10">
          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Dados Pessoais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">Nome Completo * <HelpTooltip text="Nome completo do formando conforme constará nos documentos e crachás da formatura." /></label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">Nascimento <HelpTooltip text="Data de nascimento. Usada para cálculo de idade e em relatórios de perfil de turma." /></label>
                <div className="relative group">
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all" 
                    value={formData.birthDate} 
                    onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                  />
                  <Calendar 
                    size={16} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-amber-500" 
                    onClick={(e) => (e.currentTarget.previousSibling as any)?.showPicker?.()}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">Sexo <HelpTooltip text="Usado em comunicações personalizadas e segmentação de campanhas." /></label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                  <option value="">Escolher...</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">CPF <HelpTooltip text="CPF único por cliente. O sistema bloqueia duplicatas automaticamente para evitar registros repetidos." /></label>
                <input className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold ${duplicateCheck.cpf ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200'}`} value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                {duplicateCheck.cpf && <p className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1"><AlertCircle size={10}/> CPF duplicado na base!</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Contato</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">E-mail <HelpTooltip text="E-mail principal para envio de comunicados, propostas e confirmações. Deve ser único na base." /></label>
                <input className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold ${duplicateCheck.email ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                {duplicateCheck.email && <p className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1"><AlertCircle size={10}/> E-mail já existe na base!</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">Telefone * <HelpTooltip text="WhatsApp principal. Usado para vincular atendimentos do CS automaticamente ao digitar o número." /></label>
                <input required className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold ${duplicateCheck.phone ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200'}`} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                {duplicateCheck.phone && <p className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1"><AlertCircle size={10}/> Telefone já existe na base!</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Dados Acadêmicos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SearchableSelect
                label="Projeto"
                labelExtra={<HelpTooltip text="Ao selecionar o projeto, a Instituição e o Curso são preenchidos automaticamente. A lista é filtrada pela Instituição selecionada acima." />}
                options={classOptions}
                value={formData.classId || ''}
                onChange={handleClassChange}
                placeholder="Buscar turma..."
              />
              <SearchableSelect label="Instituição" labelExtra={<HelpTooltip text="Filtra as turmas disponíveis. Ao trocar a instituição, a turma incompatível é desmarcada automaticamente." />} options={instOptions} value={formData.institutionId || ''} onChange={handleInstChange} placeholder="Selecionar..." />
              <SearchableSelect label="Campus (Unidade)" labelExtra={<HelpTooltip text="Lista de campi da instituição selecionada. Selecione a unidade onde a turma se reúne." />} options={campusOptions} value={formData.campus || ''} onChange={v => setFormData({...formData, campus: v})} placeholder="Lista de campus..." disabled={!formData.institutionId} />
              <SearchableSelect label="Curso" labelExtra={<HelpTooltip text="Curso de graduação do formando. Quando vinculado a uma turma, exibe apenas os cursos da turma." />} options={courseOptions} value={formData.courseId || ''} onChange={v => setFormData({...formData, courseId: v})} placeholder="Buscar curso..." />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">Turno <HelpTooltip text="Período do dia em que o formando assiste às aulas. Útil para organizar eventos e reuniões de apresentação." /></label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
                  <option value="">Escolher...</option><option value="Manhã">Manhã</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option><option value="Integral">Integral</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">Etiquetas <HelpTooltip text="Tags livres separadas por vírgula. Ex: LeadVIP, Ativo, Indicação. Usadas para filtros e segmentação de campanhas." /></label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Ex: LeadVIP, Ativo" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
              </div>
            </div>
          </section>

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">Salvar Registro</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ClientsView: React.FC = () => {
  const { clients, institutions, classes, currentUser, addClient, updateClient, addSale, updateSale, courses, sales, negotiations, products, addNegotiation, updateNegotiationStatus, moveToTrash } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => setSelectedIds(prev =>
    prev.size === filteredClients.length ? new Set() : new Set(filteredClients.map(c => c.id))
  );
  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} cliente(s) para a Lixeira?`, onConfirm: () => { if (selectedIds.has(selectedClientId || '')) setSelectedClientId(null); moveToTrash('client', ids); setSelectedIds(new Set()); setConfirmConfig(null); } });
  };

  const perms = usePermissions('clientes');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [clients]);

  const classOptions = useMemo(() => {
    return classes.map(c => ({ id: c.id, label: c.name }));
  }, [classes]);

  const filteredClients = useMemo(() => {
    const result = clients.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(searchLower) || 
        c.email.toLowerCase().includes(searchLower) || 
        c.cpf.includes(searchTerm) ||
        (c.phone && c.phone.includes(searchTerm));
      
      const matchesTag = selectedTag === '' || c.tags.includes(selectedTag);
      const matchesClass = selectedClassId === '' || c.classId === selectedClassId;
      
      return matchesSearch && matchesTag && matchesClass;
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchTerm, selectedTag, selectedClassId]);

  const handleEditFromProfile = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      setClientToEdit(client);
      setIsModalOpen(true);
    }
  };

  // Resolve nome ou ID para entidade — aceita UUID ou busca por nome (case-insensitive)
  const resolveId = (
    value: string | undefined,
    list: { id: string; name: string }[]
  ): string => {
    if (!value) return '';
    const trimmed = value.trim();
    // Se já é um UUID válido, retorna direto
    if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
    // Senão, busca por nome (partial match)
    const found = list.find(i => i.name.toLowerCase().includes(trimmed.toLowerCase()));
    return found?.id || '';
  };

  const handleBulkImport = (data: any[], strategy: 'ignore' | 'overwrite') => {
    const today = new Date().toISOString().split('T')[0];

    data.forEach(item => {
      // ── Vinculação inteligente: resolve nomes → IDs ──────────────────────────
      const resolvedClassId  = resolveId(item.classId,       classes       as any[]);
      const resolvedInstId   = resolveId(item.institutionId,  institutions  as any[]);
      const resolvedCourseId = resolveId(item.courseId,       courses       as any[]);

      // Se veio turma, usa a instituição e curso dela (prioridade sobre campos explícitos)
      const linkedClass = resolvedClassId ? classes.find(c => c.id === resolvedClassId) : null;
      const finalInstId   = linkedClass?.institutionId   || resolvedInstId  || '';
      const finalCourseId = linkedClass && linkedClass.courseIds.length === 1
        ? linkedClass.courseIds[0]
        : resolvedCourseId;

      const enrichedItem = {
        ...item,
        classId:       resolvedClassId,
        institutionId: finalInstId,
        courseId:      finalCourseId,
      };

      const existingClient = clients.find(c =>
        (item.cpf && c.cpf === item.cpf) ||
        (item.email && c.email.toLowerCase() === item.email.toLowerCase()) ||
        (item.phone && c.phone === item.phone)
      );

      if (existingClient) {
          if (strategy === 'overwrite') {
              const updatedClient = {
                  ...existingClient,
                  ...enrichedItem,
                  tags: item.tags ? item.tags.split(',').map((t: string) => t.trim()) : existingClient.tags,
                  id: existingClient.id,
                  activities: existingClient.activities,
              } as Client;
              updateClient(updatedClient);
          }
      } else {
          const newId = crypto.randomUUID();
          const newClient = {
            ...enrichedItem,
            id: newId,
            activities: [],
            createdAt: today,
            totalValue: 0,
            purchasesCount: 0,
            sellerId: currentUser?.id || '',
            tags: item.tags ? item.tags.split(',').map((t: string) => t.trim()) : [],
            funnelId: item.funnelId || 'f-vendas',
            stageId: item.stageId || 's1'
          } as Client;
          
          addClient(newClient);

          if (item.soldProductId && item.soldValue) {
             const negId = crypto.randomUUID();
             const isSale = !!item.soldDate;
             const isLost = !!item.lostDate;

             const neg: ProductNegotiation = {
                id: negId,
                clientId: newId,
                productId: item.soldProductId,
                value: parseFloat(item.soldValue),
                quantity: parseInt(item.quantity) || 1,
                status: isSale ? 'GANHO' : (isLost ? 'PERDIDO' : 'ABERTO'),
                createdAt: today,
                closedAt: isSale ? item.soldDate : (isLost ? item.lostDate : undefined),
                sellerId: currentUser?.id || ''
             };
             addNegotiation(neg);

             if (isSale) {
                const sale: Sale = {
                    id: crypto.randomUUID(),
                    clientId: newId,
                    productId: item.soldProductId,
                    value: parseFloat(item.soldValue),
                    quantity: parseInt(item.quantity) || 1,
                    date: item.soldDate,
                    classId: item.classId || '',
                    sellerId: currentUser?.id || '',
                    negotiationId: negId
                };
                addSale(sale);
             }
          }
      }
    });
  };

  const handleExportProcess = (classIds: string[]) => {
    const exportData = clients
        .filter(c => classIds.includes(c.classId))
        .map(c => {
            const cls = classes.find(cl => cl.id === c.classId);
            const inst = institutions.find(i => i.id === c.institutionId);
            const course = courses.find(co => co.id === c.courseId);
            
            const clientSales = sales.filter(s => s.clientId === c.id);
            const clientNegs = negotiations.filter(n => n.clientId === c.id);
            
            const lastSale = clientSales.length > 0 ? clientSales[clientSales.length - 1] : null;
            const lastNeg = clientNegs.length > 0 ? clientNegs[clientNegs.length - 1] : null;

            let closedDate = "";
            if (lastSale) closedDate = lastSale.date;
            else if (lastNeg && lastNeg.status === 'PERDIDO') closedDate = lastNeg.closedAt || "";

            // Nome do Produto Vendido Lookup
            const soldProductName = lastSale 
                ? (products.find(p => p.id === lastSale.productId)?.name || 'Produto Não Localizado') 
                : "";

            return {
                "Nome Completo": c.name,
                "E-mail": c.email,
                "Telefone": c.phone,
                "CPF": c.cpf,
                "Nascimento (AAAA-MM-DD)": c.birthDate,
                "Gênero": c.gender,
                "Etiquetas (sep. vírgula)": c.tags.join(','),
                "NOME_INST_REF": inst?.name || 'N/A',
                "NOME_CURSO_REF": course?.name || 'N/A',
                "NOME_TURMA_REF": cls?.name || 'N/A',
                "Turno": c.shift,
                "NOME_PROD_REF": soldProductName,
                "Valor da Venda (Ex: 4500.50)": lastSale ? lastSale.value : "",
                "Quantidade": lastSale ? lastSale.quantity : "",
                "Data de Fechamento (Venda/Perda)": closedDate,
                "Status Comercial": lastNeg ? lastNeg.status : "ABERTO",
                "TOTAL_COMPRADO": c.totalValue
            };
        });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Base_Clientes");
    XLSX.writeFile(workbook, `export_clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportModalOpen(false);
  };

  const importFields = [
    { key: 'name', label: 'Nome Completo', required: true },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'cpf', label: 'CPF' },
    { key: 'birthDate', label: 'Nascimento (AAAA-MM-DD)' },
    { key: 'gender', label: 'Gênero' },
    { key: 'tags', label: 'Etiquetas (sep. vírgula)' },
    { key: 'institutionId', label: 'Instituição (nome ou ID)' },
    { key: 'courseId', label: 'Curso (nome ou ID)' },
    { key: 'classId', label: 'Projeto (nome ou ID) — preenche inst. e curso automaticamente' },
    { key: 'shift', label: 'Turno' }, 
    { key: 'soldProductId', label: 'ID do Produto Vendido' },
    { key: 'soldValue', label: 'Valor da Venda (Ex: 4500.50)' },
    { key: 'quantity', label: 'Quantidade' },
    { key: 'soldDate', label: 'Data da Venda (AAAA-MM-DD)' },
    { key: 'lostDate', label: 'Data da Perda (AAAA-MM-DD)' },
  ];

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      <div className={`flex-1 flex flex-col gap-6 transition-all ${selectedClientId ? 'w-1/2' : 'w-full'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Clientes</h1><p className="text-slate-500 font-medium">Gestão centralizada da sua base mestre de leads.</p></div>
          <div className="flex items-center gap-3">
            {perms.canInsert && (
              <>
                <button onClick={() => setIsExportModalOpen(true)} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
                  <Download size={18} /> Exportar Base (XLS)
                </button>
                <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
                  <FileSpreadsheet size={18} /> Importar Planilha
                </button>
                <button onClick={() => { setClientToEdit(null); setIsModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/30 flex items-center gap-2"><Plus size={18} /> Novo Cadastro</button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Pesquisar por Nome, CPF, E-mail ou Telefone..." 
                className="w-full pl-14 pr-6 py-4 rounded-3xl border border-slate-200 text-sm font-bold bg-white focus:ring-2 focus:ring-amber-500 shadow-sm outline-none transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <SearchableSelect 
                 label="Filtrar por Turma" 
                 placeholder="Todas as Turmas" 
                 options={classOptions} 
                 value={selectedClassId} 
                 onChange={setSelectedClassId} 
               />
               <SearchableSelect 
                 label="Filtrar por Etiqueta" 
                 placeholder="Todas as Etiquetas" 
                 options={allTags.map(t => ({ id: t, label: t }))} 
                 value={selectedTag} 
                 onChange={setSelectedTag} 
               />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-white sticky top-0 z-10">
                  <th className="px-4 py-5 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-amber-600 transition-colors">
                      {selectedIds.size === filteredClients.length && filteredClients.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                    </button>
                  </th>
                  <th className="px-8 py-5">Nome / Contato</th>
                  <th className="px-8 py-5">Instituição / Turma</th>
                  <th className="px-8 py-5">Etiquetas</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClients.map(client => (
                  <tr key={client.id} className={`hover:bg-amber-50 cursor-pointer transition-colors group ${selectedClientId === client.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-500' : ''} ${selectedIds.has(client.id) ? 'bg-amber-50' : ''}`} onClick={() => setSelectedClientId(client.id)}>
                    <td className="px-4 py-5" onClick={e => e.stopPropagation()}>
                      <button onClick={e => toggleSelect(client.id, e)} className="text-slate-400 hover:text-amber-600 transition-colors">
                        {selectedIds.has(client.id) ? <CheckSquare size={16} className="text-amber-500"/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="px-8 py-5"><div><p className="font-black text-slate-900 text-sm leading-tight group-hover:text-amber-600 transition-colors uppercase tracking-tight">{client.name}</p><p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5 flex items-center gap-1"><Calendar size={10} /> Criado em: {new Date(client.createdAt).toLocaleDateString()}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">{client.phone} • {client.email}</p></div></td>
                    <td className="px-8 py-5"><div><p className="text-xs font-black text-slate-700">{institutions.find(i => i.id === client.institutionId)?.name || 'N/A'}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{classes.find(c => c.id === client.classId)?.name || 'Sem Turma'}</p></div></td>
                    <td className="px-8 py-5"><div className="flex flex-wrap gap-1.5">{client.tags.map(tag => (<span key={tag} className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white uppercase tracking-tighter shadow-sm">{tag}</span>))}</div></td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {perms.canEdit && <button onClick={(e) => { e.stopPropagation(); setClientToEdit(client); setIsModalOpen(true); }} className="p-2.5 hover:bg-white rounded-xl transition-all shadow-sm" title="Editar"><MoreHorizontal size={20} className="text-slate-400 hover:text-amber-500"/></button>}
                        {perms.canDelete && <button onClick={(e) => { e.stopPropagation(); setConfirmConfig({ title: 'Mover para Lixeira', message: `Mover "${client.name}" para a Lixeira?`, onConfirm: () => { if (selectedClientId === client.id) setSelectedClientId(null); moveToTrash('client', [client.id]); setConfirmConfig(null); } }); }} className="p-2.5 hover:bg-white rounded-xl transition-all shadow-sm" title="Mover para Lixeira"><Trash2 size={18} className="text-slate-400 hover:text-rose-500"/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedClientId && (
        <div className="w-[520px] bg-white border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-500 shadow-2xl relative">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <User size={28} className="text-amber-500" /> Perfil do Cliente
            </h2>
            <div className="flex items-center gap-2">
              {perms.canEdit && (
                <button
                  onClick={handleEditFromProfile}
                  className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                  title="Editar Perfil"
                >
                  <Edit3 size={24} />
                </button>
              )}
              <button onClick={() => setSelectedClientId(null)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><X size={28} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ClientProfileView clientId={selectedClientId} />
          </div>
        </div>
      )}

      {selectedIds.size > 0 && perms.canDelete && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-black">{selectedIds.size} selecionado(s)</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all">
            <Trash2 size={14}/> Mover para Lixeira
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-slate-700 rounded-xl transition-all"><X size={14}/></button>
        </div>
      )}

      {isModalOpen && <ClientModal client={clientToEdit} onClose={() => setIsModalOpen(false)} onSave={(data) => { if (clientToEdit) updateClient({...clientToEdit, ...data} as Client); else addClient({...data, id: crypto.randomUUID(), activities: []} as Client); setIsModalOpen(false); }} />}
      
      {isImportModalOpen && (
        <BulkImportModal 
          title="Clientes"
          fields={importFields} 
          onClose={() => setIsImportModalOpen(false)} 
          onImport={handleBulkImport} 
        />
      )}

      {isExportModalOpen && (
          <ExportSelectionModal
            classes={classes}
            onClose={() => setIsExportModalOpen(false)}
            onConfirm={handleExportProcess}
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

export default ClientsView;
