
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X, FileUp, ArrowRight, ArrowLeft, Check, ChevronRight,
  FileSpreadsheet, Loader2, GraduationCap, Building2, BookOpen,
  Clock, User, Calendar, AlertCircle, CheckCircle2, Info,
  Tag, Mail, Phone, Database, Zap, Eye, Users, AlertTriangle,
} from 'lucide-react';
import { useData } from '../store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'projects' | 'preview';

/**
 * Maps each system field to the spreadsheet column that contains its raw value.
 * Empty string = "not mapped / don't import".
 */
type ColumnMap = {
  projectRaw: string; // column whose values drive Step 3 project matching
  name:       string; // required
  phone:      string;
  email:      string;
  cpf:        string;
  birthDate:  string;
  gender:     string;
  tags:       string;
  campus:     string; // raw campus string column
  shift:      string;
  courseRaw:  string; // course name/id column (fallback when class has >1 course)
  turmaRaw:   string; // project_class name column (sub-turma within a project)
};

const EMPTY_MAP: ColumnMap = {
  projectRaw: '', name: '', phone: '', email: '', cpf: '',
  birthDate: '', gender: '', tags: '', campus: '', shift: '', courseRaw: '', turmaRaw: '',
};

/**
 * Fixed system values applied to ALL rows.
 * institutionId is auto-derived from classId — no standalone UI widget.
 */
type DirectBinds = {
  classId:       string; // UUID of ClassRoom  → drives Step 3 skip + auto-fills below
  institutionId: string; // UUID of Institution → auto-filled when classId changes
  campus:        string; // campus.name string  → filtered by institution
  courseId:      string; // UUID of Course      → filtered by classId
};

const EMPTY_DIRECT: DirectBinds = { classId: '', institutionId: '', campus: '', courseId: '' };

// ─────────────────────────────────────────────────────────────────────────────
// Field definitions
// ─────────────────────────────────────────────────────────────────────────────

interface FieldDef {
  key:            keyof ColumnMap;
  label:          string;
  required?:      boolean;
  hint?:          string;
  Icon:           React.FC<{ size?: number; className?: string }>;
  directBindKey?: keyof DirectBinds; // which DirectBinds slot this field exposes
}

interface FieldSection {
  id:     string;
  label:  string;
  accent: 'blue' | 'amber' | 'emerald';
  fields: FieldDef[];
}

const FIELD_SECTIONS: FieldSection[] = [
  {
    id: 'identificacao', label: 'Identificação', accent: 'blue',
    fields: [
      { key: 'name',      label: 'Nome Completo',       required: true, Icon: User },
      { key: 'phone',     label: 'Telefone',                            Icon: Phone },
      { key: 'email',     label: 'E-mail',                              Icon: Mail },
      { key: 'cpf',       label: 'CPF',                                 Icon: Database },
      { key: 'birthDate', label: 'Data de Nascimento',                  Icon: Calendar },
      { key: 'gender',    label: 'Sexo',                                Icon: User },
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
        key: 'campus', label: 'Campus', Icon: Building2,
        hint: 'Campi disponíveis para a instituição do projeto selecionado',
        directBindKey: 'campus',
      },
      {
        key: 'courseRaw', label: 'Curso', Icon: BookOpen,
        directBindKey: 'courseId',
      },
      { key: 'turmaRaw', label: 'Turma / Sala', Icon: Users,
        hint: 'Sub-turma dentro do projeto (ex: Turma A, T1). Vinculada em Etapa 3.',
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

const ALL_FIELDS: FieldDef[] = FIELD_SECTIONS.flatMap(s => s.fields);

// Static step definitions — rendered subset may vary (see visibleSteps below)
const ALL_STEPS = [
  { id: 'upload',   label: 'Upload'   },
  { id: 'mapping',  label: 'Colunas'  },
  { id: 'projects', label: 'Projetos' },
  { id: 'preview',  label: 'Confirmar'},
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientImportModalProps {
  onImport: (data: any[], strategy: 'ignore' | 'overwrite') => void | Promise<void>;
  onClose:  () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientImportModal: React.FC<ClientImportModalProps> = ({ onImport, onClose }) => {
  const { classes, institutions, courses, projectClasses } = useData();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step,           setStep]           = useState<Step>('upload');
  const [fileData,       setFileData]       = useState<any[]>([]);
  const [headers,        setHeaders]        = useState<string[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [isDragging,     setIsDragging]     = useState(false);
  const [columnMap,      setColumnMap]      = useState<ColumnMap>(EMPTY_MAP);
  const [directBinds,    setDirectBinds]    = useState<DirectBinds>(EMPTY_DIRECT);
  const [projectMap,     setProjectMap]     = useState<Record<string, string>>({}); // rawProjectVal → classId
  // Sub-binding maps: outer key = rawProjectVal, inner key = raw column value, inner value = resolved system value
  const [campusMap,      setCampusMap]      = useState<Record<string, Record<string, string>>>({});
  const [courseMap,      setCourseMap]      = useState<Record<string, Record<string, string>>>({});
  const [turmaMap,       setTurmaMap]       = useState<Record<string, Record<string, string>>>({});
  const [importStrategy, setImportStrategy] = useState<'ignore' | 'overwrite'>('ignore');
  const [importing,      setImporting]      = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived: step visibility ───────────────────────────────────────────────

  /**
   * When project is fully resolved via Vínculo Direto (no column), skip Step 3.
   * The Projetos step "Só aparece se o campo Projeto foi mapeado via Coluna da Planilha".
   */
  const skipProjectsStep = directBinds.classId !== '' && columnMap.projectRaw === '';

  const visibleSteps = useMemo(
    () => skipProjectsStep
      ? ALL_STEPS.filter(s => s.id !== 'projects')
      : ALL_STEPS,
    [skipProjectsStep],
  );

  const currentStepIndex = visibleSteps.findIndex(s => s.id === step);

  // ── Derived: unique project values from spreadsheet ───────────────────────

  const uniqueProjectValues = useMemo<string[]>(() => {
    if (!columnMap.projectRaw) return [];
    const vals = fileData
      .map(r => String(r[columnMap.projectRaw] ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(vals)).sort();
  }, [fileData, columnMap.projectRaw]);

  // ── Derived: rows that will actually be imported ───────────────────────────

  const linkedRows = useMemo(() => {
    // No column + direct bind → all rows go to that class
    if (!columnMap.projectRaw && directBinds.classId) return fileData;
    if (!columnMap.projectRaw) return [];
    return fileData.filter(row => {
      const rawVal = String(row[columnMap.projectRaw] ?? '').trim();
      return rawVal && (projectMap[rawVal] || directBinds.classId);
    });
  }, [fileData, columnMap.projectRaw, projectMap, directBinds.classId]);

  const ignoredCount = fileData.length - linkedRows.length;

  // ── Derived: preview groups ────────────────────────────────────────────────

  const previewGroups = useMemo((): Record<string, { classId: string; rows: any[] }> => {
    const groups: Record<string, { classId: string; rows: any[] }> = {};
    for (const row of linkedRows) {
      const rawVal = columnMap.projectRaw
        ? String(row[columnMap.projectRaw] ?? '').trim()
        : '__direct__';
      const classId = (rawVal !== '__direct__' ? projectMap[rawVal] : '') || directBinds.classId;
      if (!groups[rawVal]) groups[rawVal] = { classId, rows: [] };
      groups[rawVal].rows.push(row);
    }
    return groups;
  }, [linkedRows, columnMap.projectRaw, projectMap, directBinds.classId]);

  // ── Derived: direct-bind option lists ─────────────────────────────────────

  /**
   * Campi available for the "Campus" direct bind.
   * Filtered to the selected project's institution; falls back to all if none selected.
   */
  const campusOptions = useMemo<string[]>(() => {
    if (directBinds.classId) {
      const cls  = classes.find(c => c.id === directBinds.classId);
      const inst = cls ? institutions.find(i => i.id === cls.institutionId) : null;
      return inst ? inst.campi.map(c => c.name) : [];
    }
    // No project: aggregate all campi, deduplicated
    const names = new Set<string>();
    institutions.forEach(i => i.campi.forEach(c => names.add(c.name)));
    return Array.from(names).sort();
  }, [classes, institutions, directBinds.classId]);

  /**
   * Courses available for the "Curso" direct bind.
   * Filtered to the selected project's course list; falls back to all.
   */
  const courseOptions = useMemo(() => {
    if (directBinds.classId) {
      const cls = classes.find(c => c.id === directBinds.classId);
      if (cls) return courses.filter(c => cls.courseIds.includes(c.id));
    }
    return [...courses].sort((a, b) => a.name.localeCompare(b.name));
  }, [courses, classes, directBinds.classId]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const canAdvanceFromMapping =
    columnMap.name !== '' &&
    (columnMap.projectRaw !== '' || directBinds.classId !== '');

  const mappedProjectsCount = useMemo(
    () => Object.values(projectMap).filter(Boolean).length,
    [projectMap],
  );

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
        // cellDates: false → keep raw Excel serial numbers; handleBulkImport converts via excelDateToISO
        const wb   = XLSX.read(bstr, { type: 'binary', cellDates: false });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) { alert('A planilha parece estar vazia.'); return; }
        setFileData(data);
        setHeaders(Object.keys(data[0] as object));
        setColumnMap(EMPTY_MAP);
        setDirectBinds(EMPTY_DIRECT);
        setProjectMap({});
        setCampusMap({});
        setCourseMap({});
        setTurmaMap({});
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

  /**
   * Select a project (ClassRoom) as direct bind.
   * Auto-fills institutionId, auto-fills campus if only 1, auto-fills courseId if only 1.
   * Pre-fills projectMap for any already-known unique values.
   */
  const handleDirectBindClass = (classId: string) => {
    if (!classId) {
      setDirectBinds(EMPTY_DIRECT);
      return;
    }
    const cls  = classes.find(c => c.id === classId);
    const inst = cls ? institutions.find(i => i.id === cls.institutionId) : null;

    // Campus: auto-fill if only 1 option
    const instCampi  = inst?.campi ?? [];
    const autoCampus = instCampi.length === 1 ? instCampi[0].name : '';

    // Course: auto-fill if only 1 option
    const clsCourses   = cls ? courses.filter(c => cls.courseIds.includes(c.id)) : [];
    const autoCourseId = clsCourses.length === 1 ? clsCourses[0].id : '';

    setDirectBinds({
      classId,
      institutionId: cls?.institutionId ?? '',
      campus:        autoCampus,
      courseId:      autoCourseId,
    });

    // Pre-fill all already-known project values with this classId
    if (columnMap.projectRaw && uniqueProjectValues.length > 0) {
      setProjectMap(prev => {
        const next = { ...prev };
        uniqueProjectValues.forEach(v => { if (!next[v]) next[v] = classId; });
        return next;
      });
    }
  };

  const setProject = (rawValue: string, classId: string) => {
    setProjectMap(prev => ({ ...prev, [rawValue]: classId }));
    // Reset sub-bindings when the project selection changes
    setCampusMap(prev => { const n = { ...prev }; delete n[rawValue]; return n; });
    setCourseMap(prev => { const n = { ...prev }; delete n[rawValue]; return n; });
    setTurmaMap(prev  => { const n = { ...prev }; delete n[rawValue]; return n; });
  };

  const setCampusBind = (projectRaw: string, rawVal: string, resolved: string) =>
    setCampusMap(prev => ({ ...prev, [projectRaw]: { ...prev[projectRaw], [rawVal]: resolved } }));

  const setCourseBind = (projectRaw: string, rawVal: string, resolved: string) =>
    setCourseMap(prev => ({ ...prev, [projectRaw]: { ...prev[projectRaw], [rawVal]: resolved } }));

  const setTurmaBind = (projectRaw: string, rawVal: string, resolved: string) =>
    setTurmaMap(prev => ({ ...prev, [projectRaw]: { ...prev[projectRaw], [rawVal]: resolved } }));

  const goBack = () => {
    if (step === 'preview' && skipProjectsStep) { setStep('mapping'); return; }
    const idx = visibleSteps.findIndex(s => s.id === step);
    if (idx > 0) setStep(visibleSteps[idx - 1].id as Step);
  };

  const goNextFromMapping = () => {
    // Pre-fill project map from direct bind for any known values
    if (directBinds.classId && columnMap.projectRaw && uniqueProjectValues.length > 0) {
      setProjectMap(prev => {
        const next = { ...prev };
        uniqueProjectValues.forEach(v => { if (!next[v]) next[v] = directBinds.classId; });
        return next;
      });
    }
    // Skip Step 3 when Projeto was set exclusively via Vínculo Direto
    setStep(skipProjectsStep ? 'preview' : 'projects');
  };

  // ── Confirm import ─────────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    setImporting(true);
    const cleanRows: any[] = linkedRows.map(row => {
      const rawProjectVal = columnMap.projectRaw ? String(row[columnMap.projectRaw] ?? '').trim() : '';
      const classId       = (rawProjectVal ? projectMap[rawProjectVal] : '') || directBinds.classId;
      const cls           = classes.find(c => c.id === classId);

      // campus: direct bind > step-3 mapping > raw column value
      const rawCampusVal = columnMap.campus ? String(row[columnMap.campus] ?? '').trim() : '';
      const campusVal    = directBinds.campus
        || campusMap[rawProjectVal]?.[rawCampusVal]
        || rawCampusVal;

      // courseId: direct bind > step-3 mapping > single-course auto-resolve > raw (may already be UUID)
      const rawCourseVal = columnMap.courseRaw ? String(row[columnMap.courseRaw] ?? '').trim() : '';
      const courseIdVal  =
        directBinds.courseId
        || courseMap[rawProjectVal]?.[rawCourseVal]
        || (cls?.courseIds.length === 1 ? cls.courseIds[0] : '')
        || rawCourseVal;

      // projectClassId: step-3 mapping only (no direct bind)
      const rawTurmaVal    = columnMap.turmaRaw ? String(row[columnMap.turmaRaw] ?? '').trim() : '';
      const projectClassId = turmaMap[rawProjectVal]?.[rawTurmaVal] || '';

      return {
        name:          columnMap.name      ? String(row[columnMap.name]      ?? '').trim() : '',
        phone:         columnMap.phone     ? String(row[columnMap.phone]     ?? '').trim() : '',
        email:         columnMap.email     ? String(row[columnMap.email]     ?? '').trim() : '',
        cpf:           columnMap.cpf       ? String(row[columnMap.cpf]       ?? '').trim() : '',
        birthDate:     columnMap.birthDate ? row[columnMap.birthDate] ?? null : null, // raw → excelDateToISO in handleBulkImport
        gender:        columnMap.gender    ? String(row[columnMap.gender]    ?? '').trim() : '',
        tags:          columnMap.tags      ? String(row[columnMap.tags]      ?? '').trim() : '',
        shift:         columnMap.shift     ? String(row[columnMap.shift]     ?? '').trim() : '',
        campus:        campusVal,
        classId,
        institutionId: cls?.institutionId ?? directBinds.institutionId,
        courseId:      courseIdVal,
        projectClassId: projectClassId || undefined,
      };
    }).filter(r => r.name);

    try {
      await onImport(cleanRows, importStrategy);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────

  /** Returns up to 3 distinct non-empty sample values from a spreadsheet column. */
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

  const accentClasses = (accent: FieldSection['accent']) => ({
    border: accent === 'amber' ? 'border-amber-200' : accent === 'emerald' ? 'border-emerald-200' : 'border-blue-200',
    text:   accent === 'amber' ? 'text-amber-700'   : accent === 'emerald' ? 'text-emerald-700'   : 'text-blue-700',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 1 — Upload
  // ─────────────────────────────────────────────────────────────────────────

  const renderUpload = () => (
    <div className="animate-in fade-in">
      {/* Drop zone */}
      <div
        onDragOver={e  => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
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
          isDragging ? 'scale-110 text-amber-500 bg-white shadow-xl' : 'bg-slate-50 text-slate-300 group-hover:text-amber-500'
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
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />
      </div>

      {/* Steps preview */}
      <div className="mt-8 bg-slate-50 rounded-3xl p-6 space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O que acontece nas próximas etapas:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { n: '2', label: 'Colunas',   desc: 'Mapeie cada coluna da planilha para um campo do sistema. Projeto, Campus e Curso aceitam vínculo direto com valor fixo.' },
            { n: '3', label: 'Projetos',  desc: 'Cada valor de "Projeto" da planilha é vinculado a uma turma real. Passo pulado se Projeto foi definido via vínculo direto.' },
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 2 — Column mapping
  // ─────────────────────────────────────────────────────────────────────────

  const renderMapping = () => {
    const totalMapped = ALL_FIELDS.filter(f => columnMap[f.key] !== '').length;
    const totalDirect = [directBinds.classId, directBinds.campus, directBinds.courseId].filter(Boolean).length;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-3">
          <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-bold text-amber-700 leading-relaxed">
            Para cada campo, selecione a <strong>coluna da planilha</strong> correspondente.
            Campos com <Zap size={10} className="inline text-amber-500" /> também aceitam um <strong>Vínculo Direto</strong> —
            valor fixo do sistema aplicado a <em>todas</em> as linhas.
            Quando o vínculo direto está ativo, a coluna da planilha fica desabilitada.
          </p>
        </div>

        {/* Sections */}
        {FIELD_SECTIONS.map(section => {
          const { border, text } = accentClasses(section.accent);
          return (
            <div key={section.id} className="space-y-3">
              {/* Section divider */}
              <div className="flex items-center gap-2">
                <div className={`h-px flex-1 border-t ${border}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 ${text}`}>{section.label}</span>
                <div className={`h-px flex-1 border-t ${border}`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {section.fields.map(field => {
                  const { key, label, required, hint, Icon, directBindKey } = field;
                  const colValue      = columnMap[key];
                  const isMapped      = colValue !== '';
                  const directVal     = directBindKey ? directBinds[directBindKey] : '';
                  const hasDirectBind = !!directVal;
                  const sample        = previewCol(colValue);

                  return (
                    <div
                      key={key}
                      className={`rounded-[1.5rem] border p-5 space-y-3 transition-all ${
                        hasDirectBind
                          ? 'border-amber-300 bg-amber-50/50'
                          : required && !isMapped
                          ? 'border-amber-200 bg-amber-50/30'
                          : isMapped
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      {/* Field header */}
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
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
                          <span className="text-[8px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-lg uppercase tracking-wide flex-shrink-0 whitespace-nowrap">
                            Valor Fixo Ativo
                          </span>
                        )}
                        {!hasDirectBind && isMapped && (
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Select 1: Coluna da Planilha */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coluna da Planilha</p>
                        <select
                          disabled={hasDirectBind}
                          value={colValue}
                          onChange={e => setCol(key, e.target.value)}
                          className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-amber-500 ${
                            hasDirectBind
                              ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                              : isMapped
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="">— Não importar —</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Select 2: Vínculo Direto — only for fields with directBindKey */}
                      {directBindKey && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                            <Zap size={8} /> Vínculo Direto (Sistema)
                          </p>

                          {/* Projeto → classId */}
                          {directBindKey === 'classId' && (
                            <select
                              value={directVal}
                              onChange={e => handleDirectBindClass(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                hasDirectBind
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
                              }`}
                            >
                              <option value="">— Usar coluna da planilha —</option>
                              {classes
                                .slice().sort((a, b) => a.name.localeCompare(b.name))
                                .map(cls => (
                                  <option key={cls.id} value={cls.id}>{classLabel(cls)}</option>
                                ))}
                            </select>
                          )}

                          {/* Campus → campus.name string */}
                          {directBindKey === 'campus' && (
                            <select
                              value={directVal}
                              onChange={e => setDirectBinds(prev => ({ ...prev, campus: e.target.value }))}
                              className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                hasDirectBind
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
                              }`}
                            >
                              <option value="">— Usar coluna da planilha —</option>
                              {campusOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          )}

                          {/* Curso → courseId UUID */}
                          {directBindKey === 'courseId' && (
                            <select
                              value={directVal}
                              onChange={e => setDirectBinds(prev => ({ ...prev, courseId: e.target.value }))}
                              className={`w-full border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                hasDirectBind
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
                              }`}
                            >
                              <option value="">— Usar coluna da planilha —</option>
                              {courseOptions.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          )}

                          {/* Auto-fill hint */}
                          {directBindKey === 'classId' && directVal && (() => {
                            const cls  = classes.find(c => c.id === directVal);
                            const inst = cls ? institutions.find(i => i.id === cls.institutionId) : null;
                            const clsCourses = cls ? courses.filter(c => cls.courseIds.includes(c.id)) : [];
                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {inst && (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg uppercase">
                                    <Building2 size={7} /> {inst.name}
                                  </span>
                                )}
                                {clsCourses.map(c => (
                                  <span key={c.id} className="inline-flex items-center gap-1 text-[8px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg uppercase">
                                    <BookOpen size={7} /> {c.name}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Sample values preview */}
                      {!hasDirectBind && isMapped && sample && (
                        <p className="text-[9px] text-slate-400 font-bold truncate">
                          <span className="text-slate-300 uppercase tracking-wider">Ex: </span>{sample}
                        </p>
                      )}
                      {!hasDirectBind && !isMapped && hint && (
                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">{hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer counter */}
        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-2">
          {totalMapped} coluna{totalMapped !== 1 ? 's' : ''} mapeada{totalMapped !== 1 ? 's' : ''}
          {totalDirect > 0 && (
            <span className="text-amber-500">
              {' '}· {totalDirect} vínculo{totalDirect !== 1 ? 's' : ''} direto{totalDirect !== 1 ? 's' : ''} ativo{totalDirect !== 1 ? 's' : ''}
            </span>
          )}
          {skipProjectsStep && (
            <span className="text-emerald-500"> · Etapa "Projetos" será pulada</span>
          )}
        </p>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 3 — Vincular Projetos
  // Only shown when projectRaw column is mapped (skipProjectsStep === false)
  // ─────────────────────────────────────────────────────────────────────────

  const renderProjects = () => {
    const hasDirectClass = !!directBinds.classId;
    const directClass    = hasDirectClass ? classes.find(c => c.id === directBinds.classId) : null;
    const directInst     = directClass ? institutions.find(i => i.id === directClass.institutionId) : null;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

        {/* Stats bar */}
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-6">
          {[
            { label: 'Registros na planilha', value: fileData.length,              color: 'text-white'    },
            { label: 'Projetos únicos',        value: uniqueProjectValues.length,  color: 'text-white'    },
            {
              label: 'Projetos vinculados',
              value: `${mappedProjectsCount} / ${uniqueProjectValues.length}`,
              color: mappedProjectsCount === uniqueProjectValues.length && uniqueProjectValues.length > 0
                ? 'text-emerald-400' : 'text-amber-400',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Vínculo direto active banner */}
        {hasDirectClass && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-3">
            <Zap size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Vínculo Direto Ativo como Padrão</p>
              <p className="text-xs font-bold text-amber-700 mt-0.5 leading-relaxed">
                Todos os registros sem vínculo individual abaixo serão atribuídos ao projeto{' '}
                <strong>{directClass?.name}</strong>
                {directInst && <span> — {directInst.name}</span>}.
                Selecione um projeto diferente em qualquer card para sobrescrever o padrão.
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex items-start gap-3">
          <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-bold text-blue-700 leading-relaxed">
            Para cada valor encontrado na coluna <strong>"{columnMap.projectRaw}"</strong>,
            vincule ao projeto correspondente no CRM.
            Linhas sem vínculo{!hasDirectClass ? ' serão <strong>ignoradas</strong>.' : ' usarão o padrão acima.'}
          </p>
        </div>

        {/* Project cards */}
        {uniqueProjectValues.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-slate-300">
            <AlertCircle size={36} />
            <p className="text-xs font-black uppercase tracking-widest">
              Nenhum valor encontrado na coluna "{columnMap.projectRaw}"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueProjectValues.map(rawValue => {
              const selectedClassId = projectMap[rawValue] ?? '';
              const resolved        = selectedClassId ? classes.find(c => c.id === selectedClassId) : null;
              const fallback        = !selectedClassId && hasDirectClass ? directClass : null;
              const displayClass    = resolved ?? fallback;
              const displayInst     = displayClass ? institutions.find(i => i.id === displayClass.institutionId) : null;
              const displayCourses  = displayClass ? courses.filter(c => displayClass.courseIds.includes(c.id)).map(c => c.name).join(', ') : null;
              const displayCampi    = displayInst ? displayInst.campi.map(c => c.name).join(', ') : null;
              const rowCount        = fileData.filter(r => String(r[columnMap.projectRaw] ?? '').trim() === rawValue).length;
              const isDefault = !selectedClassId && hasDirectClass;
              const isLinked  = !!selectedClassId;

              // Sub-binding: unique values of each sub-column for rows of this project
              const rowsForProject = fileData.filter(r => String(r[columnMap.projectRaw] ?? '').trim() === rawValue);

              const uniqueCampusVals: string[] = columnMap.campus
                ? Array.from(new Set<string>(rowsForProject.map(r => String(r[columnMap.campus] ?? '').trim()).filter((v): v is string => v !== ''))).sort()
                : [];
              const uniqueCourseVals: string[] = columnMap.courseRaw
                ? Array.from(new Set<string>(rowsForProject.map(r => String(r[columnMap.courseRaw] ?? '').trim()).filter((v): v is string => v !== ''))).sort()
                : [];
              const uniqueTurmaVals: string[] = columnMap.turmaRaw
                ? Array.from(new Set<string>(rowsForProject.map(r => String(r[columnMap.turmaRaw] ?? '').trim()).filter((v): v is string => v !== ''))).sort()
                : [];

              const hasSubBindings = (isLinked || isDefault) && displayClass && (
                uniqueCampusVals.length > 0 || uniqueCourseVals.length > 0 || uniqueTurmaVals.length > 0
              );

              // Options for sub-binding selects
              const instCampiOptions   = displayInst ? displayInst.campi.map(c => c.name) : [];
              const clsCoursesOptions  = displayClass ? courses.filter(c => displayClass.courseIds.includes(c.id)) : [];
              const clsProjectClasses  = displayClass ? projectClasses.filter(pc => pc.projectId === displayClass.id) : [];

              return (
                <div
                  key={rawValue}
                  className={`rounded-[1.5rem] border transition-all ${
                    isLinked  ? 'border-emerald-200 bg-emerald-50/20'
                    : isDefault ? 'border-amber-200 bg-amber-50/20'
                    :             'border-slate-200 bg-white hover:border-amber-200'
                  }`}
                >
                  {/* ── Project header row ── */}
                  <div className="p-5 flex items-start gap-4">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isLinked  ? 'bg-emerald-100 text-emerald-600'
                      : isDefault ? 'bg-amber-100 text-amber-600'
                      :             'bg-slate-100 text-slate-400'
                    }`}>
                      {isLinked ? <CheckCircle2 size={20} /> : isDefault ? <Zap size={20} /> : <GraduationCap size={20} />}
                    </div>

                    {/* Raw value + badges */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Valor na planilha · {rowCount} linha{rowCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm font-black text-slate-900 truncate">{rawValue}</p>
                      {isDefault && (
                        <p className="text-[9px] font-bold text-amber-600 mt-0.5">Padrão: {directClass?.name}</p>
                      )}
                      {displayClass && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {displayInst && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg uppercase">
                              <Building2 size={8} /> {displayInst.name}
                            </span>
                          )}
                          {displayCourses && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg uppercase">
                              <BookOpen size={8} /> {displayCourses}
                            </span>
                          )}
                          {displayCampi && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                              <Building2 size={8} /> {displayCampi}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Project select */}
                    <div className="flex-shrink-0 w-72">
                      <select
                        value={selectedClassId}
                        onChange={e => setProject(rawValue, e.target.value)}
                        className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                          isLinked  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : isDefault ? 'bg-amber-50 border-amber-200 text-amber-700'
                          :             'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                        }`}
                      >
                        <option value="">
                          {isDefault ? `— Padrão: ${directClass?.name} —` : '— Não vincular (ignorar) —'}
                        </option>
                        {classes
                          .slice().sort((a, b) => a.name.localeCompare(b.name))
                          .map(cls => (
                            <option key={cls.id} value={cls.id}>{classLabel(cls)}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* ── Sub-binding sections (campus / curso / turma) ── */}
                  {hasSubBindings && (
                    <div className="border-t border-dashed border-slate-200 mx-5 mb-5 pt-4 space-y-4">

                      {/* CAMPUS */}
                      {uniqueCampusVals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 size={10} className="text-slate-400" /> Campus
                            {instCampiOptions.length === 0 && (
                              <span className="text-rose-400 font-bold normal-case tracking-normal ml-1">
                                — instituição sem campi cadastrados
                              </span>
                            )}
                          </p>
                          <div className="space-y-1.5">
                            {uniqueCampusVals.map(campusRaw => {
                              const resolved = campusMap[rawValue]?.[campusRaw] ?? '';
                              return (
                                <div key={campusRaw} className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5 min-w-[140px] truncate shrink-0">
                                    "{campusRaw}"
                                  </span>
                                  <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                                  <select
                                    value={resolved}
                                    onChange={e => setCampusBind(rawValue, campusRaw, e.target.value)}
                                    className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                      resolved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <option value="">— Não vincular —</option>
                                    {instCampiOptions.map(name => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                  </select>
                                  {resolved && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* CURSO */}
                      {uniqueCourseVals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen size={10} className="text-slate-400" /> Curso
                            {clsCoursesOptions.length === 0 && (
                              <span className="text-rose-400 font-bold normal-case tracking-normal ml-1">
                                — projeto sem cursos vinculados
                              </span>
                            )}
                          </p>
                          <div className="space-y-1.5">
                            {uniqueCourseVals.map(courseRaw => {
                              const resolved = courseMap[rawValue]?.[courseRaw] ?? '';
                              return (
                                <div key={courseRaw} className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5 min-w-[140px] truncate shrink-0">
                                    "{courseRaw}"
                                  </span>
                                  <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                                  <select
                                    value={resolved}
                                    onChange={e => setCourseBind(rawValue, courseRaw, e.target.value)}
                                    className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                      resolved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <option value="">— Não vincular —</option>
                                    {clsCoursesOptions.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                  {resolved && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TURMA (project_classes) */}
                      {uniqueTurmaVals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Users size={10} className="text-slate-400" /> Turma / Sala
                            {clsProjectClasses.length === 0 && (
                              <span className="text-amber-500 font-bold normal-case tracking-normal ml-1">
                                — nenhuma sub-turma cadastrada para este projeto
                              </span>
                            )}
                          </p>
                          <div className="space-y-1.5">
                            {uniqueTurmaVals.map(turmaRaw => {
                              const resolved = turmaMap[rawValue]?.[turmaRaw] ?? '';
                              return (
                                <div key={turmaRaw} className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5 min-w-[140px] truncate shrink-0">
                                    "{turmaRaw}"
                                  </span>
                                  <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                                  <select
                                    value={resolved}
                                    disabled={clsProjectClasses.length === 0}
                                    onChange={e => setTurmaBind(rawValue, turmaRaw, e.target.value)}
                                    className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                                      resolved ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : clsProjectClasses.length === 0 ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
                                      : 'bg-white border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <option value="">— Não vincular —</option>
                                    {clsProjectClasses.map(pc => (
                                      <option key={pc.id} value={pc.id}>{pc.name}</option>
                                    ))}
                                  </select>
                                  {resolved && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Hint: project not linked yet, sub-bindings unavailable */}
                  {!isLinked && !isDefault && (columnMap.campus || columnMap.courseRaw || columnMap.turmaRaw) && (
                    <div className="px-5 pb-4">
                      <p className="text-[9px] font-bold text-slate-400 italic">
                        Vincule o projeto acima para habilitar os vínculos de Campus, Curso e Turma.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 4 — Preview & Confirm
  // ─────────────────────────────────────────────────────────────────────────

  const renderPreview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

      {/* Stats */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-6">
        {[
          { label: 'Total na planilha', value: fileData.length,   color: 'text-white'    },
          { label: 'Serão importados',  value: linkedRows.length, color: 'text-emerald-400' },
          { label: 'Serão ignorados',   value: ignoredCount,      color: ignoredCount > 0 ? 'text-amber-400' : 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Duplicate policy */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Política para duplicados (mesmo telefone, e-mail ou CPF)
        </p>
        <div className="flex gap-3">
          {([
            { value: 'ignore',    label: 'Ignorar duplicados',  desc: 'Clientes já existentes não são alterados' },
            { value: 'overwrite', label: 'Atualizar existentes', desc: 'Dados da planilha sobrescrevem o cadastro atual' },
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
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  importStrategy === opt.value ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                }`}>
                  {importStrategy === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{opt.label}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{opt.desc}</p>
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
            ⚠️ Sem projeto vinculado —{' '}
            <strong>{ignoredCount} linha{ignoredCount !== 1 ? 's' : ''}</strong>{' '}
            {ignoredCount !== 1 ? 'serão ignoradas' : 'será ignorada'} na importação.
          </p>
        </div>
      )}

      {/* No rows at all */}
      {linkedRows.length === 0 && (
        <div className="h-32 flex flex-col items-center justify-center gap-3 text-slate-300">
          <AlertCircle size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Nenhuma linha para importar</p>
        </div>
      )}

      {/* Grouped client list */}
      {linkedRows.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes por projeto</p>
          {(Object.entries(previewGroups) as [string, { classId: string; rows: any[] }][]).map(([rawVal, { classId, rows }]) => {
            const cls  = classes.find(c => c.id === classId);
            const inst = cls ? institutions.find(i => i.id === cls.institutionId) : null;
            return (
              <div key={rawVal} className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <GraduationCap size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{cls?.name ?? rawVal}</p>
                    {inst && <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">— {inst.name}</span>}
                  </div>
                  <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg uppercase flex-shrink-0 ml-2">
                    <Users size={9} className="inline mr-1" />
                    {rows.length} cliente{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {rows.slice(0, 5).map((row, i) => {
                    const name  = columnMap.name  ? String(row[columnMap.name]  ?? '').trim() : '—';
                    const phone = columnMap.phone ? String(row[columnMap.phone] ?? '').trim() : '';
                    return (
                      <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700 truncate">{name || '—'}</p>
                        {phone && <p className="text-[10px] font-bold text-slate-400 flex-shrink-0 ml-2">{phone}</p>}
                      </div>
                    );
                  })}
                  {rows.length > 5 && (
                    <div className="px-5 py-2 bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
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

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                Importar Clientes
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Importação guiada · {visibleSteps.length} etapas
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

        {/* Stepper */}
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {visibleSteps.map((s, idx) => {
            const isCurrent = s.id === step;
            const isDone    = idx < currentStepIndex;
            const isFuture  = !isCurrent && !isDone;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 flex-shrink-0 transition-opacity ${isFuture ? 'opacity-35' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCurrent ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                    : isDone   ? 'bg-emerald-500 text-white'
                    :            'bg-slate-200 text-slate-400'
                  }`}>
                    {isDone ? <Check size={13} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isCurrent ? 'text-amber-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {idx < visibleSteps.length - 1 && (
                  <ChevronRight size={13} className="text-slate-200 flex-shrink-0 mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
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

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-900 flex items-center justify-between flex-shrink-0">
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
                    {!columnMap.name
                      ? 'Mapeie o campo Nome para continuar'
                      : 'Mapeie Projeto (coluna ou vínculo direto) para continuar'}
                  </p>
                )}
                <button
                  disabled={!canAdvanceFromMapping}
                  onClick={goNextFromMapping}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${
                    canAdvanceFromMapping
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {skipProjectsStep ? 'Revisar Importação' : 'Vincular Projetos'} <ArrowRight size={15} />
                </button>
              </>
            )}

            {step === 'projects' && (
              <>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  {mappedProjectsCount} de {uniqueProjectValues.length} vinculado{uniqueProjectValues.length !== 1 ? 's' : ''}
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
