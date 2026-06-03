
import React, { useState, useMemo } from 'react';
import { useData } from '../../store';
import { Institution, Campus } from '../../types';
import { Building2, MapPin, Layers, X, Check, MapPinned, Edit3, Trash2, GraduationCap, Plus, FileSpreadsheet, PlusCircle, Calendar, Download } from 'lucide-react';
import BulkImportModal from '../../components/BulkImportModal';
import * as XLSX from 'xlsx';

const InstitutionModal: React.FC<{
  institution?: Institution | null;
  onClose: () => void;
  onSave: (data: Partial<Institution>) => void;
}> = ({ institution, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Institution>>(institution || { name: '', campi: [], state: '' });
  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusCity, setNewCampusCity] = useState('');

  const handleAddCampus = () => {
    if (!newCampusName || !newCampusCity) return;
    const campusList = [...(formData.campi || [])];
    campusList.push({ name: newCampusName, city: newCampusCity });
    setFormData({ ...formData, campi: campusList });
    setNewCampusName('');
    setNewCampusCity('');
  };

  const handleRemoveCampus = (index: number) => {
    const campusList = [...(formData.campi || [])];
    campusList.splice(index, 1);
    setFormData({ ...formData, campi: campusList });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 uppercase">Instituição de Ensino</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social / Nome Fantasia *</label>
              <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado (UF)</label>
              <input maxLength={2} placeholder="Ex: SP" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner uppercase" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <MapPinned size={14} className="text-amber-500" /> Gerenciar Campi e Cidades
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Campus</label>
                <input placeholder="Ex: Campus Central" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold" value={newCampusName} onChange={e => setNewCampusName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade do Campus</label>
                <div className="flex gap-2">
                  <input placeholder="Ex: São Paulo" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold" value={newCampusCity} onChange={e => setNewCampusCity(e.target.value)} />
                  <button type="button" onClick={handleAddCampus} className="bg-amber-500 text-white p-2.5 rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {formData.campi?.map((camp, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 text-[10px] font-black">{idx + 1}</div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">{camp.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                        <MapPin size={10} /> {camp.city}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemoveCampus(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {(!formData.campi || formData.campi.length === 0) && (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 text-xs font-bold uppercase tracking-widest">
                  Nenhum campus adicionado
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl sticky bottom-0">Salvar Instituição e Unidades</button>
        </form>
      </div>
    </div>
  );
};

const InstituicoesAdmin: React.FC = () => {
  const { institutions, setInstitutions, classes } = useData();
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [instToEdit, setInstToEdit] = useState<Institution | null>(null);

  const sortedInstitutions = useMemo(() => {
    return [...institutions].sort((a, b) => a.name.localeCompare(b.name));
  }, [institutions]);

  const selectedInst = useMemo(() => institutions.find(i => i.id === selectedInstId), [institutions, selectedInstId]);
  const instClasses = useMemo(() => classes.filter(c => c.institutionId === selectedInstId), [classes, selectedInstId]);

  const handleEdit = (item: Institution) => { setInstToEdit(item); setModalOpen(true); };

  const handleExportXLS = () => {
    const exportData: any[] = [];
    
    institutions.forEach(inst => {
      // Se a instituição tiver campi, cria uma linha para cada um
      if (inst.campi && inst.campi.length > 0) {
        inst.campi.forEach(camp => {
          exportData.push({
            "ID Instituição": inst.id,
            "Instituição": inst.name,
            "Estado (UF)": inst.state,
            "Nome do Campus": camp.name,
            "Cidade do Campus": camp.city,
            "Data Cadastro": new Date(inst.createdAt).toLocaleDateString('pt-BR')
          });
        });
      } else {
        // Se não tiver campi, cria uma linha com campos vazios/N/A para as unidades
        exportData.push({
          "ID Instituição": inst.id,
          "Instituição": inst.name,
          "Estado (UF)": inst.state,
          "Nome do Campus": "N/A",
          "Cidade do Campus": "N/A",
          "Data Cadastro": new Date(inst.createdAt).toLocaleDateString('pt-BR')
        });
      }
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Instituições Detalhado");
    XLSX.writeFile(workbook, `instituicoes_detalhado_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkImport = (data: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    data.forEach(item => {
      setInstitutions(prev => [...prev, {
        ...item,
        id: `inst-${Date.now()}-${Math.random()}`,
        campi: [],
        createdAt: today
      } as Institution]);
    });
  };

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      <div className={`flex-1 flex flex-col gap-6 transition-all ${selectedInstId ? 'w-1/2' : 'w-full'}`}>
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Instituições</h1><p className="text-slate-500 font-medium">Controle o cadastro de parceiros acadêmicos e seus campi.</p></div>
          <div className="flex items-center gap-3">
             <button onClick={handleExportXLS} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-2">
                <Download size={18} /> Exportar XLS Detalhado
             </button>
             <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
                <FileSpreadsheet size={18} /> Importar Planilha
            </button>
            <button onClick={() => { setInstToEdit(null); setModalOpen(true); }} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 flex items-center gap-2"><Plus size={18} /> Nova Instituição</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto">
          {sortedInstitutions.map(inst => (
            <div key={inst.id} onClick={() => setSelectedInstId(inst.id)} className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all bg-white relative group ${selectedInstId === inst.id ? 'border-amber-500 shadow-2xl scale-[1.02]' : 'border-white hover:border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500 transition-all"><Building2 size={24}/></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors uppercase truncate max-w-[200px]">{inst.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inst.campi?.length || 0} Campi cadastrados • {inst.state}</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase mt-1 flex items-center gap-1"><Calendar size={10} /> {new Date(inst.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(inst); }} className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Edit3 size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir?')) setInstitutions(p => p.filter(i => i.id !== inst.id)); }} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedInstId && selectedInst && (
        <div className="w-[520px] bg-white border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-500 shadow-2xl">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Building2 size={28} className="text-amber-500" /> Perfil da Instituição
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(selectedInst)} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 size={24} /></button>
              <button onClick={() => setSelectedInstId(null)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><X size={28} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Localização Principal</h4>
              <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex justify-between items-center">
                <p className="text-sm font-black text-slate-900 uppercase">Estado: {selectedInst.state}</p>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Cadastro</p>
                    <p className="text-[11px] font-bold text-slate-700">{new Date(selectedInst.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPinned size={14}/> Campi e Municípios</h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedInst.campi?.map((camp, idx) => (
                  <div key={idx} className="p-5 bg-amber-50 text-amber-900 rounded-3xl border border-amber-100 flex flex-col gap-1">
                    <p className="text-xs font-black uppercase tracking-tight">{camp.name}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1.5 opacity-70">
                        <MapPin size={10} /> {camp.city}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><GraduationCap size={14}/> Turmas Ativas</h4>
              <div className="space-y-2">
                {instClasses.map(cls => (
                  <div key={cls.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700">{cls.name}</span>
                    <span className="text-[9px] font-black px-2 py-1 bg-white rounded-lg border border-slate-100">{cls.graduationYear}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {modalOpen && <InstitutionModal institution={instToEdit} onClose={() => setModalOpen(false)} onSave={(d) => { 
          if(instToEdit) setInstitutions(p => p.map(i => i.id === instToEdit.id ? {...i, ...d} as Institution : i)); 
          else setInstitutions(p => [...p, {...d, id: `inst-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0]} as Institution]); 
          setModalOpen(false); 
      }} />}
      
      {isImportModalOpen && (
        <BulkImportModal 
            title="Instituições" 
            fields={[
                { key: 'name', label: 'Nome da Instituição', required: true },
                { key: 'state', label: 'Estado (UF)', required: true },
            ]} 
            onClose={() => setIsImportModalOpen(false)} 
            onImport={handleBulkImport} 
        />
      )}
    </div>
  );
};

export default InstituicoesAdmin;
