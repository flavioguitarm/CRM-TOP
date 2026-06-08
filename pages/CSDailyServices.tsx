
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../store';
import {
  Plus, Headset, X, Edit3, Trash2,
  Send, Search, CheckCircle2,
  Filter, Phone,
  Download, FileSpreadsheet, Check,
  AlertCircle, CheckSquare, Square,
  RotateCcw, MessageCircle, RefreshCw
} from 'lucide-react';

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
import { CSDailyService } from '../types';
import BulkImportModal from '../components/BulkImportModal';
import ConfirmModal from '../components/ConfirmModal';
import { usePermissions } from '../src/hooks/usePermissions';
import * as XLSX from 'xlsx';

// Campos canal contatado e canal de atendimento (opções fixas)
// Opções fixas de canal contatado (futuramente virá de cadastro)
const CANAL_CONTATADO_OPTIONS = ['API', 'CS1', 'CS2'];
const CANAL_ATENDIMENTO_OPTIONS = ['WhatsApp', 'Ligação', 'E-mail', 'Presencial', 'Instagram', 'Outro'];

// ── Modal de criação/edição de Atendimento ────────────────────────────────────
const ServiceModal: React.FC<{
  serviceToEdit?: CSDailyService | null;
  onClose: () => void;
}> = ({ serviceToEdit, onClose }) => {
  const { clients, classes, addCSDailyService, updateCSDailyService, currentUser, users, demandTypes } = useData();

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<CSDailyService>>(
    serviceToEdit || {
      clientId: '',
      clientPhone: '',
      clientNameManual: '',
      date: today,
      canalContatado: '',
      type: 'WhatsApp',         // Canal de Atendimento
      demandTypeId: '',
      summary: '',
      resolucao: '',
      repasse: false,
      repasseSetor: '',
      obs: '',
      valorVenda: undefined,
      retorno: '',
      remarketing: false,
      objecao: '',
      status: 'Concluído',
      responsibleUserId: currentUser?.id || '',
      classId: '',
    }
  );

  const [divergenceDismissed, setDivergenceDismissed] = useState(false);

  const matchedClient = useMemo(() => {
    if (!formData.clientPhone) return null;
    return clients.find(c => normalizePhone(c.phone) === normalizePhone(formData.clientPhone ?? ''));
  }, [formData.clientPhone, clients]);

  // Preenche clientId, nome e turma automaticamente ao encontrar match por telefone
  useEffect(() => {
    if (matchedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: matchedClient.id,
        clientNameManual: matchedClient.name,
        classId: prev.classId || matchedClient.classId || '',
      }));
    } else if (!serviceToEdit) {
      setFormData(prev => ({ ...prev, clientId: '', clientNameManual: '' }));
    }
  }, [matchedClient, serviceToEdit]);

  // Divergência: só relevante ao EDITAR um atendimento já vinculado a um cliente
  const divergence = useMemo(() => {
    if (!serviceToEdit || !matchedClient || divergenceDismissed) return null;
    const nameDiffers  = serviceToEdit.clientNameManual &&
                         serviceToEdit.clientNameManual !== matchedClient.name;
    const classDiffers = serviceToEdit.classId &&
                         serviceToEdit.classId !== matchedClient.classId;
    if (!nameDiffers && !classDiffers) return null;
    return { nameDiffers, classDiffers };
  }, [serviceToEdit, matchedClient, divergenceDismissed]);

  const clientClass = useMemo(() =>
    matchedClient ? classes.find(cl => cl.id === matchedClient.classId) : null,
    [matchedClient, classes]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientPhone) return;

    if (serviceToEdit) {
      updateCSDailyService(formData as CSDailyService);
    } else {
      addCSDailyService({
        ...formData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      } as CSDailyService);
    }
    onClose();
  };

  const set = (patch: Partial<CSDailyService>) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg">
              <Headset size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                {serviceToEdit ? 'Editar Atendimento' : 'Novo Atendimento Diário'}
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Registro completo do atendimento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">

          {/* Banner de divergência: dados do atendimento ≠ dados do cliente vinculado */}
          {divergence && matchedClient && (
            <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                      Divergência detectada
                    </p>
                    <p className="text-xs font-medium text-amber-700 leading-relaxed">
                      Os dados deste atendimento diferem do cliente vinculado na base.
                    </p>
                    <div className="mt-2 space-y-1">
                      {divergence.nameDiffers && (
                        <p className="text-[10px] font-bold text-amber-700">
                          <span className="text-amber-500">Nome no atendimento:</span>{' '}
                          <span className="line-through opacity-60">{serviceToEdit?.clientNameManual}</span>
                          {' → '}
                          <span className="font-black">{matchedClient.name}</span>
                        </p>
                      )}
                      {divergence.classDiffers && (
                        <p className="text-[10px] font-bold text-amber-700">
                          <span className="text-amber-500">Turma no cliente:</span>{' '}
                          <span className="font-black">
                            {classes.find(c => c.id === matchedClient.classId)?.name ?? 'Sem turma'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDivergenceDismissed(true)}
                  className="p-1 text-amber-400 hover:text-amber-700 transition-colors shrink-0"
                  title="Ignorar"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      clientNameManual: matchedClient.name,
                      classId: matchedClient.classId || prev.classId,
                    }));
                    setDivergenceDismissed(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                >
                  <RefreshCw size={12} /> Sincronizar com cliente
                </button>
                <button
                  type="button"
                  onClick={() => setDivergenceDismissed(true)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-100 transition-all"
                >
                  Manter atual
                </button>
              </div>
            </div>
          )}

          {/* Bloco 1: Identificação */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Identificação</p>

            {/* Data */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Data</label>
              <input
                type="date"
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.date}
                onChange={e => set({ date: e.target.value })}
              />
            </div>

            {/* Canal Contatado */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Canal Contatado</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.canalContatado}
                onChange={e => set({ canalContatado: e.target.value })}
              >
                <option value="" className="italic">Selecione o canal...</option>
                {CANAL_CONTATADO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12}/> 3. Telefone do Contato *
              </label>
              <input
                required
                placeholder="(00) 00000-0000"
                className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-4 text-sm font-black text-amber-900 shadow-inner focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
                value={formData.clientPhone}
                onChange={e => set({ clientPhone: e.target.value })}
              />
            </div>

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Nome</label>
              <div className="relative">
                <input
                  placeholder={matchedClient ? '' : 'Nenhum cliente vinculado a este telefone...'}
                  className={`w-full border rounded-2xl px-6 py-4 text-sm font-bold shadow-sm outline-none transition-all ${matchedClient ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-400'}`}
                  value={formData.clientNameManual}
                  onChange={e => set({ clientNameManual: e.target.value })}
                  readOnly={!!matchedClient}
                />
                {matchedClient && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20}/>}
              </div>
              {!matchedClient && formData.clientPhone && (
                <p className="text-[8px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 px-2">
                  <AlertCircle size={10}/> Telefone não localizado na base.
                </p>
              )}
            </div>

            {/* Turma */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5. Projeto</label>
              {matchedClient && clientClass ? (
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between animate-in slide-in-from-top-2">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Turma Identificada</p>
                    <p className="text-xs font-black text-amber-400 uppercase">{clientClass.name}</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full border border-emerald-500/20 uppercase">Vínculo Ativo</span>
                </div>
              ) : (
                <select
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  value={formData.classId}
                  onChange={e => set({ classId: e.target.value })}
                >
                  <option value="" className="italic">Selecione a turma...</option>
                  {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Bloco 2: Atendimento */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Atendimento</p>

            {/* Canal de Atendimento */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6. Canal de Atendimento</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.type}
                onChange={e => set({ type: e.target.value })}
              >
                {CANAL_ATENDIMENTO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Tipo de Demanda */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">7. Tipo de Demanda</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.demandTypeId}
                onChange={e => set({ demandTypeId: e.target.value })}
              >
                <option value="" className="italic">Selecione o tipo de demanda...</option>
                {demandTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
              </select>
            </div>

            {/* Resumo da conversa (mapeado para summary) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">8. Resumo da Conversa</label>
              <textarea
                placeholder="Relate o que foi tratado..."
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[90px]"
                value={formData.summary}
                onChange={e => set({ summary: e.target.value })}
              />
            </div>

            {/* Resolução da Demanda */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">9. Resolução da Demanda</label>
              <textarea
                placeholder="Como a demanda foi resolvida..."
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px]"
                value={formData.resolucao}
                onChange={e => set({ resolucao: e.target.value })}
              />
            </div>

            {/* Repasse */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">10. Repasse? Qual Setor?</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1">
                  <button
                    type="button"
                    onClick={() => set({ repasse: false, repasseSetor: '' })}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${!formData.repasse ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ repasse: true })}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.repasse ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    Sim
                  </button>
                </div>
                {formData.repasse && (
                  <input
                    autoFocus
                    placeholder="Qual setor?"
                    className="flex-1 border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold bg-amber-50 focus:ring-2 focus:ring-amber-500 outline-none animate-in slide-in-from-left-2"
                    value={formData.repasseSetor}
                    onChange={e => set({ repasseSetor: e.target.value })}
                  />
                )}
              </div>
            </div>

            {/* OBS */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">11. OBS</label>
              <textarea
                placeholder="Observações adicionais..."
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[70px]"
                value={formData.obs}
                onChange={e => set({ obs: e.target.value })}
              />
            </div>
          </div>

          {/* Bloco 3: Dados comerciais */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Dados Comerciais</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Valor de Venda */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">12. Valor de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="w-full bg-white border border-emerald-100 text-emerald-900 rounded-2xl px-6 py-4 text-sm font-black shadow-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                  value={formData.valorVenda ?? ''}
                  onChange={e => set({ valorVenda: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>

              {/* Retorno */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">13. Data de Retorno</label>
                <input
                  type="date"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  value={formData.retorno}
                  onChange={e => set({ retorno: e.target.value })}
                />
              </div>
            </div>

            {/* Remarketing */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">14. Remarketing</label>
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1 w-fit">
                <button
                  type="button"
                  onClick={() => set({ remarketing: false })}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${!formData.remarketing ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => set({ remarketing: true })}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.remarketing ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}
                >
                  Sim
                </button>
              </div>
            </div>

            {/* Objeção */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">15. Objeção</label>
              <input
                placeholder="Qual a objeção apresentada..."
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.objecao}
                onChange={e => set({ objecao: e.target.value })}
              />
            </div>
          </div>

          {/* Bloco 4: Status e Responsável */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Controle</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">16. Status</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm"
                  value={formData.status}
                  onChange={e => set({ status: e.target.value })}
                >
                  <option value="Concluído">Concluído</option>
                  <option value="Aguardando Retorno">Aguardando Retorno</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">17. Responsável</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm"
                  value={formData.responsibleUserId}
                  onChange={e => set({ responsibleUserId: e.target.value })}
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
            <Send size={20}/> Gravar Atendimento
          </button>
        </form>
      </div>
    </div>
  );
};

// ── View principal ────────────────────────────────────────────────────────────
const CSDailyServicesView: React.FC = () => {
  const { csDailyServices, clients, classes, users, moveToTrash, addCSDailyService, currentUser, demandTypes } = useData();
  const perms = usePermissions('atendimentosCs');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<CSDailyService | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [selectedService, setSelectedService] = useState<CSDailyService | null>(null);

  const handleBulkImport = async (data: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    for (const item of data) {
      if (!item.clientPhone) continue;
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
      // Aguarda persistência — evita sobrecarga paralela no Supabase
      await addCSDailyService(service);
    }
  };

  const importFields = [
    { key: 'date',              label: 'Data (AAAA-MM-DD)',           required: true },
    { key: 'clientPhone',       label: 'Telefone do Contato',         required: true },
    { key: 'clientNameManual',  label: 'Nome Manual (opcional)' },
    { key: 'type',              label: 'Canal de Atendimento',        required: true },
    { key: 'summary',           label: 'Resumo' },
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
      const demandType = demandTypes.find(d => d.id === s.demandTypeId);
      return (
        client?.name.toLowerCase().includes(searchLower) ||
        s.clientPhone.includes(searchTerm) ||
        s.summary.toLowerCase().includes(searchLower) ||
        s.clientNameManual?.toLowerCase().includes(searchLower) ||
        s.type.toLowerCase().includes(searchLower) ||
        demandType?.name.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [csDailyServices, clients, searchTerm, demandTypes]);

  const handleExportXLS = () => {
    const exportData = filteredServices.map(s => {
      const client = clients.find(c => c.id === s.clientId);
      const cls = classes.find(cl => cl.id === (s.classId || client?.classId));
      const user = users.find(u => u.id === s.responsibleUserId);
      const demandType = demandTypes.find(d => d.id === s.demandTypeId);
      return {
        "Data": new Date(s.date).toLocaleDateString('pt-BR'),
        "Canal Contatado": s.canalContatado || '',
        "Telefone": s.clientPhone,
        "Nome": client?.name || s.clientNameManual || 'NÃO VINCULADO',
        "Turma": cls?.name || 'N/A',
        "Canal de Atendimento": s.type,
        "Tipo de Demanda": demandType?.name || '',
        "Resumo": s.summary,
        "Resolução": s.resolucao || '',
        "Repasse?": s.repasse ? 'Sim' : 'Não',
        "Setor de Repasse": s.repasseSetor || '',
        "OBS": s.obs || '',
        "Valor de Venda": s.valorVenda ?? '',
        "Retorno": s.retorno ? new Date(s.retorno).toLocaleDateString('pt-BR') : '',
        "Remarketing": s.remarketing ? 'Sim' : 'Não',
        "Objeção": s.objecao || '',
        "Status": s.status,
        "Responsável": user?.name || 'N/A',
        "Vínculo Base": client ? 'SIM' : 'NÃO',
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
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Atendimentos Diários</h1>
          <p className="text-slate-500 font-medium mt-2 uppercase text-[10px] tracking-widest">Registro detalhado com automação de histórico.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportXLS} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Download size={18} /> Relatório
          </button>
          {perms.canInsert && (
            <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
              <FileSpreadsheet size={18} /> Importar Planilha
            </button>
          )}
          {perms.canInsert && (
            <button onClick={() => { setServiceToEdit(null); setIsModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2 hover:scale-105 transition-all">
              <Plus size={18} /> Novo Atendimento
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
                type="text"
                placeholder="Pesquisar por telefone, formando, tipo de demanda ou resumo..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border-none bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-2 px-6 border-l border-slate-100">
            <Filter size={18} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredServices.length} registros</span>
         </div>
      </div>

      <div className={`flex gap-4 flex-1 min-h-0 overflow-hidden`}>
      <div className={`flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 transition-all ${selectedService ? 'w-1/2' : 'w-full'}`}>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                <th className="px-4 py-5 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-amber-600 transition-colors">
                    {selectedIds.size === filteredServices.length && filteredServices.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="px-6 py-5">Data / Canal</th>
                <th className="px-6 py-5">Identificação</th>
                <th className="px-6 py-5">Tipo de Demanda</th>
                <th className="px-6 py-5">Resumo</th>
                <th className="px-6 py-5">Indicadores</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredServices.map(service => {
                const client = clients.find(c => c.id === service.clientId);
                const cls = classes.find(cl => cl.id === (service.classId || client?.classId));
                const user = users.find(u => u.id === service.responsibleUserId);
                const demandType = demandTypes.find(d => d.id === service.demandTypeId);

                return (
                  <tr key={service.id} onClick={() => setSelectedService(prev => prev?.id === service.id ? null : service)} className={`hover:bg-amber-50/30 transition-colors group cursor-pointer ${selectedIds.has(service.id) ? 'bg-amber-50' : ''} ${selectedService?.id === service.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/60' : ''}`}>
                    <td className="px-4 py-5">
                      <button onClick={() => toggleSelect(service.id)} className="text-slate-400 hover:text-amber-600 transition-colors">
                        {selectedIds.has(service.id) ? <CheckSquare size={16} className="text-amber-500"/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-sm font-black text-slate-900">{new Date(service.date + 'T12:00').toLocaleDateString('pt-BR')}</p>
                        {service.canalContatado && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-500 inline-block mt-1">
                            {service.canalContatado}
                          </span>
                        )}
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-white border border-slate-200 mt-1 inline-block text-slate-500 shadow-sm ml-1">
                          {service.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-[10px] font-black text-amber-600 mb-1 flex items-center gap-1"><Phone size={10}/> {service.clientPhone}</p>
                        <p className={`text-sm font-black uppercase leading-tight ${client ? 'text-slate-700' : 'text-slate-300 font-bold'}`}>
                          {client?.name || service.clientNameManual || 'Aguardando Vínculo...'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{cls?.name || 'Turma não vinculada'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {demandType ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: demandType.color }} />
                          <span className="text-xs font-black text-slate-700 uppercase">{demandType.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 max-w-[200px]">
                      <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed border-l-2 border-slate-200 pl-3">
                        "{service.summary}"
                      </p>
                      {service.resolucao && (
                        <p className="text-[9px] font-bold text-emerald-600 mt-1 line-clamp-1">↳ {service.resolucao}</p>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${service.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                          {service.status}
                        </span>
                        {service.repasse && (
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                            Repasse{service.repasseSetor ? `: ${service.repasseSetor}` : ''}
                          </span>
                        )}
                        {service.remarketing && (
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                            Remarketing
                          </span>
                        )}
                        {service.retorno && (
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                            <RotateCcw size={8}/> {new Date(service.retorno + 'T12:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {service.valorVenda ? (
                          <span className="text-[8px] font-black text-emerald-600">R$ {service.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {perms.canEdit && (
                            <button onClick={() => { setServiceToEdit(service); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 transition-all hover:bg-white rounded-xl shadow-sm">
                              <Edit3 size={18}/>
                            </button>
                          )}
                          {perms.canDelete && (
                            <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: 'Deseja mover este atendimento para a Lixeira?', onConfirm: () => { moveToTrash('csDailyService', [service.id]); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-600 transition-all hover:bg-white rounded-xl shadow-sm">
                              <Trash2 size={18}/>
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                     <div className="flex flex-col items-center opacity-10">
                        <Headset size={64} className="mb-4" />
                        <p className="font-black uppercase text-xs tracking-widest">Nenhum registro de atendimento</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Painel de detalhes (sem backdrop) ── */}
      {selectedService && (() => {
        const svc = selectedService;
        const client = clients.find(c => c.id === svc.clientId);
        const cls = classes.find(cl => cl.id === (svc.classId || client?.classId));
        const user = users.find(u => u.id === svc.responsibleUserId);
        const demandType = demandTypes.find(d => d.id === svc.demandTypeId);
        const Field: React.FC<{ label: string; value?: string | null; accent?: string }> = ({ label, value, accent }) =>
          value ? (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
              <p className={`text-sm font-bold ${accent || 'text-slate-800'} leading-snug`}>{value}</p>
            </div>
          ) : null;
        return (
          <div className="w-[380px] flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-200">
            {/* Header do painel */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">{new Date(svc.date + 'T12:00').toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })}</p>
                <h3 className="text-sm font-black text-slate-900 uppercase leading-tight">{client?.name || svc.clientNameManual || 'Sem identificação'}</h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">{svc.clientPhone}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {perms.canEdit && (
                  <button onClick={() => { setServiceToEdit(svc); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar">
                    <Edit3 size={16}/>
                  </button>
                )}
                {perms.canDelete && (
                  <button onClick={() => setConfirmConfig({ title: 'Mover para Lixeira', message: 'Deseja mover este atendimento para a Lixeira?', onConfirm: () => { moveToTrash('csDailyService', [svc.id]); setSelectedService(null); setConfirmConfig(null); } })} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Excluir">
                    <Trash2 size={16}/>
                  </button>
                )}
                <button onClick={() => setSelectedService(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={16}/>
                </button>
              </div>
            </div>

            {/* Corpo do painel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${svc.status === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{svc.status}</span>
                {svc.repasse && <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">Repasse{svc.repasseSetor ? `: ${svc.repasseSetor}` : ''}</span>}
                {svc.remarketing && <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Remarketing</span>}
                {svc.retorno && <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">Retorno: {new Date(svc.retorno + 'T12:00').toLocaleDateString('pt-BR')}</span>}
                {svc.valorVenda ? <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">R$ {svc.valorVenda.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span> : null}
              </div>

              {/* Canais e tipo */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4">
                <Field label="Canal Contatado" value={svc.canalContatado} />
                <Field label="Canal Atendimento" value={svc.type} />
                <Field label="Tipo de Demanda" value={demandType?.name} accent={demandType ? undefined : undefined} />
                <Field label="Responsável" value={user?.name} />
              </div>

              {/* Projeto / Cliente */}
              {(client || cls) && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <Field label="Cliente vinculado" value={client?.name} accent="text-slate-900 font-black" />
                  <Field label="Projeto" value={cls?.name} />
                </div>
              )}

              {/* Conteúdo */}
              {svc.summary && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Resumo da Conversa</p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">{svc.summary}</p>
                </div>
              )}
              {svc.resolucao && (
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Resolução</p>
                  <p className="text-sm text-emerald-800 font-medium leading-relaxed bg-emerald-50 rounded-2xl p-4 border border-emerald-100">{svc.resolucao}</p>
                </div>
              )}
              {svc.obs && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{svc.obs}</p>
                </div>
              )}
              {svc.objecao && (
                <div>
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Objeção</p>
                  <p className="text-sm text-rose-700 font-medium leading-relaxed">{svc.objecao}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      </div>{/* fecha o flex-wrapper */}

      {selectedIds.size > 0 && perms.canDelete && (
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
          title="Atendimentos Diários"
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
