
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X, FileUp, ArrowRight, ArrowLeft, Check, ChevronRight,
  FileSpreadsheet, Loader2, GraduationCap, Building2, BookOpen,
  Clock, Package, User, Database, DollarSign, Calendar,
  AlertCircle, CheckCircle2, Info, Tag, Mail, Phone,
} from 'lucide-react';
import { useData } from '../store';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'projects';

type ColumnMap = {
  projectRaw:    string;
  name:          string;
  email:         string;
  phone:         string;
  cpf:           string;
  birthDate:     string;
  gender:        string;
  tags:          string;
  shift:         string;
  soldProductCol: string;
  soldValue:     string;
  soldDate:      string;
  lostDate:      string;
};

const EMPTY_MAP: ColumnMap = {
  projectRaw: '', name: '', email: '', phone: '', cpf: '',
  birthDate: '', gender: '', tags: '', shift: '',
  soldProductCol: '', soldValue: '', soldDate: '', lostDate: '',
};

interface FieldDef {
  key:       keyof ColumnMap;
  label:     string;
  required?: boolean;
  hint?:     string;
  Icon:      React.FC<{ size?: number; className?: string }>;
}

const FIELD_DEFS: FieldDef[] = [
  { key: 'projectRaw',    label: 'Projeto / Turma',            required: true,  Icon: GraduationCap,
    hint: 'Obrigatório — define turma, instituição e curso do formando' },
  { key: 'name',          label: 'Nome Completo',               required: true,  Icon: User },
  { key: 'email',         label: 'E-mail',                                       Icon: Mail },
  { key: 'phone',         label: 'Telefone',                                     Icon: Phone },
  { key: 'cpf',           label: 'CPF',                                          Icon: Database },
  { key: 'birthDate',     label: 'Data de Nascimento',                           Icon: Calendar },
  { key: 'gender',        label: 'Gênero',                                       Icon: User },
  { key: 'tags',          label: 'Etiquetas (sep. vírgula)',                     Icon: Tag },
  { key: 'shift',         label: 'Turno',                                        Icon: Clock },
  { key: 'soldProductCol',label: 'Produto Vendido (nome ou ID)',                 Icon: Package },
  { key: 'soldValue',     label: 'Valor da Venda',                               Icon: DollarSign },
  { key: 'soldDate',      label: 'Data da Venda',                                Icon: Calendar },
  { key: 'lostDate',      label: 'Data da Perda',                                Icon: Calendar },
];

// All 5 steps shown in stepper (4 and 5 inactive in Part 1)
const STEPS = [
  { id: 'upload',   label: 'Upload'   },
  { id: 'mapping',  label: 'Colunas'  },
  { id: 'projects', label: 'Projetos' },
  { id: 'funnel',   label: 'Funil'    },
  { id: 'preview',  label: 'Confirmar'},
] as const;

const ACTIVE_STEPS: Step[] = ['upload', 'mapping', 'projects'];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ClientImportModalProps {
  /** Called in Part 2 (Steps 4–5). Receives clean rows + strategy. */
  onImport: (data: any[], strategy: 'ignore' | 'overwrite') => void | Promise<void>;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ClientImportModal: React.FC<ClientImportModalProps> = ({ onImport: _onImport, onClose }) => {
  const { classes, institutions, courses } = useData();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step,       setStep]       = useState<Step>('upload');
  const [fileData,   setFileData]   = useState<any[]>([]);
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [columnMap,  setColumnMap]  = useState<ColumnMap>(EMPTY_MAP);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});  // rawValue → classId
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const uniqueProjectValues = useMemo<string[]>(() => {
    if (!columnMap.projectRaw) return [];
    const vals = fileData
      .map(row => String(row[columnMap.projectRaw] ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(vals)).sort();
  }, [fileData, columnMap.projectRaw]);

  const canAdvanceFromMapping  = columnMap.projectRaw !== '' && columnMap.name !== '';
  const mappedProjectsCount    = Object.values(projectMap).filter(Boolean).length;
  const currentStepIndex       = STEPS.findIndex(s => s.id === step);

  // ── File processing ────────────────────────────────────────────────────────

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      alert('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        // cellDates: false → mantém seriais numéricos; excelDateToISO converte depois
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          alert('A planilha parece estar vazia.');
          return;
        }
        setFileData(data);
        setHeaders(Object.keys(data[0] as object));
        setColumnMap(EMPTY_MAP);
        setProjectMap({});
        setStep('mapping');
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo. Verifique se o formato é válido.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const setCol = (key: keyof ColumnMap, value: string) =>
    setColumnMap(prev => ({ ...prev, [key]: value }));

  const setProject = (rawValue: string, classId: string) =>
    setProjectMap(prev => ({ ...prev, [rawValue]: classId }));

  const goBack = () => {
    const idx = ACTIVE_STEPS.indexOf(step);
    if (idx > 0) setStep(ACTIVE_STEPS[idx - 1]);
  };

  // Returns first 3 distinct non-empty sample values from a column (for preview)
  const previewCol = (col: string): string => {
    if (!col) return '';
    const seen = new Set<string>();
    for (const row of fileData) {
      const v = String(row[col] ?? '').trim();
      if (v) seen.add(v);
      if (seen.size === 3) break;
    }
    const allCount = new Set(fileData.map(r => String(r[col] ?? '').trim()).filter(Boolean)).size;
    const arr = Array.from(seen);
    return arr.join(', ') + (allCount > 3 ? ` (+${allCount - 3} outros)` : '');
  };

  const classLabel = (cls: typeof classes[0]): string => {
    const inst = institutions.find(i => i.id === cls.institutionId);
    return inst ? `${cls.name} — ${inst.name}` : cls.name;
  };

  // ── Render: Etapa 1 — Upload ───────────────────────────────────────────────

  const renderUpload = () => (
    <div className="animate-in fade-in">
      <div
        onDragOver={(e)  => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={()  => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) processFile(f);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`h-72 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group ${
          isDragging
            ? 'border-amber-500 bg-amber-50 scale-[0.98]'
            : 'border-slate-100 hover:border-amber-200 hover:bg-amber-50/30'
        }`}
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
          isDragging
            ? 'scale-110 text-amber-500 bg-white shadow-xl'
            : 'bg-slate-50 text-slate-300 group-hover:text-amber-500'
        }`}>
          <FileUp size={40} />
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
            Clique ou arraste sua planilha aqui
          </p>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase">Excel (.xlsx, .xls) ou CSV</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />
      </div>

      <div className="mt-8 bg-slate-50 rounded-3xl p-6 space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O que acontece nas próximas etapas:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { n: '2', label: 'Colunas',  desc: 'Você mapeia cada coluna da planilha para um campo do sistema' },
            { n: '3', label: 'Projetos', desc: 'Cada valor de "Projeto" é vinculado a uma turma real do CRM' },
            { n: '4', label: 'Funil',    desc: 'Selecione em qual funil e etapa os clientes entrarão' },
            { n: '5', label: 'Confirmar',desc: 'Revisão final agrupada por projeto antes de gravar' },
          ].map(({ n, label, desc }) => (
            <div key={n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{n}</div>
              <div>
                <p className="text-xs font-black text-slate-700 uppercase">{label}</p>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render: Etapa 2 — Mapeamento de colunas ────────────────────────────────

  const renderMapping = () => {
    const mappedCount = Object.values(columnMap).filter(Boolean).length;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Banner info */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-3">
          <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Como funciona</p>
            <p className="text-xs font-bold text-amber-700 mt-0.5 leading-relaxed">
              Para cada campo do sistema, selecione a coluna correspondente da sua planilha.
              Campos marcados com <span className="text-rose-500 font-black">*</span> são obrigatórios para avançar.
              Campos sem mapeamento serão ignorados.
            </p>
          </div>
        </div>

        {/* Field grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FIELD_DEFS.map((field) => {
            const { key, label, required, hint, Icon } = field;
            const currentCol = columnMap[key];
            const sample     = previewCol(currentCol);
            const isMapped   = currentCol !== '';
            return (
              <div
                key={key}
                className={`rounded-[1.5rem] border p-5 space-y-3 transition-all ${
                  required && !isMapped
                    ? 'border-amber-200 bg-amber-50/40'
                    : isMapped
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-100 bg-white'
                }`}
              >
                {/* Field header */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-all ${
                    isMapped ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Campo do sistema</p>
                    <p className="text-xs font-black text-slate-900 uppercase">
                      {label}
                      {required && <span className="text-rose-500 ml-1">*</span>}
                    </p>
                  </div>
                  {isMapped && <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />}
                </div>

                {/* Column select */}
                <select
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-amber-500 ${
                    isMapped
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                  value={currentCol}
                  onChange={(e) => setCol(key, e.target.value)}
                >
                  <option value="">— Não importar —</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>

                {/* Preview / hint */}
                {isMapped && sample && (
                  <p className="text-[9px] text-slate-400 font-bold truncate leading-relaxed">
                    <span className="text-slate-300 uppercase tracking-wider">Ex: </span>{sample}
                  </p>
                )}
                {!isMapped && hint && (
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">{hint}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer count */}
        <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest pb-2">
          {mappedCount} de {FIELD_DEFS.length} campos mapeados
        </p>
      </div>
    );
  };

  // ── Render: Etapa 3 — Vinculação de Projetos ───────────────────────────────

  const renderProjects = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Summary bar */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-6">
        {[
          { label: 'Registros na planilha', value: fileData.length,             color: 'text-white'       },
          { label: 'Projetos únicos',        value: uniqueProjectValues.length,  color: 'text-white'       },
          {
            label: 'Projetos vinculados',
            value: `${mappedProjectsCount} / ${uniqueProjectValues.length}`,
            color: mappedProjectsCount === uniqueProjectValues.length && uniqueProjectValues.length > 0
              ? 'text-emerald-400'
              : 'text-amber-400',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex items-start gap-3">
        <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs font-bold text-blue-700 leading-relaxed">
          Para cada valor encontrado na coluna <strong>"{columnMap.projectRaw}"</strong>, vincule ao projeto correspondente no CRM.
          Linhas sem vínculo serão <strong>ignoradas</strong> na importação.
          Ao vincular, instituição e curso são preenchidos automaticamente.
        </p>
      </div>

      {/* Project cards */}
      {uniqueProjectValues.length > 0 ? (
        <div className="space-y-3">
          {uniqueProjectValues.map(rawValue => {
            const selectedClassId = projectMap[rawValue] ?? '';
            const selectedClass   = selectedClassId ? classes.find(c => c.id === selectedClassId) : null;
            const inst            = selectedClass ? institutions.find(i => i.id === selectedClass.institutionId) : null;
            const courseNames     = selectedClass
              ? selectedClass.courseIds
                  .map(cid => courses.find(c => c.id === cid)?.name)
                  .filter(Boolean)
                  .join(', ')
              : null;
            const rowCount = fileData.filter(
              r => String(r[columnMap.projectRaw] ?? '').trim() === rawValue
            ).length;

            return (
              <div
                key={rawValue}
                className={`rounded-[1.5rem] border p-5 transition-all ${
                  selectedClassId
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-white hover:border-amber-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedClassId
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {selectedClassId
                      ? <CheckCircle2 size={20} />
                      : <GraduationCap size={20} />
                    }
                  </div>

                  {/* Raw value + derived info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Valor na planilha · {rowCount} linha{rowCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-black text-slate-900 truncate">{rawValue}</p>

                    {selectedClass && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {inst && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                            <Building2 size={8} /> {inst.name}
                          </span>
                        )}
                        {courseNames && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                            <BookOpen size={8} /> {courseNames}
                          </span>
                        )}
                        {selectedClass.classProducts.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                            <Package size={8} /> {selectedClass.classProducts.length} produto{selectedClass.classProducts.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Class select */}
                  <div className="flex-shrink-0 w-72">
                    <select
                      className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                        selectedClassId
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                      }`}
                      value={selectedClassId}
                      onChange={(e) => setProject(rawValue, e.target.value)}
                    >
                      <option value="">— Não vincular (ignorar linhas) —</option>
                      {classes
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {classLabel(cls)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center gap-3 text-slate-300">
          <AlertCircle size={36} />
          <p className="text-xs font-black uppercase tracking-widest">
            Nenhum valor encontrado na coluna "{columnMap.projectRaw}"
          </p>
        </div>
      )}
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                Importar Clientes
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Importação guiada em 5 etapas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 transition-all rounded-xl hover:bg-slate-50"
          >
            <X size={28} />
          </button>
        </div>

        {/* ── Stepper ─────────────────────────────────────────────────────── */}
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const isCurrent = s.id === step;
            const isDone    = idx < currentStepIndex;
            const isFuture  = !isCurrent && !isDone;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 flex-shrink-0 transition-opacity ${isFuture ? 'opacity-35' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCurrent ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' :
                    isDone    ? 'bg-emerald-500 text-white' :
                                'bg-slate-200 text-slate-400'
                  }`}>
                    {isDone ? <Check size={13} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isCurrent ? 'text-amber-600' :
                    isDone    ? 'text-emerald-600' :
                                'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <ChevronRight size={13} className="text-slate-200 flex-shrink-0 mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-amber-500" size={48} />
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
                Lendo planilha...
              </p>
            </div>
          ) : step === 'upload'   ? renderUpload()
            : step === 'mapping'  ? renderMapping()
            :                       renderProjects()
          }
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-8 py-5 bg-slate-900 flex items-center justify-between">
          {/* Left: back / cancel */}
          <div>
            {step === 'upload' ? (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white font-black uppercase text-xs tracking-widest transition-colors"
              >
                Cancelar
              </button>
            ) : (
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white font-black uppercase text-xs tracking-widest transition-colors"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
          </div>

          {/* Right: advance */}
          <div className="flex items-center gap-4">
            {step === 'mapping' && (
              <>
                {!canAdvanceFromMapping && (
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    Mapeie Projeto e Nome para continuar
                  </p>
                )}
                <button
                  disabled={!canAdvanceFromMapping}
                  onClick={() => setStep('projects')}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${
                    canAdvanceFromMapping
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Vincular Projetos <ArrowRight size={15} />
                </button>
              </>
            )}

            {step === 'projects' && (
              <>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  {mappedProjectsCount} de {uniqueProjectValues.length} vinculado{uniqueProjectValues.length !== 1 ? 's' : ''}
                </span>
                {/* Etapas 4 e 5 — Parte 2 */}
                <button
                  disabled
                  title="Selecionar Funil — disponível na Parte 2"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-700 text-slate-500 cursor-not-allowed"
                >
                  Selecionar Funil <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientImportModal;
