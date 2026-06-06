
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../../store';
import { supabase } from '../../src/lib/supabase';
import { Trash2, RotateCcw, Clock, AlertTriangle, Calendar, Info, ShieldAlert, Eye, EyeOff, Loader2, X, CheckSquare, Square } from 'lucide-react';
import HelpTooltip from '../../components/HelpTooltip';

const EXPIRY_DAYS = 90;
const MANUAL_DELETE_DAYS = 30;

const TrashPage: React.FC = () => {
    const { trash, restoreFromTrash, permanentDeleteFromTrash, purgeExpiredTrash, currentUser } = useData();

    // Auto-purge items older than 90 days on mount
    useEffect(() => { purgeExpiredTrash(); }, []);

    // Password confirmation modal state
    const [pwdOpen, setPwdOpen] = useState(false);
    const [pwdValue, setPwdValue] = useState('');
    const [pwdShow, setPwdShow] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const now = new Date();

    const sortedTrash = useMemo(() => {
        return [...trash].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    }, [trash]);

    const getDaysInTrash = (deletedAt: string) => {
        const diff = now.getTime() - new Date(deletedAt).getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    };

    const getExpiryDate = (deletedAt: string) => {
        const d = new Date(deletedAt);
        d.setDate(d.getDate() + EXPIRY_DAYS);
        return d;
    };

    const getDaysUntilExpiry = (deletedAt: string) => {
        const diff = getExpiryDate(deletedAt).getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const isEligibleForPermanentDelete = (deletedAt: string) =>
        getDaysInTrash(deletedAt) >= MANUAL_DELETE_DAYS;

    const eligibleItems = useMemo(() =>
        sortedTrash.filter(i => isEligibleForPermanentDelete(i.deletedAt)),
    [sortedTrash]);

    const eligibleSelectedIds = useMemo(() =>
        [...selectedIds].filter(id => {
            const item = trash.find(t => t.id === id);
            return item && isEligibleForPermanentDelete(item.deletedAt);
        }),
    [selectedIds, trash]);

    const toggleSelect = (id: string) => {
        const item = trash.find(t => t.id === id);
        if (!item || !isEligibleForPermanentDelete(item.deletedAt)) return;
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === eligibleItems.length && eligibleItems.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(eligibleItems.map(i => i.id)));
        }
    };

    const requestPermanentDelete = (ids: string[]) => {
        setPendingDeleteIds(ids);
        setPwdValue('');
        setPwdError('');
        setPwdShow(false);
        setPwdOpen(true);
    };

    const handlePasswordConfirm = async () => {
        if (!pwdValue) { setPwdError('Digite sua senha.'); return; }
        if (!currentUser?.email) { setPwdError('Usuário sem e-mail.'); return; }
        setPwdLoading(true);
        setPwdError('');
        const { error } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: pwdValue });
        setPwdLoading(false);
        if (error) { setPwdError('Senha incorreta. Tente novamente.'); return; }
        permanentDeleteFromTrash(pendingDeleteIds);
        setSelectedIds(new Set());
        setPwdOpen(false);
    };

    const getEntityBadge = (type: string) => {
        const labels: Record<string, string> = {
            course: 'Curso', institution: 'Instituição', product: 'Produto',
            productCategory: 'Categoria', class: 'Turma', user: 'Usuário',
            funnel: 'Funil', event: 'Evento', client: 'Cliente',
            csAction: 'Ação CS', activityType: 'Tipo Atividade', csDailyService: 'Atend. CS'
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">Lixeira do Sistema <HelpTooltip text={`Itens excluídos ficam aqui por até ${EXPIRY_DAYS} dias e podem ser restaurados a qualquer momento. A exclusão permanente manual só fica disponível após ${MANUAL_DELETE_DAYS} dias e exige confirmação de senha.`} position="right" /></h1>
                    <p className="text-slate-500 font-medium">Itens expiram automaticamente após {EXPIRY_DAYS} dias. Exclusão manual disponível após {MANUAL_DELETE_DAYS} dias.</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                    <Info className="text-amber-600 shrink-0" size={20} />
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-relaxed">
                        Auto-expiração: {EXPIRY_DAYS} dias<br/>
                        Exclusão manual: após {MANUAL_DELETE_DAYS} dias<br/>
                        Requer confirmação de senha
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {sortedTrash.length > 0 ? (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                                <th className="px-4 py-5 w-10">
                                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-rose-500 transition-colors" title="Selecionar elegíveis">
                                        {selectedIds.size === eligibleItems.length && eligibleItems.length > 0
                                            ? <CheckSquare size={16} className="text-rose-500"/>
                                            : <Square size={16}/>}
                                    </button>
                                </th>
                                <th className="px-8 py-5">Item / Tipo</th>
                                <th className="px-8 py-5">Deletado em</th>
                                <th className="px-8 py-5">Expira em</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedTrash.map(item => {
                                const daysInTrash = getDaysInTrash(item.deletedAt);
                                const daysUntilExpiry = getDaysUntilExpiry(item.deletedAt);
                                const eligible = isEligibleForPermanentDelete(item.deletedAt);
                                const isSelected = selectedIds.has(item.id);

                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-rose-50' : ''}`}>
                                        <td className="px-4 py-5">
                                            {eligible ? (
                                                <button onClick={() => toggleSelect(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                    {isSelected ? <CheckSquare size={16} className="text-rose-500"/> : <Square size={16}/>}
                                                </button>
                                            ) : (
                                                <span className="w-4 h-4 block opacity-20"><Square size={16}/></span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.originalName}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-black uppercase border border-slate-200">
                                                    {getEntityBadge(item.entityType)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                <Calendar size={14} />
                                                {new Date(item.deletedAt).toLocaleDateString('pt-BR')}
                                                <span className="text-[9px] text-slate-300">({daysInTrash}d atrás)</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={`flex items-center gap-2 text-xs font-black uppercase ${daysUntilExpiry <= 10 ? 'text-rose-500' : daysUntilExpiry <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                <Clock size={14} />
                                                {daysUntilExpiry > 0 ? `${daysUntilExpiry} dias` : 'Expirado'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {eligible ? (
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
                                                    <AlertTriangle size={10}/> Pode excluir
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 text-slate-400 border border-slate-200">
                                                    Aguardar {MANUAL_DELETE_DAYS - daysInTrash}d
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => restoreFromTrash(item.id)}
                                                        className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-1.5"
                                                    >
                                                        <RotateCcw size={12}/> Restaurar
                                                    </button>
                                                    <HelpTooltip text="Devolve o item ao sistema exatamente como estava antes, incluindo histórico de atividades vinculadas." position="top" />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        disabled={!eligible}
                                                        onClick={() => requestPermanentDelete([item.id])}
                                                        className="bg-rose-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed"
                                                        title={eligible ? 'Excluir permanentemente' : `Disponível após ${MANUAL_DELETE_DAYS - daysInTrash} dias`}
                                                    >
                                                        <Trash2 size={12}/> Excluir
                                                    </button>
                                                    {!eligible && <HelpTooltip text={`Disponível em ${MANUAL_DELETE_DAYS - daysInTrash} dia(s). O período de carência evita exclusões acidentais.`} position="top" />}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                            <Trash2 size={40} />
                        </div>
                        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Lixeira vazia</p>
                        <p className="text-slate-300 text-[10px] font-bold uppercase mt-1">Nenhum item foi excluído recentemente.</p>
                    </div>
                )}
            </div>

            {/* Floating bulk delete bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
                    <span className="text-sm font-black">{selectedIds.size} selecionado(s)</span>
                    <button
                        onClick={() => requestPermanentDelete(eligibleSelectedIds)}
                        className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all"
                    >
                        <Trash2 size={14}/> Excluir Permanentemente
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-slate-700 rounded-xl transition-all">
                        <X size={14}/>
                    </button>
                </div>
            )}

            {/* Password confirmation modal */}
            {pwdOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-rose-100 rounded-2xl">
                                    <ShieldAlert className="text-rose-600" size={24}/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Confirmar Exclusão</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ação irreversível — confirme sua senha</p>
                                </div>
                            </div>
                            <button onClick={() => setPwdOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><X size={24}/></button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-3">
                                <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16}/>
                                <p className="text-xs font-bold text-rose-700 leading-relaxed">
                                    Você está prestes a excluir permanentemente <span className="font-black">{pendingDeleteIds.length} item(ns)</span>. Esta ação <span className="font-black underline">não pode ser desfeita</span>.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua senha</label>
                                <div className="relative">
                                    <input
                                        type={pwdShow ? 'text' : 'password'}
                                        value={pwdValue}
                                        onChange={e => { setPwdValue(e.target.value); setPwdError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handlePasswordConfirm()}
                                        autoFocus
                                        className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 pr-12 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none transition-all ${pwdError ? 'border-rose-400' : 'border-slate-200'}`}
                                        placeholder="Digite sua senha..."
                                    />
                                    <button type="button" onClick={() => setPwdShow(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                        {pwdShow ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                                {pwdError && (
                                    <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1">
                                        <AlertTriangle size={10}/> {pwdError}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-8 pt-0 flex gap-3">
                            <button onClick={() => setPwdOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                            <button
                                onClick={handlePasswordConfirm}
                                disabled={pwdLoading || !pwdValue}
                                className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {pwdLoading ? <><Loader2 size={16} className="animate-spin"/> Verificando...</> : <><Trash2 size={14}/> Excluir Permanentemente</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrashPage;
