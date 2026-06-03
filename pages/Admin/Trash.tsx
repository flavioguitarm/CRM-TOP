
import React, { useMemo } from 'react';
import { useData } from '../../store';
import { Trash2, RotateCcw, Clock, AlertTriangle, Calendar, Info } from 'lucide-react';

const TrashPage: React.FC = () => {
    const { trash, restoreFromTrash } = useData();

    const sortedTrash = useMemo(() => {
        return [...trash].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    }, [trash]);

    const getDaysRemaining = (deletedAt: string) => {
        const delDate = new Date(deletedAt);
        const expiryDate = new Date(delDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        const diff = expiryDate.getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const getEntityBadge = (type: string) => {
        const labels: any = {
            course: 'Curso',
            institution: 'Instituição',
            product: 'Produto',
            class: 'Turma',
            user: 'Usuário',
            event: 'Evento',
            client: 'Cliente',
            csAction: 'Ação CS',
            funnel: 'Funil'
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Lixeira do Sistema</h1>
                    <p className="text-slate-500 font-medium">Itens aqui serão excluídos permanentemente após 30 dias.</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                    <Info className="text-amber-600" size={20} />
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-relaxed">
                        A exclusão definitiva é automática.<br/>Manuais não são permitidas por segurança.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {sortedTrash.length > 0 ? (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                                <th className="px-8 py-5">Item / Tipo</th>
                                <th className="px-8 py-5">Deletado em</th>
                                <th className="px-8 py-5">Expira em</th>
                                <th className="px-8 py-5 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedTrash.map(item => {
                                const daysLeft = getDaysRemaining(item.deletedAt);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
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
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={`flex items-center gap-2 text-xs font-black uppercase ${daysLeft <= 5 ? 'text-rose-500' : 'text-amber-600'}`}>
                                                <Clock size={14} />
                                                {daysLeft} dias
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => restoreFromTrash(item.id)}
                                                className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-2 ml-auto"
                                            >
                                                <RotateCcw size={14} /> Restaurar
                                            </button>
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
                        <p className="text-slate-300 text-[10px] font-bold uppercase mt-1">Nenhum item foi excluído nos últimos 30 dias.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrashPage;
