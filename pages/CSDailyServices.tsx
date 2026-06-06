
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../store';
import {
  Plus, Headset, X, Edit3, Trash2, MessageSquare,
  Send, User, Search, Calendar, CheckCircle2,
  Filter, Building2, ChevronDown, Phone, Mail,
  Clock, Download, FileSpreadsheet, Check, UserPlus,
  AlertCircle, CheckSquare, Square
} from 'lucide-react';
import { CSDailyService, UserRole, Client } from '../types';
import BulkImportModal from '../components/BulkImportModal';
import ConfirmModal from '../components/ConfirmModal';
import * as XLSX from 'xlsx';

const ServiceModal: React.FC<{
  serviceToEdit?: CSDailyService | null;
  onClose: () => void;
}> = ({ serviceToEdit, onClose }) => {
  const { clients, classes, addCSDailyService, updateCSDailyService, currentUser, users } = useData();
  
  const [formData, setFormData] = useState<Partial<CSDailyService>>(
    serviceToEdit || {
      clientId: '',
      clientPhone: '',
      clientNameManual: '',
      date: new Date().toISOString().split('T')[0],
      type: 'WhatsApp',
      summary: '',
      status: 'Concluído',
      responsibleUserId: currentUser?.id || '',
    }
  );

  const matchedClient = useMemo(() => {
      if (!formData.clientPhone) return null;
      return clients.find(c => c.phone.replace(/\D/g, '') === formData.clientPhone?.replace(/\D/g, ''));
  }, [formData.clientPhone, clients]);

  // Atualiza clientId e nome manual automaticamente quando encontra um match
  useEffect(() => {
      if (matchedClient) {
          setFormData(prev => ({ ...prev, clientId: matchedClient.id, clientNameManual: matchedClient.name }));
      } else if (!serviceToEdit) {
          setFormData(prev => ({ ...prev, clientId: '', clientNameManual: '' }));
      }
  }, [matchedClient, serviceToEdit]);

  const clientClass = useMemo(() => matchedClient ? classes.find(cl => cl.id === matchedClient.classId) : null, [matchedClient, classes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientPhone || !formData.summary) return;

    if (serviceToEdit) {
      updateCSDailyService(formData as CSDailyService);
    } else {
      const newId = `serv-${Date.now()}`;
      addCSDailyService({
        ...formData,
        id: newId,
        createdAt: new Date().toISOString(),
      } as CSDailyService);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg">
              <Headset size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                {serviceToEdit ? 'Editar Registro' : 'Novo Registro por Telefone'}
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Busca automática por vínculo telefônico</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
          
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={12}/> 1. Telefone do Contato *
                </label>
                <input 
                    required
                    placeholder="(00) 00000-0000"
                    className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-4 text-sm font-black text-amber-900 shadow-inner focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
                    value={formData.clientPhone}
                    onChange={e => setFormData({...formData, clientPhone: e.target.value})}
                />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Nome do Formando</label>
                <div className="relative">
                    <input 
                        placeholder={matchedClient ? "" : "Nenhum cliente vinculado a este telefone..."}
                        className={`w-full border rounded-2xl px-6 py-4 text-sm font-bold shadow-sm outline-none transition-all ${matchedClient ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-400'}`}
                        value={formData.clientNameManual}
                        onChange={e => setFormData({...formData, clientNameManual: e.target.value})}
                        readOnly={!!matchedClient}
                    />
                    {matchedClient && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20}/>}
                </div>
                {!matchedClient && formData.clientPhone && (
                    <p className="text-[8px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 px-2">
                        <AlertCircle size={10}/> Telefone não localizado na base. O nome será preenchido após cadastro do cliente.
                    </p>
                )}
            </div>
          </div>

          {matchedClient && (
            <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Turma Identificada</p>
                    <p className="text-xs font-black text-amber-400 uppercase">{clientClass?.name || 'Geral'}</p>
                </div>
                <div className="text-right flex flex-col items-end justify-center">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full border border-emerald-500/20 uppercase">
                        Vínculo Ativo
                    </span>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Data do Contato</label>
                <input type="date" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Meio Utilizado</label>
                <select className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Ligação">Ligação</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Instagram">Instagram</option>
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5. Resumo da Conversa *</label>
            <textarea 
                required
                placeholder="Relate o que foi tratado..."
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[120px]"
                value={formData.summary}
                onChange={e => setFormData({...formData, summary: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6. Status</label>
                <select className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Concluído">Concluído</option>
                    <option value="Aguardando Retorno">Aguardando Retorno</option>
                    <option value="Pendente">Pendente</option>
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">7. Responsável</label>
                <select className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.responsibleUserId} onChange={e => setFormData({...formData, responsibleUserId: e.target.value})}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
            <Send size={20}/> Gravar Atendimento Diário
          </button>
        </form>
      </div>
    </div>
  );
};

const CSDailyServicesView: React.FC = () => {
  const { csDailyServices, clients, classes, users, moveToTrash, addCSDailyService, currentUser } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<CSDailyService | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const handleBulkImport = (data: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    data.forEach(item => {
      if (!item.clientPhone) return; // telefone é obrigatório
      const service: CSDailyService = {
        id:                crypto.randomUUID(),
        date:              item.date || today,
        type:              item.type || 'WhatsApp',
        clientPhone:       item.clientPhone,
        clientNameManual:  item.clientNameManual || '',
        clientId:          clients.find(c => c.phone === item.clientPhone)?.id || '',
        summary:           item.summary || '',
        status:            item.status || 'Concluído',
        responsibleUserId: item.responsibleUserId || currentUser?.id || '',
        createdAt:         today,
      };
      addCSDailyService(service);
    });
  };

  const importFields = [
    { key: 'date',              label: 'Data (AAAA-MM-DD)',           required: true },
    { key: 'type',              label: 'Meio de Contato',             required: true },
    { key: 'clientPhone',       label: 'Telefone do Contato',         required: true },
    { key: 'clientNameManual',  label: 'Nome Manual (opcional)' },
    { key: 'summary',           label: 'Resumo',                      required: true },
    { key: 'status',            label: 'Status' },
    { key: 'responsibleUserId', label: 'ID do Responsável (opcional)' },
  ];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => setSelectedIds(prev =>
    prev.size === filteredServices.length ? new Set() : new Set(filteredServices.map(s => s.id))
  );
  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];
    setConfirmConfig({ title: 'Mover para Lixeira', message: `Deseja mover ${ids.length} atendimento(s) para a Lixeira?`, onConfirm: () => { moveToTrash('csDailyService', ids); setSelectedIds(new Set()); setConfirmConfig(null); } });
  };

  const filteredServices = useMemo(() => {
    return csDailyServices.filter(s => {
      const client = clients.find(c => c.id === s.clientId);
      const searchLower = searchTerm.toLowerCase();
      return (
        client?.name.toLowerCase().includes(searchLower) ||
        s.clientPhone.includes(searchTerm) ||
        s.summary.toLowerCase().includes(searchLower) ||
        s.clientNameManual?.toLowerCase().includes(searchLower) ||
        s.type.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [csDailyServices, clients, searchTerm]);

  const handleExportXLS = () => {
    const exportData = filteredServices.map(s => {
      const client = clients.find(c => c.id === s.clientId);
      const cls = client ? classes.find(cl => cl.id === client.classId) : null;
      const user = users.find(u => u.id === s.responsibleUserId);
      return {
        "Data": new Date(s.date).toLocaleDateString('pt-BR'),
        "Telefone": s.clientPhone,
        "Formando": client?.name || s.clientNameManual || 'NÃO VINCULADO',
        "Vínculo Base": client ? 'SIM' : 'NÃO',
        "Turma": cls?.name || 'N/A',
        "Meio": s.type,
        "Resumo": s.summary,
        "Status": s.status,
        "Responsável": user?.name || 'N/A'
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Atendimentos Diários");
    XLSX.writeFile(workbook, `cs_atendimentos_diarios_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic leading-none">Atendimentos Diários CS</h1>
          <p className="text-slate-500 font-medium mt-2 uppercase text-[10px] tracking-widest">Registro rápido via telefone com automação de histórico.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportXLS} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Download size={18} /> Relatório de Atendimentos
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
            <FileSpreadsheet size={18} /> Importar Planilha
          </button>
          <button onClick={() => { setServiceToEdit(null); setIsModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2 hover:scale-105 transition-all">
            <Plus size={18} /> Novo Atendimento
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Pesquisar por telefone, formando ou resumo..." 
                className="w-full pl-12 pr-4 py-4 rounded-xl border-none bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-2 px-6 border-l border-slate-100">
            <Filter size={18} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros Inteligentes</span>
         </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                <th className="px-4 py-5 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-amber-600 transition-colors">
                    {selectedIds.size === filteredServices.length && filteredServices.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="px-8 py-5">Data / Meio</th>
                <th className="px-8 py-5">Identificação</th>
                <th className="px-8 py-5">Resumo Técnico</th>
                <th className="px-8 py-5">Status / Vínculo</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredServices.map(service => {
                const client = clients.find(c => c.id === service.clientId);
                const cls = client ? classes.find(cl => cl.id === client.classId) : null;
                const user = users.find(u => u.id === service.responsibleUserId);

                return (
                  <tr key={service.id} className={`hover:bg-amber-50/30 transition-colors group ${selectedIds.has(service.id) ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-5">
                      <button onClick={() => toggleSelect(service.id)} className="text-slate-400 hover:text-amber-600 transition-colors">
                        {selectedIds.has(service.id) ? <CheckSquare size={16} className="text-amber-500"/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-sm font-black text-slate-900">{new Date(service.date).toLocaleDateString('pt-BR')}</p>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-white border border-slate-200 mt-1.5 inline-block text-slate-500 shadow-sm">
                            {service.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-[10px] font-black text-amber-600 mb-1 flex items-center gap-1"><Phone size={10}/> {service.clientPhone}</p>
                        <p className={`text-sm font-black uppercase leading-tight ${client ? 'text-slate-700' : 'text-slate-300 italic font-bold'}`}>
                            {client?.name || service.clientNameManual || 'Aguardando Vínculo...'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{cls?.name || 'Turma não vinculada'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 max-w-xs">
                        <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                            "{service.summary}"
                        </p>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex flex-col gap-2 items-start">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${service.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                {service.status}
                            </span>
                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-lg border ${client ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>
                                {client ? 'Sincronizado' : 'Offline'}
                            </span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setServiceToEdit(service); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 transition-all hover:bg-white rounded-xl shadow-sm"><Edit3 size={18}/></button>
                          <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: 'Deseja mover este atendimento para a Lixeira?', onConfirm: () => { moveToTrash('csDailyService', [service.id]); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-600 transition-all hover:bg-white rounded-xl shadow-sm"><Trash2 size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                     <div className="flex flex-col items-center opacity-10">
                        <Headset size={64} className="mb-4" />
                        <p className="font-black uppercase text-xs tracking-widest">Nenhum registro de contato</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-black">{selectedIds.size} selecionado(s)</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all">
            <Trash2 size={14}/> Mover para Lixeira
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-slate-700 rounded-xl transition-all"><X size={14}/></button>
        </div>
      )}

      {isModalOpen && <ServiceModal serviceToEdit={serviceToEdit} onClose={() => setIsModalOpen(false)} />}

      {isImportModalOpen && (
        <BulkImportModal
          title="Atendimentos Diários CS"
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

export default CSDailyServicesView;
