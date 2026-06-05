
import React, { useState } from 'react';
import { useData } from '../../store';
import { GenericRegistry, Column } from '../../components/GenericRegistry';
import { ActivityType } from '../../types';
import { Tag, X, Check, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

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
          
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <Check size={16} /> Salvar Tipo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ActivityTypesAdmin: React.FC = () => {
  const { activityTypes, setActivityTypes, addActivityType, updateActivityType, moveToTrash } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);

  const columns: Column<ActivityType>[] = [
    { 
      header: 'Nome do Tipo', 
      accessor: (item: ActivityType) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500 transition-all">
            <Tag size={18}/>
          </div>
          <span className="font-black text-slate-900 uppercase tracking-tighter group-hover:text-amber-600 transition-colors">{item.name}</span>
        </div>
      ), 
      sortable: true 
    },
    { 
      header: 'Identificador', 
      accessor: (item: ActivityType) => <span className="text-slate-300 font-mono text-[10px] uppercase font-bold">#{item.id.split('-').pop()}</span> 
    },
  ];

  const handleAdd = () => {
    setSelectedType(null);
    setModalOpen(true);
  };

  const handleEdit = (item: ActivityType) => {
    setSelectedType(item);
    setModalOpen(true);
  };

  const handleSave = (data: Partial<ActivityType>) => {
    if (selectedType) {
      updateActivityType({ ...selectedType, ...data } as ActivityType);
    } else {
      addActivityType(data as Omit<ActivityType, 'id' | 'createdAt'>);
    }
    setModalOpen(false);
  };

  const handleDelete = (ids: string[]) => {
    moveToTrash('activityType', ids);
  };

  const handleExportXLS = () => {
    const exportData = activityTypes.map(t => ({
      "ID": t.id,
      "Nome do Tipo": t.name,
      "Data de Cadastro": new Date(t.createdAt).toLocaleDateString('pt-BR')
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tipos de Atividade");
    XLSX.writeFile(workbook, `tipos_atividade_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <GenericRegistry
        title="Tipos de Atividade de Evento"
        description="Configure as opções que aparecerão no campo 'Tipo de Atividade' ao criar eventos."
        entityType="activityType"
        data={activityTypes}
        columns={columns}
        onAdd={handleAdd} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExportXLS}
        searchPlaceholder="Pesquisar tipo cadastrado..."
      />

      {modalOpen && (
        <ActivityTypeModal 
          type={selectedType} 
          onClose={() => setModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
};

export default ActivityTypesAdmin;
