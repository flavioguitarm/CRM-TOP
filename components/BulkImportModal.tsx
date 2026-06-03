
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, FileUp, ArrowRight, Check, AlertCircle, 
  Table, Database, ChevronRight, UploadCloud, 
  FileSpreadsheet, Loader2, Cloud, AlertTriangle,
  CheckCircle2, GraduationCap, Package, Link2, Info,
  Building2, BookOpen, Clock, RefreshCw, MinusCircle, User
} from 'lucide-react';
import { useData } from '../store';

interface MappingField {
  key: string;
  label: string;
  required?: boolean;
}

interface BulkImportModalProps {
  title: string;
  fields: MappingField[];
  onImport: (data: any[], strategy: 'ignore' | 'overwrite') => void;
  onClose: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ title, fields, onImport, onClose }) => {
  const { clients, classes, products, institutions, courses, users } = useData();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fixedValues, setFixedValues] = useState<Record<string, string>>({});
  const [strategy, setStrategy] = useState<'ignore' | 'overwrite'>('ignore');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      alert("Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length > 0) {
          setFileData(data);
          const firstRow = data[0] as object;
          setHeaders(Object.keys(firstRow));
          setStep('mapping');
        } else {
          alert("A planilha parece estar vazia.");
        }
      } catch (error) {
        console.error("Erro ao ler planilha:", error);
        alert("Ocorreu um erro ao processar o arquivo. Verifique se o formato é válido.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const checkDuplicateInSystem = (fieldKey: string, value: any) => {
    if (!value || title !== 'Formandos') return false;
    const valStr = String(value).toLowerCase().trim();
    
    if (fieldKey === 'email') return clients.some(c => c.email.toLowerCase().trim() === valStr);
    if (fieldKey === 'cpf') return clients.some(c => c.cpf.trim() === valStr);
    if (fieldKey === 'phone') return clients.some(c => c.phone.trim() === valStr);
    
    return false;
  };

  const handleProcessImport = () => {
    const finalData = fileData.map((row) => {
      const obj: any = {};
      fields.forEach((field) => {
        const fixedValue = fixedValues[field.key];
        const spreadsheetKey = mapping[field.key];
        
        if (fixedValue) {
          obj[field.key] = fixedValue;
        } else if (spreadsheetKey) {
          obj[field.key] = row[spreadsheetKey];
        }
      });
      return obj;
    });
    onImport(finalData, strategy);
    onClose();
  };

  const renderFieldMappingOption = (field: MappingField) => {
    const isClassField = field.key === 'classId';
    const isProductField = field.key === 'soldProductId';
    const isInstField = field.key === 'institutionId';
    const isCourseField = field.key === 'courseId';
    const isUserField = field.key === 'responsibleUserId' || field.key === 'sellerId';
    
    const hasFixedValue = !!fixedValues[field.key];
    const canHaveFixed = isClassField || isProductField || isInstField || isCourseField || isUserField;

    return (
      <div key={field.key} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-amber-200 transition-all space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
               {isClassField ? <GraduationCap size={16}/> : 
                isProductField ? <Package size={16}/> : 
                isInstField ? <Building2 size={16}/> :
                isCourseField ? <BookOpen size={16}/> :
                isUserField ? <User size={16}/> :
                field.key === 'shift' ? <Clock size={16}/> : <Database size={16}/>}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campo no Sistema</p>
              <p className="text-sm font-black text-slate-900 uppercase">
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </p>
            </div>
          </div>
          {hasFixedValue && (
            <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border border-amber-200">
              Valor Fixo Ativo
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Table size={10}/> Coluna na Planilha
            </label>
            <select 
              disabled={hasFixedValue}
              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all ${hasFixedValue ? 'opacity-30 cursor-not-allowed' : ''}`}
              value={mapping[field.key] || ''}
              onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
            >
              <option value="">-- Ignorar ou Usar Fixo --</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {canHaveFixed && (
            <div className="space-y-1">
              <label className="text-[9px] font-black text-amber-600 uppercase tracking-tight flex items-center gap-1">
                <Link2 size={10}/> Vínculo Direto (Sistema)
              </label>
              <select 
                className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-black text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
                value={fixedValues[field.key] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setFixedValues({...fixedValues, [field.key]: val});
                    setMapping({...mapping, [field.key]: ''}); 
                  } else {
                    const next = {...fixedValues};
                    delete next[field.key];
                    setFixedValues(next);
                  }
                }}
              >
                <option value="">-- Mapear da Planilha --</option>
                {isClassField && classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {isProductField && products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {isInstField && institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                {isCourseField && courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {isUserField && users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Importar {title}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Processamento Inteligente de Planilhas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={32} /></button>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-8">
          {[
            { id: 'upload', label: 'Upload', icon: UploadCloud },
            { id: 'mapping', label: 'Vincular Colunas', icon: Database },
            { id: 'preview', label: 'Finalizar', icon: Check }
          ].map((s, idx) => (
            <div key={s.id} className={`flex items-center gap-3 ${step === s.id || (step === 'preview' && s.id === 'mapping') ? 'text-amber-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${step === s.id ? 'bg-amber-100' : 'bg-slate-200'}`}>
                {idx + 1}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
              {idx < 2 && <ChevronRight size={14} className="text-slate-300 ml-4" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-amber-500" size={48} />
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Processando dados...</p>
            </div>
          ) : step === 'upload' ? (
            <div className="space-y-6">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if(f) processFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`h-72 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group relative overflow-hidden ${
                  isDragging ? 'border-amber-500 bg-amber-50 scale-[0.98]' : 'border-slate-100 hover:border-amber-200 hover:bg-amber-50/30'
                }`}
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isDragging ? 'scale-110 text-amber-500 bg-white shadow-xl' : 'bg-slate-50 text-slate-300 group-hover:text-amber-500'}`}>
                  <FileUp size={40} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">Clique ou arraste sua planilha aqui</p>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase">Excel (.xlsx, .xls) ou CSV</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </div>
            </div>
          ) : step === 'mapping' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                <Info className="text-amber-600 mt-1" size={24} />
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Dica de Especialista:</p>
                  <p className="text-xs font-bold text-amber-700 leading-relaxed uppercase mt-1">
                    Campos como Instituição, Turma e Curso agora podem ser vinculados diretamente aos dados já cadastrados no CRM. Use o "Vínculo Direto" para garantir a integridade da sua base.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
                {fields.map(renderFieldMappingOption)}
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in">
              {/* Opções de Estratégia de Duplicidade */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                      <RefreshCw size={24} className="text-amber-400" />
                      <h4 className="text-lg font-black uppercase tracking-tight">Política de Dados Duplicados</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={() => setStrategy('ignore')}
                        className={`p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4 ${strategy === 'ignore' ? 'bg-amber-500/20 border-amber-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                      >
                          <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${strategy === 'ignore' ? 'bg-amber-500 border-amber-500' : 'border-slate-500'}`}>
                             {strategy === 'ignore' && <Check size={14} strokeWidth={4}/>}
                          </div>
                          <div>
                              <p className="font-black uppercase text-sm mb-1">Ignorar Duplicados</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Mantém o que já existe na base. Novas informações para o mesmo CPF/Email serão descartadas.</p>
                          </div>
                      </button>

                      <button 
                        onClick={() => setStrategy('overwrite')}
                        className={`p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4 ${strategy === 'overwrite' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                      >
                          <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${strategy === 'overwrite' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                             {strategy === 'overwrite' && <Check size={14} strokeWidth={4}/>}
                          </div>
                          <div>
                              <p className="font-black uppercase text-sm mb-1">Substituir (Atualizar)</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Sobrescreve os dados do cliente existente com as novas informações da planilha.</p>
                          </div>
                      </button>
                  </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><Table size={24} /></div>
                        <div>
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Preview da Importação</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fileData.length} registros no total</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-inner max-h-[400px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                        {fields.filter(f => mapping[f.key] || fixedValues[f.key]).map(f => (
                          <th key={f.key} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fileData.slice(0, 30).map((row, idx) => {
                        let hasDup = false;
                        const mappedValues: Record<string, any> = {};
                        fields.forEach(f => { 
                          if(fixedValues[f.key]) mappedValues[f.key] = fixedValues[f.key];
                          else if(mapping[f.key]) mappedValues[f.key] = row[mapping[f.key]]; 
                        });
                        
                        const emailDup = checkDuplicateInSystem('email', mappedValues.email);
                        const cpfDup = checkDuplicateInSystem('cpf', mappedValues.cpf);
                        const phoneDup = checkDuplicateInSystem('phone', mappedValues.phone);
                        if (emailDup || cpfDup || phoneDup) hasDup = true;

                        return (
                          <tr key={idx} className={`bg-white transition-colors ${hasDup ? (strategy === 'overwrite' ? 'bg-emerald-50/20' : 'bg-rose-50/20') : ''}`}>
                            <td className="px-6 py-3 text-center">
                               {hasDup ? (
                                   strategy === 'overwrite' ? (
                                       <div className="flex flex-col items-center text-emerald-600" title="Atualizar Existente">
                                           <RefreshCw size={18}/>
                                           <span className="text-[7px] font-black uppercase mt-1">UPDATE</span>
                                       </div>
                                   ) : (
                                       <div className="flex flex-col items-center text-rose-500" title="Ignorar Duplicado">
                                           <MinusCircle size={18}/>
                                           <span className="text-[7px] font-black uppercase mt-1">SKIP</span>
                                       </div>
                                   )
                               ) : (
                                   <div className="flex flex-col items-center text-emerald-500">
                                       <CheckCircle2 size={18}/>
                                       <span className="text-[7px] font-black uppercase mt-1">NOVO</span>
                                   </div>
                               )}
                            </td>
                            {fields.filter(f => mapping[f.key] || fixedValues[f.key]).map(f => {
                              const isFixed = !!fixedValues[f.key];
                              const val = isFixed ? fixedValues[f.key] : row[mapping[f.key]];
                              
                              let displayVal = val;
                              if (isFixed) {
                                  if (f.key === 'classId') displayVal = classes.find(c => c.id === val)?.name || val;
                                  if (f.key === 'soldProductId') displayVal = products.find(p => p.id === val)?.name || val;
                                  if (f.key === 'institutionId') displayVal = institutions.find(i => i.id === val)?.name || val;
                                  if (f.key === 'courseId') displayVal = courses.find(c => c.id === val)?.name || val;
                                  if (f.key === 'responsibleUserId' || f.key === 'sellerId') displayVal = users.find(u => u.id === val)?.name || val;
                              }

                              const isDupField = !isFixed && ((f.key === 'email' && emailDup) || (f.key === 'cpf' && cpfDup) || (f.key === 'phone' && phoneDup));

                              return (
                                <td key={f.key} className={`px-6 py-3 text-xs font-bold ${isDupField ? (strategy === 'overwrite' ? 'text-emerald-700 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30') : isFixed ? 'text-amber-600' : 'text-slate-600'}`}>
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-900 flex items-center justify-between">
          <button onClick={onClose} className="text-slate-400 hover:text-white font-black uppercase text-xs tracking-widest transition-colors">Cancelar Operação</button>
          <div className="flex gap-4">
            {step === 'mapping' && (
              <button onClick={() => setStep('preview')} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 shadow-xl flex items-center gap-2">Revisar Importação <ArrowRight size={16} /></button>
            )}
            {step === 'preview' && (
              <button onClick={handleProcessImport} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 shadow-xl shadow-emerald-200 flex items-center gap-2">
                <Check size={18} /> Confirmar Gravação em Massa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
