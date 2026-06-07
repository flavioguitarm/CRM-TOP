
import React, { useState, useMemo } from 'react';
import { useData } from '../store';
import { UserRole, TrashItem } from '../types';
import { 
  Plus, Search, Trash2, Edit3, CheckCircle2, XCircle, 
  MoreVertical, ChevronLeft, ChevronRight, AlertTriangle,
  ArrowUpDown, Filter, Check, FileSpreadsheet, Calendar,
  ShieldAlert, X, Download
} from 'lucide-react';
import BulkImportModal from './BulkImportModal';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortable?: boolean;
}

interface GenericRegistryProps<T extends { id: string }> {
  title: string;
  description: string;
  entityType: TrashItem['entityType'];
  data: T[];
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (ids: string[]) => void;
  onBulkImport?: (data: any[]) => void;
  onExport?: () => void;
  importFields?: { key: string; label: string; required?: boolean }[];
  searchPlaceholder?: string;
}

const BulkDeleteConfirmation: React.FC<{
    count: number;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ count, onCancel, onConfirm }) => {
    const [confirmed, setConfirmed] = useState(false);

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-rose-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200">
                            <ShieldAlert size={24} />
                        </div>
                        <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter">Confirmar Exclusão</h3>
                    </div>
                    <button onClick={onCancel} className="p-2 text-rose-300 hover:text-rose-900 transition-all"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed">
                            Você está prestes a excluir <span className="text-rose-600 font-black">{count} item(ns)</span>. 
                            Os dados serão movidos para a <span className="font-black">Lixeira</span> por segurança.
                        </p>
                        
                        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex items-start gap-4 cursor-pointer group" onClick={() => setConfirmed(!confirmed)}>
                            <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${confirmed ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 bg-white group-hover:border-rose-400'}`}>
                                {confirmed && <Check size={16} strokeWidth={4} />}
                            </div>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight select-none">
                                Estou ciente da exclusão de todos esses itens
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={onCancel} className="py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all">
                            Manter Itens
                        </button>
                        <button 
                            disabled={!confirmed}
                            onClick={onConfirm}
                            className={`py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${confirmed ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                        >
                            Mover para Lixeira
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export function GenericRegistry<T extends { id: string }>({
  title,
  description,
  entityType,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onBulkImport,
  onExport,
  importFields,
  searchPlaceholder = "Pesquisar..."
}: GenericRegistryProps<T>) {
  const { currentUser, canDeleteEntity } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[] | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      result = result.filter(item => 
        JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    result.sort((a, b) => {
      const nameA = (a as any).name || '';
      const nameB = (b as any).name || '';
      return nameA.localeCompare(nameB);
    });
    return result;
  }, [data, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    const idsArray: string[] = Array.from(selectedIds);
    setIdsToDelete(idsArray);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {onExport && (
             <button onClick={onExport} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-slate-600 font-bold border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                <Download size={18} /> Exportar XLS
             </button>
          )}
          {onBulkImport && importFields && (
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl text-white font-bold shadow-sm hover:bg-slate-800 transition-colors">
              <FileSpreadsheet size={18} /> Importar Planilha
            </button>
          )}
          {isAdmin && (
            <button onClick={onAdd} className="flex items-center gap-2 bg-amber-500 px-4 py-2 rounded-xl text-white font-bold shadow-sm hover:bg-amber-600 transition-colors">
              <Plus size={18} /> Adicionar Novo
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 pr-2 border-r border-slate-200 mr-2">
                <span className="text-sm font-black text-amber-600 uppercase tracking-widest">{selectedIds.size} selecionados</span>
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                >
                  <Trash2 size={14} /> Excluir Seleção
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                <th className="px-6 py-4 w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${selectedIds.size === filteredData.length && filteredData.length > 0 ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}
                  >
                    {selectedIds.size === filteredData.length && filteredData.length > 0 && <Check size={14} strokeWidth={4} />}
                  </button>
                </th>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4">{col.header}</th>
                ))}
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const { can } = canDeleteEntity(entityType as any, item.id);
                const createdAt = (item as any).createdAt;
                
                return (
                  <tr 
                    key={item.id} 
                    className={`group transition-colors ${isSelected ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleSelect(item.id)}
                        className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}
                      >
                        {isSelected && <Check size={14} strokeWidth={4} />}
                      </button>
                    </td>
                    {columns.map((col, idx) => (
                      <td key={idx} className="px-6 py-4 text-sm font-bold text-slate-700">
                        {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as any)}
                        {idx === 0 && createdAt && (
                          <div className="text-[10px] font-bold text-slate-300 uppercase mt-1 flex items-center gap-1">
                            <Calendar size={10} /> Criado em: {new Date(createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                        <button 
                          disabled={!can}
                          onClick={() => setIdsToDelete([item.id])} 
                          className={`p-2 rounded-xl transition-all ${can ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isImportModalOpen && onBulkImport && importFields && (
        <BulkImportModal title={title} fields={importFields} onClose={() => setIsImportModalOpen(false)} onImport={onBulkImport} />
      )}

      {idsToDelete && (
          <BulkDeleteConfirmation 
            count={idsToDelete.length}
            onCancel={() => setIdsToDelete(null)}
            onConfirm={() => {
                onDelete(idsToDelete);
                setIdsToDelete(null);
                setSelectedIds(new Set());
            }}
          />
      )}
    </div>
  );
}
