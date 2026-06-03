
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store';
import { 
  Plus, GraduationCap, Calendar as CalendarIcon, Clock, X, Check, Building2, Trash2, Edit3, 
  ShoppingCart, Tag, DollarSign, Target, TrendingUp, FileSpreadsheet, Download, ExternalLink,
  User, Briefcase, Zap
} from 'lucide-react';
import BulkImportModal from '../../components/BulkImportModal';
import { ClassRoom, ClassProduct } from '../../types';
import * as XLSX from 'xlsx';

// --- Componente ClassModal ---
const ClassModal: React.FC<{
  classToEdit?: ClassRoom | null;
  onClose: () => void;
  onSave: (data: Partial<ClassRoom>) => void;
}> = ({ classToEdit, onClose, onSave }) => {
  const { institutions, courses, users } = useData();
  const [formData, setFormData] = useState<Partial<ClassRoom>>(classToEdit || {
    name: '',
    institutionId: '',
    courseIds: [],
    graduationYear: new Date().getFullYear(),
    graduationMonth: 12,
    comercialExterno: '',
    gestorProjeto: '',
    consultorCSId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.institutionId) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase">
            {classToEdit ? 'Editar Turma' : 'Nova Turma'}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900"><X size={28} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Turma *</label>
              <input required className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instituição *</label>
              <select required className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={formData.institutionId} onChange={e => setFormData({...formData, institutionId: e.target.value})}>
                <option value="">Selecionar...</option>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cursos (Selecione vários segurando Ctrl)</label>
            <select multiple className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm h-32 focus:ring-2 focus:ring-amber-500 outline-none" value={formData.courseIds} onChange={e => {
              const values = Array.from(e.target.selectedOptions, (option: any) => option.value);
              setFormData({...formData, courseIds: values});
            }}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ano de Formatura</label>
              <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.graduationYear} onChange={e => setFormData({...formData, graduationYear: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês (6 ou 12)</label>
              <select className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm" value={formData.graduationMonth} onChange={e => setFormData({...formData, graduationMonth: parseInt(e.target.value)})}>
                <option value={6}>Junho (1º Semestre)</option>
                <option value={12}>Dezembro (2º Semestre)</option>
              </select>
            </div>
          </div>

          <section className="space-y-4 pt-6 border-t border-slate-100">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Briefcase size={14}/> Atribuição de Responsáveis</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comercial que Fechou</label>
                  <input placeholder="Nome do consultor externo" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={formData.comercialExterno || ''} onChange={e => setFormData({...formData, comercialExterno: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestor de Projeto Responsável</label>
                  <input placeholder="Responsável pelo NP" className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={formData.gestorProjeto || ''} onChange={e => setFormData({...formData, gestorProjeto: e.target.value})} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultor CS Responsável</label>
                  <select className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={formData.consultorCSId || ''} onChange={e => setFormData({...formData, consultorCSId: e.target.value})}>
                    <option value="">Não atribuído...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
             </div>
          </section>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl sticky bottom-0">Salvar Dados da Turma</button>
        </form>
      </div>
    </div>
  );
};

const ClassProductModal: React.FC<{
  classId: string;
  onClose: () => void;
  productToEdit?: ClassProduct;
}> = ({ classId, onClose, productToEdit }) => {
  const { products, addClassProduct, updateClassProduct, classes } = useData();
  const currentClass = classes.find(c => c.id === classId);
  
  const [formData, setFormData] = useState<ClassProduct>(() => {
    if (productToEdit) {
      return {
        ...productToEdit,
        id: productToEdit.id || `cp-${Date.now()}-${Math.random()}`,
        erpQuantity: productToEdit.erpQuantity ?? 0,
        erpValue: productToEdit.erpValue ?? 0
      };
    }
    return {
      id: `cp-${Date.now()}-${Math.random()}`,
      productId: '',
      customPrice: 0,
      goalQuantity: 0,
      goalValue: 0,
      erpQuantity: 0,
      erpValue: 0
    };
  });

  const availableProducts = useMemo(() => {
    return products;
  }, [products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) return;
    if (productToEdit) updateClassProduct(classId, formData);
    else addClassProduct(classId, formData);
    onClose();
  };

  const metaTicketAvg = formData.goalQuantity > 0 ? (formData.goalValue / formData.goalQuantity) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase">Configurar Produto da Turma</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900"><X size={28} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white overflow-y-auto max-h-[80vh]">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto da Base *</label>
            <select 
              disabled={!!productToEdit}
              required 
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-amber-500"
              value={formData.productId}
              onChange={e => {
                setFormData({...formData, productId: e.target.value, customPrice: 0});
              }}
            >
              <option value="">Selecionar...</option>
              {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor de Tabela para esta Turma (R$)</label>
            <input 
              type="number" 
              step="0.01"
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              value={formData.customPrice}
              onChange={e => {
                const price = parseFloat(e.target.value) || 0;
                setFormData(prev => ({
                  ...prev,
                  customPrice: price,
                  goalValue: price * prev.goalQuantity // Cálculo Automático
                }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Qtd (Volume)</label>
              <input 
                type="number" 
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.goalQuantity}
                onChange={e => {
                  const qty = parseInt(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    goalQuantity: qty,
                    goalValue: qty * prev.customPrice // Cálculo Automático
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Valor (VGV)</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 text-sm font-black shadow-inner focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.goalValue}
                onChange={e => setFormData({...formData, goalValue: parseFloat(e.target.value) || 0})}
              />
              <p className="text-[8px] font-black text-amber-600 uppercase mt-1 px-1 flex items-center gap-1">
                <Check size={8} strokeWidth={4} /> Calculado: Preço x Volume
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio Meta</span>
             <span className="text-sm font-black text-slate-900">R$ {metaTicketAvg.toLocaleString()}</span>
          </div>

          {/* Segunda Validação dos dados de vendas do ERP oficial */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp size={14} /> Dados de Vendas do ERP Oficial
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Realizado ERP (Volume)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  value={formData.erpQuantity || 0}
                  onChange={e => setFormData({ ...formData, erpQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-650 uppercase tracking-widest">Realizado ERP (VGV R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4 text-sm font-black text-rose-900 shadow-inner focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  value={formData.erpValue || 0}
                  onChange={e => setFormData({ ...formData, erpValue: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">
            Salvar Configuração Comercial
          </button>
        </form>
      </div>
    </div>
  );
};

const TurmasAdmin: React.FC = () => {
  const { classes, institutions, courses, addClass, updateClass, deleteClass, events, sales, removeClassProduct, products, users } = useData();
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<ClassRoom | null>(null);
  const [classProductModal, setClassProductModal] = useState<{ open: boolean, edit?: ClassProduct }>({ open: false });

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      if (a.graduationYear !== b.graduationYear) {
        return a.graduationYear - b.graduationYear;
      }
      if (a.graduationMonth !== b.graduationMonth) {
        return a.graduationMonth - b.graduationMonth;
      }
      return a.name.localeCompare(b.name);
    });
  }, [classes]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const totalSoldForTurma = useMemo(() => {
    if (!selectedClassId) return 0;
    return sales.filter(s => s.classId === selectedClassId).reduce((sum, s) => sum + s.value, 0);
  }, [sales, selectedClassId]);

  const classEvents = useMemo(() => {
    if (!selectedClassId) return [];
    return events.filter(e => e.classId === selectedClassId).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  }, [selectedClassId, events]);

  const handleSaveClass = (data: Partial<ClassRoom>) => {
    if (classToEdit) updateClass({ ...classToEdit, ...data } as ClassRoom);
    else addClass({ ...data, id: `t-${Date.now()}`, timeline: [], classProducts: [] } as ClassRoom);
    setIsModalOpen(false);
  };

  const handleExportXLS = () => {
    const exportData = classes.map(c => {
        const inst = institutions.find(i => i.id === c.institutionId);
        const courseNames = c.courseIds.map(cid => courses.find(course => course.id === cid)?.name).join(', ');
        const csUser = users.find(u => u.id === c.consultorCSId);
        return {
            "ID": c.id,
            "Turma": c.name,
            "Instituição": inst?.name || 'N/A',
            "Cursos": courseNames,
            "Ano Formatura": c.graduationYear,
            "Semestre": c.graduationMonth <= 6 ? 1 : 2,
            "Comercial Externo": c.comercialExterno || '',
            "Gestor de Projeto": c.gestorProjeto || '',
            "Consultor CS": csUser?.name || 'Não atribuído',
            "Data Cadastro": new Date(c.createdAt).toLocaleDateString('pt-BR')
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Turmas");
    XLSX.writeFile(workbook, `turmas_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkImport = (data: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    data.forEach(item => {
      addClass({
        ...item,
        id: `t-${Date.now()}-${Math.random()}`,
        graduationYear: parseInt(item.graduationYear) || new Date().getFullYear(),
        graduationMonth: parseInt(item.graduationMonth) || 12,
        courseIds: item.courseIds ? item.courseIds.split(',') : [],
        timeline: [],
        classProducts: [],
        createdAt: today
      } as ClassRoom);
    });
  };

  const importFields = [
    { key: 'name', label: 'Nome da Turma', required: true },
    { key: 'institutionId', label: 'ID da Instituição', required: true },
    { key: 'courseIds', label: 'IDs dos Cursos (sep. vírgula)', required: true },
    { key: 'graduationYear', label: 'Ano Formatura', required: true },
    { key: 'graduationMonth', label: 'Mês Formatura (6 ou 12)' },
    { key: 'comercialExterno', label: 'Comercial que Fechou' },
    { key: 'gestorProjeto', label: 'Gestor de Projeto' },
    { key: 'consultorCSId', label: 'ID Consultor CS' },
  ];

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      <div className={`flex-1 flex flex-col gap-6 transition-all ${selectedClassId ? 'w-1/2' : 'w-full'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Gestão de Turmas</h1>
            <p className="text-slate-500 font-medium">Controle técnico e cronograma das comissões de formatura.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportXLS} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-2">
                <Download size={18} /> Exportar XLS
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
                <FileSpreadsheet size={18} /> Importar Planilha
            </button>
            <button onClick={() => { setClassToEdit(null); setIsModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2">
                <Plus size={18} /> Nova Turma
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                  <th className="px-8 py-5">Identificação da Turma</th>
                  <th className="px-8 py-5">Instituição</th>
                  <th className="px-8 py-5">Formação</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedClasses.map(cls => (
                  <tr 
                    key={cls.id} 
                    className={`hover:bg-amber-50 cursor-pointer transition-colors group ${selectedClassId === cls.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-500' : ''}`}
                    onClick={() => setSelectedClassId(cls.id)}
                  >
                    <td className="px-8 py-5">
                      <div>
                        <p className="font-black text-slate-900 text-sm leading-tight group-hover:text-amber-600 transition-colors uppercase tracking-tight">{cls.name}</p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase mt-1 flex items-center gap-1"><CalendarIcon size={10} /> Criado em: {new Date(cls.createdAt).toLocaleDateString()}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {cls.courseIds.map(cid => (
                            <span key={cid} className="text-[9px] font-black px-1.5 py-0.5 bg-white border border-slate-200 text-slate-400 uppercase rounded">
                              {courses.find(c => c.id === cid)?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-black text-slate-700 uppercase">{institutions.find(i => i.id === cls.institutionId)?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{institutions.find(i => i.id === cls.institutionId)?.state}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-lg border border-amber-200">
                        {cls.graduationYear}.{cls.graduationMonth <= 6 ? '1' : '2'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setClassToEdit(cls); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 transition-all"><Edit3 size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir turma?')) deleteClass(cls.id); }} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedClassId && selectedClass && (
        <div className="w-[640px] bg-white border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-500 shadow-2xl overflow-y-auto">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <GraduationCap size={28} className="text-amber-500" /> Perfil da Turma
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { setClassToEdit(selectedClass); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={24} /></button>
              <button onClick={() => setSelectedClassId(null)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><X size={28} /></button>
            </div>
          </div>

          <div className="p-8 space-y-10 bg-white">
            {/* Novo Retângulo: Eficiência de Vendas ERP vs Meta */}
            {(() => {
              const totalMetaVgv = selectedClass.classProducts.reduce((sum, cp) => sum + (cp.goalValue || 0), 0);
              const totalErpVgv = selectedClass.classProducts.reduce((sum, cp) => sum + (cp.erpValue || 0), 0);
              const pct = totalMetaVgv > 0 ? (totalErpVgv / totalMetaVgv) * 100 : 0;
              const isOvermeta = pct >= 100;
              
              return (
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-[2rem] text-white space-y-4 border border-indigo-900/40 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1 animate-pulse">
                        VGV Total das Metas vs ERP Oficial
                      </p>
                      <h3 className="text-2xl font-black text-white">
                        R$ {totalErpVgv.toLocaleString('pt-BR')}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          realizados de R$ {totalMetaVgv.toLocaleString('pt-BR')} meta
                        </span>
                      </h3>
                    </div>
                    <div>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${isOvermeta ? 'bg-emerald-500 text-white animate-bounce' : 'bg-indigo-900/60 text-indigo-200 border border-indigo-800'}`}>
                        {isOvermeta ? '🔥 Overmeta' : 'Meta Comercial'}
                      </span>
                    </div>
                  </div>

                  {/* Termômetro */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                      <span className="text-slate-400">Termômetro de Vendas</span>
                      <span className={isOvermeta ? 'text-emerald-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                        {pct.toFixed(1)}% {isOvermeta && '(Overmeta!)'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isOvermeta ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'}`} 
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Vendido (Turma)</p>
                  <p className="text-2xl font-black text-emerald-400">R$ {totalSoldForTurma.toLocaleString()}</p>
               </div>
               <div className="bg-amber-500 p-6 rounded-[2rem] text-white">
                  <p className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-1">Data de Cadastro</p>
                  <p className="text-xl font-black">{new Date(selectedClass.createdAt).toLocaleDateString()}</p>
               </div>
            </div>

            <section className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><User size={14}/> Responsáveis pela Operação</h4>
               <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between">
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Comercial que Fechou</p>
                        <p className="text-xs font-black text-slate-700 uppercase">{selectedClass.comercialExterno || 'Não informado'}</p>
                     </div>
                     <Briefcase size={16} className="text-slate-200" />
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between">
                     <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Gestor de Projeto</p>
                        <p className="text-xs font-black text-slate-700 uppercase">{selectedClass.gestorProjeto || 'Não informado'}</p>
                     </div>
                     <GraduationCap size={16} className="text-slate-200" />
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-between">
                     <div>
                        <p className="text-[8px] font-black text-amber-600 uppercase">Consultor CS Responsável</p>
                        <p className="text-xs font-black text-amber-800 uppercase">
                           {users.find(u => u.id === selectedClass.consultorCSId)?.name || 'Sem consultor vinculado'}
                        </p>
                     </div>
                     <Zap size={16} className="text-amber-200" />
                  </div>
               </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><ShoppingCart size={14}/> Gestão Comercial de Produtos</h4>
                <button 
                  onClick={() => setClassProductModal({ open: true })}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-amber-500 hover:text-white transition-all"
                >
                  Configurar Produto
                </button>
              </div>

              <div className="space-y-4">
                {selectedClass.classProducts.map(cp => {
                  const baseProd = products.find(p => p.id === cp.productId);
                  const classSales = sales.filter(s => s.classId === selectedClassId && s.productId === cp.productId);
                  const realizedQty = classSales.length;
                  const realizedValue = classSales.reduce((acc, s) => acc + s.value, 0);
                  const realizedAvg = realizedQty > 0 ? realizedValue / realizedQty : 0;
                  const metaAvg = cp.goalQuantity > 0 ? cp.goalValue / cp.goalQuantity : 0;

                  return (
                    <div key={cp.id || cp.productId} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-50 rounded-2xl text-slate-400"><Tag size={20}/></div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase">{baseProd?.name || 'Produto Removido'}</p>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Tabela Turma: R$ {cp.customPrice.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={() => setClassProductModal({ open: true, edit: cp })}
                            className="p-2 text-slate-300 hover:text-amber-600"
                           >
                            <Edit3 size={18}/>
                           </button>
                           <button 
                            onClick={() => {
                              if (realizedQty > 0) {
                                alert('Não é possível remover um produto que já possui vendas realizadas nesta turma.');
                                return;
                              }
                              if (confirm('Deseja remover este produto do catálogo da turma?')) {
                                removeClassProduct(selectedClassId, cp.id || cp.productId);
                              }
                            }}
                            className={`p-2 transition-colors ${realizedQty > 0 ? 'text-slate-100' : 'text-slate-300 hover:text-rose-500'}`}
                           >
                            <Trash2 size={18}/>
                           </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <Target size={12}/> Meta Comercial
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                              <p className="text-[7px] font-black text-slate-400 uppercase">Volume</p>
                              <p className="text-[10px] font-black text-slate-900">{cp.goalQuantity}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                              <p className="text-[7px] font-black text-slate-400 uppercase">VGV</p>
                              <p className="text-[10px] font-black text-slate-900">R$ {cp.goalValue >= 1000 ? (cp.goalValue/1000).toFixed(1) + 'k' : cp.goalValue}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                              <p className="text-[7px] font-black text-slate-400 uppercase">Avg</p>
                              <p className="text-[10px] font-black text-slate-900">R$ {metaAvg.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                            <TrendingUp size={12}/> Realizado CRM
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100">
                              <p className="text-[7px] font-black text-emerald-600 uppercase">Volume</p>
                              <p className="text-[10px] font-black text-emerald-950">{realizedQty}</p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100">
                              <p className="text-[7px] font-black text-emerald-600 uppercase">VGV</p>
                              <p className="text-[10px] font-black text-emerald-950">R$ {realizedValue >= 1000 ? (realizedValue/1000).toFixed(1) + 'k' : realizedValue}</p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100">
                              <p className="text-[7px] font-black text-emerald-600 uppercase">Avg</p>
                              <p className="text-[10px] font-black text-emerald-950">R$ {realizedAvg.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[9px] font-black text-rose-600 uppercase tracking-widest">
                            <TrendingUp size={12}/> Realizado ERP
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-rose-50 p-2 rounded-xl text-center border border-rose-100">
                              <p className="text-[7px] font-black text-rose-600 uppercase">Volume</p>
                              <p className="text-[10px] font-black text-rose-900">{cp.erpQuantity ?? 0}</p>
                            </div>
                            <div className="bg-rose-50 p-2 rounded-xl text-center border border-rose-100">
                              <p className="text-[7px] font-black text-rose-600 uppercase">VGV</p>
                              <p className="text-[10px] font-black text-rose-900">
                                R$ {(cp.erpValue ?? 0) >= 1000 ? ((cp.erpValue ?? 0)/1000).toFixed(1) + 'k' : (cp.erpValue ?? 0)}
                              </p>
                            </div>
                            <div className="bg-rose-50 p-2 rounded-xl text-center border border-rose-100">
                              <p className="text-[7px] font-black text-rose-600 uppercase">Avg</p>
                              <p className="text-[10px] font-black text-rose-900">
                                R$ {((cp.erpQuantity ?? 0) > 0 ? (cp.erpValue ?? 0) / (cp.erpQuantity ?? 1) : 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedClass.classProducts.length === 0 && (
                  <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                    <ShoppingCart size={32} className="mx-auto text-slate-200 mb-2"/>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Catálogo comercial da turma vazio.</p>
                  </div>
                )}
              </div>
            </section>
            
            <section className="space-y-6 pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><CalendarIcon size={14}/> Cronograma da Turma</h4>
              <div className="space-y-4 relative pl-4">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
                {classEvents.map(evt => (
                  <div 
                    key={evt.id} 
                    className="relative pl-8 cursor-pointer group"
                    onClick={() => navigate(`/admin/eventos?id=${evt.id}`)}
                  >
                    <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm transition-all group-hover:scale-125 ${evt.status === 'Confirmado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-amber-400 group-hover:bg-amber-50 transition-all shadow-sm group-hover:shadow-md">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{evt.type}</p>
                        <div className="flex items-center gap-2">
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${evt.status === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-400'}`}>{evt.status}</span>
                           <ExternalLink size={10} className="text-slate-300 group-hover:text-amber-500" />
                        </div>
                      </div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-amber-700">{evt.name}</h5>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(evt.startDateTime).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {classEvents.length === 0 && (
                  <p className="text-center text-[10px] font-black text-slate-300 uppercase py-8">Nenhum evento agendado para esta turma.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {isModalOpen && <ClassModal classToEdit={classToEdit} onClose={() => setIsModalOpen(false)} onSave={handleSaveClass} />}
      
      {classProductModal.open && selectedClassId && (
        <ClassProductModal 
          classId={selectedClassId} 
          onClose={() => setClassProductModal({ open: false })} 
          productToEdit={classProductModal.edit}
        />
      )}

      {isImportModalOpen && (
        <BulkImportModal 
            title="Turmas" 
            fields={importFields} 
            onClose={() => setIsImportModalOpen(false)} 
            onImport={handleBulkImport} 
        />
      )}
    </div>
  );
};

export default TurmasAdmin;
