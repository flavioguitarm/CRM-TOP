
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X, FileUp, ArrowRight, ArrowLeft, Check, ChevronRight,
  FileSpreadsheet, Loader2, GraduationCap, Building2, BookOpen,
  Clock, User, Calendar, AlertCircle, CheckCircle2, Info,
  Tag, Mail, Phone, Database, Zap, Eye, Users, AlertTriangle,
} from 'lucide-react';
import { useData } from '../store';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'projects' | 'preview';

/** Spreadsheet column → system field mapping */
type ColumnMap = {
  projectRaw:     string;  // column with project/class name (drives step 3)
  name:           string;  // required
  email:          string;
  phone:          string;
  cpf:            string;
  birthDate:      string;
  gender:         string;
  tags:           string;
  campus:         string;
  shift:          string;
  institutionRaw: string;  // fallback column for institution name/id
  courseRaw:      string;  // fallback column for course name/id
};

const EMPTY_MAP: ColumnMap = {
  projectRaw: '', name: '', email: '', phone: '', cpf: '',
  birthDate: '', gender: '', tags: '', campus: '', shift: '',
  institutionRaw: '', courseRaw: '',
};

/** Fixed system values applied to ALL rows (override / fallback to column data) */
type DirectBinds = {
  classId:       string;  // UUID — pre-fills all project mappings in step 3
  institutionId: string;  // UUID — auto-filled when classId is set
  courseId:      string;  // UUID — filtered by classId when set
};

const EMPTY_DIRECT: DirectBinds = { classId: '', institutionId: '', courseId: '' };

// ── Field definitions ─────────────────────────────────────────────────────────

interface FieldDef {
  key:           keyof ColumnMap;
  label:         string;
  required?:     boolean;
  hint?:         string;
  Icon:          React.FC<{ size?: number; className?: string }>;
  directBindKey?: keyof DirectBinds;  // which DirectBinds slot this field controls
}

interface FieldSection {
  id:     string;
  label:  string;
  accent: string;   // tailwind color name for border/bg
  fields: FieldDef[];
}

const FIELD_SECTIONS: FieldSection[] = [
  {
    id: 'identificacao', label: 'Identificação', accent: 'blue',
    fields: [
      { key: 'name',      label: 'Nome Completo',        required: true, Icon: User },
      { key: 'birthDate', label: 'Data de Nascimento',                   Icon: Calendar },
      { key: 'gender',    label: 'Sexo',                                  Icon: User },
      { key: 'cpf',       label: 'CPF',                                   Icon: Database },
      { key: 'email',     label: 'E-mail',                                Icon: Mail },
      { key: 'phone',     label: 'Telefone',                              Icon: Phone },
    ],
  },
  {
    id: 'academico', label: 'Vínculo Acadêmico', accent: 'amber',
    fields: [
      {
        key: 'projectRaw', label: 'Projeto', required: true, Icon: GraduationCap,
        hint: 'Obrigatório — define turma, instituição e curso do formando',
        directBindKey: 'classId',
      },
      {
        key: 'institutionRaw', label: 'Instituição', Icon: Building2,
        hint: 'Preenchida automaticamente ao selecionar o Projeto',
        directBindKey: 'institutionId',
      },
      { key: 'campus', label: 'Campus', Icon: Building2 },
      {
        key: 'courseRaw', label: 'Curso', Icon: BookOpen,
        directBindKey: 'courseId',
      },
      { key: 'shift', label: 'Turno', Icon: Clock },
    ],
  },
  {
    id: 'comercial', label: 'Comercial', accent: 'emerald',
    fields: [
      { key: 'tags', label: 'Etiquetas (sep. vírgula)', Icon: Tag },
    ],
  },
];

// Flat list (for counts, etc.)
const ALL_FIELD_DEFS: FieldDef[] = FIELD_SECTIONS.flatMap(s => s.fields);

const STEPS = [
  { id: 'upload',   label: 'Upload'   },
  { id: 'mapping',  label: 'Colunas'  },
  { id: 'projects', label: 'Projetos' },
  { id: 'preview',  label: 'Confirmar'},
] as const;

const ACTIVE_STEPS: Step[] = ['upload', 'mapping', 'projects', 'preview'];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ClientImportModalProps {
  onImport: (data: any[], strategy: 'ignore' | 'overwrite') => void | Promise<void>;
  onClose:  () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ClientImportModal: React.FC<ClientImportModalProps> = ({ onImport, onClose }) => {
  const { classes, institutions, courses } = useData();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step,           setStep]           = useState<Step>('upload');
  const [fileData,       setFileData]       = useState<any[]>([]);
  const [headers,        setHeaders]        = useState<string[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [isDragging,     setIsDragging]     = useState(false);
  const [columnMap,      setColumnMap]      = useState<ColumnMap>(EMPTY_MAP);
  const [directBinds,    setDirectBinds]    = useState<DirectBinds>(EMPTY_DIRECT);
  const [projectMap,     setProjectMap]     = useState<Record<string, string>>({});
  const [importStrategy, setImportStrategy] = useState<'ignore' | 'overwrite'>('ignore');
  const [importing,      setImporting]      = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const uniqueProjectValues = useMemo<string[]>(() => {
    if (!columnMap.projectRaw) return [];
    const vals = fileData
      .map(row => String(row[columnMap.projectRaw] ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(vals)).sort();
  }, [fileData, columnMap.projectRaw]);

  const canAdvanceFromMapping = columnMap.name !== '' && (columnMap.projectRaw !== '' || directBinds.classId !== '');
  const mappedProjectsCount   = useMemo(
    () => Object.values(projectMap).filter(Boolean).length,
    [projectMap],
  );
  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  // Rows that will actually be imported (have a resolved classId)
  const linkedRows = useMemo(() => {
    // Direct bind only — no column → all rows go to that class
    if (!columnMap.projectRaw && directBinds.classId) return fileData;
    if (!columnMap.projectRaw) return [];
    return fileData.filter(row => {
      const rawVal = String(row[columnMap.projectRaw] ?? '').trim();
      const classId = projectMap[rawVal] || directBinds.classId;
      return rawVal && classId;
    });
  }, [fileData, columnMap.projectRaw, projectMap, directBinds.classId]);

  const ignoredCount = fileData.length - linkedRows.length;

  const previewGroups = useMemo((): Record<string, { classId: string; rows: any[] }> => {
    const groups: Record<string, { classId: string; rows: any[] }> = {};
    for (const row of linkedRows) {
      const rawVal = columnMap.projectRaw
        ? String(row[columnMap.projectRaw] ?? '').trim()
        : '__direct__';
      const classId = (columnMap.projectRaw ? projectMap[rawVal] : '') || directBinds.classId;
      if (!groups[rawVal]) groups[rawVal] = { classId, rows: [] };
      groups[rawVal].rows.push(row);
    }
    return groups;
  }, [linkedRows, columnMap.projectRaw, projectMap, directBinds.classId]);

  // Course options in direct-bind select: filtered by classId (if set) else all
  const filteredCourses = useMemo(() => {
    if (directBinds.classId) {
      const cls = classes.find(c => c.id === directBinds.classId);
      if (cls) return courses.filter(c => cls.courseIds.includes(c.id));
    }
    return courses;
  }, [courses, classes, directBinds.classId]);

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
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) { alert('A planilha parece estar vazia.'); return; }
        setFileData(data);
        setHeaders(Object.keys(data[0] as object));
        setColumnMap(EMPTY_MAP);
        setDirectBinds(EMPTY_DIRECT);
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

  const setDirectBind = (key: keyof DirectBinds, value: string) =>
    setDirectBinds(prev => ({ ...prev, [key]: value }));

  /** Select a class in direct bind → auto-fills institution, resets course */
  const handleDirectBindClass = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    setDirectBinds(prev => ({
      classId,
      institutionId: cls?.institutionId ?? prev.institutionId,
      courseId: '',
    }));
    // Pre-fill projectMap with this classId for all already-known values
    if (classId && columnMap.projectRaw) {
      const prefilled: Record<string, string> = {};
      uniqueProjectValues.forEach(v => { prefilled[v] = classId; });
      setProjectMap(prev => ({ ...prefilled, ...prev }));
    }
  };

  const setProject = (rawValue: string, classId: string) =>
    setProjectMap(prev => ({ ...prev, [rawValue]: classId }));

  const goBack = () => {
    const idx = ACTIVE_STEPS.indexOf(step);
    if (idx > 0) setStep(ACTIVE_STEPS[idx - 1]);
  };

  const goToProjects = () => {
    // Pre-fill project map from direct bind if not already set
    if (directBinds.classId && columnMap.projectRaw) {
      setProjectMap(prev => {
        const prefilled: Record<string, string> = {};
        uniqueProjectValues.forEach(v => {
          prefilled[v] = prev[v] || directBinds.classId;
        });
        return prefilled;
      });
    }
    setStep('projects');
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    const cleanRows: any[] = linkedRows.map(row => {
      const rawVal = columnMap.projectRaw
        ? String(row[columnMap.projectRaw] ?? '').trim()
        : '';
      const classId = (rawVal ? projectMap[rawVal] : '') || directBinds.classId;
      const cls = classes.find(c => c.id === classId);

      return {
        name:          columnMap.name          ? String(row[columnMap.name]          ?? '').trim() : '',
        email:         columnMap.email         ? String(row[columnMap.email]         ?? '').trim() : '',
        phone:         columnMap.phone         ? String(row[columnMap.phone]         ?? '').trim() : '',
        cpf:           columnMap.cpf           ? String(row[columnMap.cpf]           ?? '').trim() : '',
        birthDate:     columnMap.birthDate     ? row[columnMap.birthDate]            ?? null       : null,
        gender:        columnMap.gender        ? String(row[columnMap.gender]        ?? '').trim() : '',
        tags:          columnMap.tags          ? String(row[columnMap.tags]          ?? '').trim() : '',
        campus:        columnMap.campus        ? String(row[columnMap.campus]        ?? '').trim() : '',
        shift:         columnMap.shift         ? String(row[columnMap.shift]         ?? '').trim() : '',
        classId,
        institutionId: cls?.institutionId      ?? directBinds.institutionId ?? '',
        courseId:      cls?.courseIds?.[0]     ?? directBinds.courseId      ?? '',
      };
    }).filter(r => r.name);

    try {
      await onImport(cleanRows, importStrategy);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  // Returns up to 3 distinct non-empty sample values from a column
  const previewCol = (col: string): string => {
    if (!col) return '';
    const seen = new Set<string>();
    for (const row of fileData) {
      const v = String(row[col] ?? '').trim();
      if (v) seen.add(v);
      if (seen.size === 3) break;
    }
    const total = new Set(fileData.map(r => String(r[col] ?? '').trim()).filter(Boolean)).size;
    return Array.from(seen).join(', ') + (total > 3 ? ` (+${total - 3} outros)` : '');
  };

  const classLabel = (cls: typeof classes[0]): string => {
    const inst = institutions.find(i => i.id === cls.institutionId);
    return inst ? `${cls.name} — ${inst.name}` : cls.name;
  };

  // ── Accent helpers ─────────────────────────────────────────────────────────

  const accentBorder  = (accent: string) =>
    accent === 'amber'   ? 'border-amber-200'
    : accent === 'emerald' ? 'border-emerald-200'
    : 'border-blue-200';

  const accentBg = (accent: string) =>
    accent === 'amber'   ? 'bg-amber-50'
    : accent === 'emerald' ? 'bg-emerald-50'
    : 'bg-blue-50';

  const accentText = (accent: string) =>
    accent === 'amber'   ? 'text-amber-700'
    : accent === 'emerald' ? 'text-emerald-700'
    : 'text-blue-700';

  // ── Render: Etapa 1 — Upload ───────────────────────────────────────────────

  const renderUpload = () => (
    <div className="animate-in fade-in">
      <div
        onDragOver={(e)  => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={()  => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setIsDragging(false);
          const f = e.dataTransfer.files?.[0]; if (f) processFile(f);
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
          ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />
      </div>

      <div className="mt-8 bg-slate-50 rounded-3xl p-6 space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O que acontece nas próximas etapas:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { n: '2', label: 'Colunas',   desc: 'Mapeie cada coluna da planilha para um campo. Campos com Vínculo Direto aceitam valor fixo do sistema.' },
            { n: '3', label: 'Projetos',  desc: 'Cada valor de "Projeto" é vinculado a uma turma real do CRM. Linhas sem vínculo são ignoradas.' },
            { n: '4', label: 'Confirmar', desc: 'Revisão final agrupada por projeto — escolha a política para duplicados antes de gravar.' },
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
    const totalMapped = ALL_FIELD_DEFS.filter(f => columnMap[f.key] !== '').length;
    const totalDirect = Object.values(directBinds).filter(Boolean).length;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* Banner */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-3">
          <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Como funciona</p>
            <p className="text-xs font-bold text-amber-700 leading-relaxed">
              Para cada campo, selecione a <strong>coluna da planilha</strong> correspondente.
              Campos marcados com <span className="text-rose-500 font-black">*</span> são obrigatórios.
              Campos com <Zap size={10} className="inline text-amber-500" /> também aceitam um <strong>Vínculo Direto</strong> — valor fixo do sistema aplicado a <em>todas</em> as linhas.
            </p>
          </div>
        </div>

        {/* Sections */}
        {FIELD_SECTIONS.map(section => (
          <div key={section.id} className="space-y-3">
            {/* Section header */}
            <div className={`flex items-center gap-2 px-1`}>
              <div className={`h-px flex-1 ${accentBorder(section.accent)} border-t`} />
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 ${accentText(section.accent)}`}>
                {section.label}
              </span>
              <div className={`h-px flex-1 ${accentBorder(section.accent)} border-t`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {section.fields.map((field) => {
                const { key, label, required, hint, Icon, directBindKey } = field;
                const currentCol    = columnMap[key];
                const isMapped      = currentCol !== '';
                const directVal     = directBindKey ? directBinds[directBindKey] : '';
                const hasDirectBind = !!directVal;
                const sample        = previewCol(currentCol);

                return (
                  <div
                    key={key}
                    className={`rounded-[1.5rem] border p-5 space-y-3 transition-all ${
                      hasDirectBind
                        ? 'border-amber-300 bg-amber-50/50'
                        : required && !isMapped
                        ? 'border-amber-200 bg-amber-50/40'
                        : isMapped
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-all ${
                        hasDirectBind ? 'bg-amber-100 text-amber-600'
                        : isMapped    ? 'bg-emerald-100 text-emerald-600'
                        :               'bg-slate-50 text-slate-400'
                      }`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Campo do sistema</p>
                        <p className="text-xs font-black text-slate-900 uppercase">
                          {label}
                          {required && <span className="text-rose-500 ml-1">*</span>}
                          {directBindKey && <Zap size={9} className="inline ml-1 text-amber-400" />}
                        </p>
                      </div>
                      {hasDirectBind && (
                        <span className="text-[8px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-lg uppercase tracking-wide flex-shrink-0">
                          Valor Fixo Ativo
                        </span>
                      )}
                      {!hasDirectBind && isMapped && (
                        <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Col 1: Coluna da Planilha */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coluna da Planilha</p>
                      <select
                        className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-amber-500 ${
                          hasDirectBind
                            ? 'bg-white border-slate-200 text-slate-400 opacity-50'
                            : isMapped
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                        value={currentCol}
                        disabled={hasDirectBind}
                        onChange={(e) => setCol(key, e.target.value)}
                      >
                        <option value="">— Não importar —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Col 2: Vínculo Direto (only for fields with directBindKey) */}
                    {directBindKey && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                          <Zap size={8} /> Vínculo Direto (Sistema)
                        </p>
                        {directBindKey === 'classId' && (
                          <select
                            className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                              hasDirectBind
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
                            }`}
                            value={directVal}
                            onChange={(e) => handleDirectBindClass(e.target.value)}
                          >
                            <option value="">— Usar coluna da planilha —</option>
                            {classes
                              .slice().sort((a, b) => a.name.localeCompare(b.name))
                              .map(cls => (
                                <option key={cls.id} value={cls.id}>{classLabel(cls)}</option>
                              ))}
                          </select>
                        )}
                        {directBindKey === 'institutionId' && (
                          <select
                            className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                              hasDirectBind
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
                            }`}
                            value={directVal}
                            onChange={(e) => setDirectBind('institutionId', e.target.value)}
                          >
                            <option value="">— Usar coluna da planilha —</option>
                            {institutions
                              .slice().sort((a, b) => a.name.localeCompare(b.name))
                              .map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                              ))}
                          </select>
                        )}
                        {directBindKey === 'courseId' && (
                          <select
                            className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                              hasDirectBind
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
                            }`}
                            value={directVal}
                            onChange={(e) => setDirectBind('courseId', e.target.value)}
                          >
                            <option value="">— Usar coluna da planilha —</option>
                            {filteredCourses
                              .slice().sort((a, b) => a.name.localeCompare(b.name))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Sample / hint */}
                    {!hasDirectBind && isMapped && sample && (
                      <p className="text-[9px] text-slate-400 font-bold truncate leading-relaxed">
                        <span className="text-slate-300 uppercase tracking-wider">Ex: </span>{sample}
                      </p>
                    )}
                    {hasDirectBind && directBindKey === 'classId' && (() => {
                      const cls = classes.find(c => c.id === directVal);
                      const inst = cls ? institutions.find(i => i.id === cls.institutionId) : null;
                      return cls ? (
                        <p className="text-[9px] text-amber-700 font-bold truncate leading-relaxed">
                          {cls.name}{inst ? ` — ${inst.name}` : ''}
                        </p>
                      ) : null;
                    })()}
                    {!hasDirectBind && !isMapped && hint && (
                      <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">{hint}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer count */}
        <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest pb-2">
          {totalMapped} coluna{totalMapped !== 1 ? 's' : ''} mapeada{totalMapped !== 1 ? 's' : ''}
          {totalDirect > 0 && <span className="text-amber-500"> · {totalDirect} vínculo{totalDirect !== 1 ? 's' : ''} direto{totalDirect !== 1 ? 's' : ''}</span>}
        </p>
      </div>
    );
  };

  // ── Render: Etapa 3 — Vinculação de Projetos ───────────────────────────────

  const renderProjects = () => {
    const hasDirectClass    = !!directBinds.classId;
    const directClass       = hasDirectClass ? classes.find(c => c.id === directBinds.classId) : null;
    const directClassInst   = directClass ? institutions.find(i => i.id === directClass.institutionId) : null;
    const hasProjectColumn  = !!columnMap.projectRaw;
    const allRows           = fileData.length;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Summary bar */}
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-6">
          {[
            { label: 'Registros na planilha',  value: allRows,                       color: 'text-white'    },
            { label: 'Projetos únicos',          value: hasProjectColumn ? uniqueProjectValues.length : (hasDirectClass ? 1 : 0), color: 'text-white' },
            {
              label: 'Projetos vinculados',
              value: hasDirectClass && !hasProjectColumn
                ? `1 / 1`
                : `${mappedProjectsCount} / ${uniqueProjectValues.length}`,
              color: (hasDirectClass && !hasProjectColumn) || (mappedProjectsCount === uniqueProjectValues.length && uniqueProjectValues.length > 0)
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

        {/* Direct bind active banner */}
        {hasDirectClass && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-3">
            <Zap size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Vínculo Direto Ativo</p>
              <p className="text-xs font-bold text-amber-700 mt-0.5 leading-relaxed">
                Todas as <strong>{allRows} linhas</strong> serão vinculadas ao projeto{' '}
                <strong>{directClass?.name}</strong>
                {directClassInst && <span> — {directClassInst.name}</span>}.
                {hasProjectColumn && ' Valores individuais abaixo podem sobrescrever esse padrão.'}
              </p>
            </div>
          </div>
        )}

        {/* Instructions (only when using column) */}
        {hasProjectColumn && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex items-start gap-3">
            <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-bold text-blue-700 leading-relaxed">
              Para cada valor encontrado na coluna <strong>"{columnMap.projectRaw}"</strong>, vincule ao projeto correspondente no CRM.
              Linhas sem vínculo serão <strong>ignoradas</strong>.
              {hasDirectClass && ' O vínculo direto está ativo como padrão para todos.'}
            </p>
          </div>
        )}

        {/* No column and no direct bind */}
        {!hasProjectColumn && !hasDirectClass && (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-slate-300">
            <AlertCircle size={36} />
            <p className="text-xs font-black uppercase tracking-widest text-center max-w-xs">
              Nenhuma coluna de Projeto mapeada e nenhum Vínculo Direto definido.
              Volte ao passo anterior.
            </p>
          </div>
        )}

        {/* Project cards (only when column is mapped) */}
        {hasProjectColumn && uniqueProjectValues.length > 0 && (
          <div className="space-y-3">
            {uniqueProjectValues.map(rawValue => {
              const selectedClassId = projectMap[rawValue] ?? '';
              const selectedClass   = selectedClassId ? classes.find(c => c.id === selectedClassId) : null;
              const inst            = selectedClass ? institutions.find(i => i.id === selectedClass.institutionId) : null;
              const courseNames     = selectedClass
                ? selectedClass.courseIds.map(cid => courses.find(c => c.id === cid)?.name).filter(Boolean).join(', ')
                : null;
              const rowCount = fileData.filter(
                r => String(r[columnMap.projectRaw] ?? '').trim() === rawValue
              ).length;
              const isDefault = !selectedClassId && hasDirectClass;

              return (
                <div
                  key={rawValue}
                  className={`rounded-[1.5rem] border p-5 transition-all ${
                    selectedClassId
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isDefault
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200 bg-white hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedClassId ? 'bg-emerald-100 text-emerald-600'
                      : isDefault     ? 'bg-amber-100 text-amber-600'
                      :                 'bg-slate-100 text-slate-400'
                    }`}>
                      {selectedClassId ? <CheckCircle2 size={20} /> : isDefault ? <Zap size={20} /> : <GraduationCap size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Valor na planilha · {rowCount} linha{rowCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm font-black text-slate-900 truncate">{rawValue}</p>
                      {isDefault && !selectedClassId && (
                        <p className="text-[9px] font-bold text-amber-600 mt-0.5">
                          Usando vínculo direto: {directClass?.name}
                        </p>
                      )}
                      {(selectedClass ?? (isDefault ? directClass : null)) && (() => {
                        const cls2 = selectedClass ?? directClass;
                        const inst2 = inst ?? (isDefault ? directClassInst : null);
                        const cNames = cls2?.courseIds.map(cid => courses.find(c => c.id === cid)?.name).filter(Boolean).join(', ');
                        return (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {inst2 && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                                <Building2 size={8} /> {inst2.name}
                              </span>
                            )}
                            {(cNames || courseNames) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                                <BookOpen size={8} /> {cNames || courseNames}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex-shrink-0 w-72">
                      <select
                        className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                          selectedClassId
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : isDefault
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                        }`}
                        value={selectedClassId}
                        onChange={(e) => setProject(rawValue, e.target.value)}
                      >
                        <option value="">
                          {isDefault ? `— Padrão: ${directClass?.name} —` : '— Não vincular (ignorar linhas) —'}
                        </option>
                        {classes
                          .slice().sort((a, b) => a.name.localeCompare(b.name))
                          .map(cls => <option key={cls.id} value={cls.id}>{classLabel(cls)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No values found in column */}
        {hasProjectColumn && uniqueProjectValues.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-slate-300">
            <AlertCircle size={36} />
            <p className="text-xs font-black uppercase tracking-widest">
              Nenhum valor encontrado na coluna "{columnMap.projectRaw}"
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Etapa 4 — Preview e Confirmação ────────────────────────────────

  const renderPreview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Summary bar */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-6">
        {[
          { label: 'Total na planilha', value: fileData.length,    color: 'text-white'       },
          { label: 'Serão importados',  value: linkedRows.length,  color: 'text-emerald-400' },
          { label: 'Serão ignorados',   value: ignoredCount,       color: ignoredCount > 0 ? 'text-amber-400' : 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Strategy selector */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Política para duplicados (mesmo telefone, e-mail ou CPF)</p>
        <div className="flex gap-3">
          {([
            { value: 'ignore',    label: 'Ignorar duplicados',   desc: 'Clientes já existentes não são alterados' },
            { value: 'overwrite', label: 'Atualizar existentes',  desc: 'Dados da planilha sobrescrevem o cadastro atual' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setImportStrategy(opt.value)}
              className={`flex-1 rounded-[1.5rem] border p-4 text-left transition-all ${
                importStrategy === opt.value ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  importStrategy === opt.value ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                }`}>
                  {importStrategy === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{opt.label}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ignored warning */}
      {ignoredCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs font-bold text-amber-800">
            ⚠️ Sem projeto vinculado — <strong>{ignoredCount} linha{ignoredCount !== 1 ? 's' : ''}</strong>{' '}
            {ignoredCount !== 1 ? 'serão ignoradas' : 'será ignorada'} na importação.
          </p>
        </div>
      )}

      {/* Groups by project */}
      {linkedRows.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center gap-3 text-slate-300">
          <AlertCircle size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Nenhuma linha para importar</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes por projeto</p>
          {(Object.entries(previewGroups) as [string, { classId: string; rows: any[] }][]).map(([rawVal, { classId, rows }]) => {
            const cls  = classes.find(c => c.id === classId);
            const inst = cls ? institutions.find(i => i.id === cls.institutionId) : null;
            return (
              <div key={rawVal} className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-amber-500" />
                    <p className="text-xs font-black text-slate-900 uppercase">{cls?.name ?? rawVal}</p>
                    {inst && <span className="text-[9px] font-bold text-slate-400">— {inst.name}</span>}
                  </div>
                  <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                    <Users size={9} className="inline mr-1" />{rows.length} cliente{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {rows.slice(0, 5).map((row, i) => {
                    const name  = columnMap.name  ? String(row[columnMap.name]  ?? '').trim() : '—';
                    const phone = columnMap.phone ? String(row[columnMap.phone] ?? '').trim() : '';
                    return (
                      <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">{name || '—'}</p>
                        {phone && <p className="text-[10px] font-bold text-slate-400">{phone}</p>}
                      </div>
                    );
                  })}
                  {rows.length > 5 && (
                    <div className="px-5 py-2 bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
                        + {rows.length - 5} outros clientes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                Importação guiada em 4 etapas
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
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Lendo planilha...</p>
            </div>
          ) : importing ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-emerald-500" size={48} />
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
                Importando {linkedRows.length} clientes...
              </p>
            </div>
          ) : step === 'upload'   ? renderUpload()
            : step === 'mapping'  ? renderMapping()
            : step === 'projects' ? renderProjects()
            :                       renderPreview()
          }
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-8 py-5 bg-slate-900 flex items-center justify-between">
          {/* Left */}
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

          {/* Right */}
          <div className="flex items-center gap-4">
            {step === 'mapping' && (
              <>
                {!canAdvanceFromMapping && (
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    {columnMap.projectRaw === '' && directBinds.classId === ''
                      ? 'Mapeie Projeto (coluna ou vínculo direto) e Nome'
                      : 'Mapeie o campo Nome para continuar'}
                  </p>
                )}
                <button
                  disabled={!canAdvanceFromMapping}
                  onClick={goToProjects}
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
                  {columnMap.projectRaw
                    ? `${mappedProjectsCount} de ${uniqueProjectValues.length} vinculado${uniqueProjectValues.length !== 1 ? 's' : ''}`
                    : directBinds.classId
                    ? `${fileData.length} linha${fileData.length !== 1 ? 's' : ''} → vínculo direto`
                    : 'Nenhuma linha vinculada'}
                </span>
                <button
                  onClick={() => setStep('preview')}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-amber-500 text-white hover:bg-amber-600 shadow-xl transition-all"
                >
                  <Eye size={15} /> Revisar Importação
                </button>
              </>
            )}

            {step === 'preview' && (
              <button
                disabled={importing || linkedRows.length === 0}
                onClick={handleConfirmImport}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${
                  linkedRows.length > 0 && !importing
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {importing
                  ? <><Loader2 size={14} className="animate-spin" /> Importando...</>
                  : <><Check size={14} strokeWidth={3} /> Confirmar importação de {linkedRows.length} cliente{linkedRows.length !== 1 ? 's' : ''}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientImportModal;
