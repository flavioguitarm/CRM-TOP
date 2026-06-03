
import React, { useState } from 'react';
import { useData } from '../../store';
import { GenericRegistry, Column } from '../../components/GenericRegistry';
import { Course } from '../../types';
import { BookOpen, X, Check, BookPlus } from 'lucide-react';
import * as XLSX from 'xlsx';

const CourseModal: React.FC<{
  course?: Course | null;
  onClose: () => void;
  onSave: (data: Partial<Course>) => void;
}> = ({ course, onClose, onSave }) => {
  const [name, setName] = useState(course?.name || '');

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
               <BookPlus size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
              {course ? 'Editar Curso' : 'Novo Curso'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome do Curso acadêmico *</label>
            <input 
              required 
              autoFocus
              placeholder="Ex: Engenharia de Produção"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-amber-500 outline-none transition-all" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <Check size={16} /> Salvar Curso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CursosAdmin: React.FC = () => {
  const { courses, setCourses, moveToTrash } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const columns: Column<Course>[] = [
    { 
      header: 'Nome do Curso', 
      accessor: (item: Course) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500 transition-all">
            <BookOpen size={18}/>
          </div>
          <span className="font-black text-slate-900 uppercase tracking-tighter group-hover:text-amber-600 transition-colors">{item.name}</span>
        </div>
      ), 
      sortable: true 
    },
    { 
      header: 'ID Interno', 
      accessor: (item: Course) => <span className="text-slate-300 font-mono text-[10px] uppercase font-bold">#{item.id.split('-').pop()}</span> 
    },
  ];

  const handleAdd = () => {
    setSelectedCourse(null);
    setModalOpen(true);
  };

  const handleEdit = (item: Course) => {
    setSelectedCourse(item);
    setModalOpen(true);
  };

  const handleSave = (data: Partial<Course>) => {
    if (selectedCourse) {
      setCourses(prev => prev.map(c => c.id === selectedCourse.id ? { ...c, ...data } : c));
    } else {
      setCourses(prev => [...prev, { id: `c-${Date.now()}`, name: data.name!, createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (ids: string[]) => {
    moveToTrash('course', ids);
  };

  const handleExportXLS = () => {
    const exportData = courses.map(c => ({
      "ID Interno": c.id,
      "Nome do Curso": c.name,
      "Data de Cadastro": new Date(c.createdAt).toLocaleDateString('pt-BR')
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cursos");
    XLSX.writeFile(workbook, `cursos_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkImport = (data: any[]) => {
    const newItems = data.map((item, idx) => ({
      ...item,
      id: `c-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString().split('T')[0]
    } as Course));
    setCourses(prev => [...prev, ...newItems]);
  };

  const importFields = [
    { key: 'name', label: 'Nome do Curso', required: true },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <GenericRegistry
        title="Catálogo de Cursos"
        description="Gestão técnica do banco de cursos superiores e técnicos."
        entityType="course"
        data={courses}
        columns={columns}
        onAdd={handleAdd} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkImport={handleBulkImport}
        onExport={handleExportXLS}
        importFields={importFields}
        searchPlaceholder="Pesquisar curso no banco..."
      />

      {modalOpen && (
        <CourseModal 
          course={selectedCourse} 
          onClose={() => setModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
};

export default CursosAdmin;
