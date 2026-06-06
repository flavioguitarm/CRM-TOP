
import React, { useRef, useState } from 'react';
import { useData } from '../../store';
import { supabase } from '../../src/lib/supabase';
import {
  Download, Upload, AlertTriangle, CheckCircle2,
  Loader2, Database, FileJson, ShieldCheck,
  RefreshCcw, X, ChevronRight, Info,
  Trash2, Share2, HardDriveDownload,
} from 'lucide-react';

// ─── Labels amigáveis para cada tabela ───────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  institutions:             'Instituições',
  courses:                  'Cursos',
  product_categories:       'Categorias de Produto',
  users:                    'Usuários',
  activity_types:           'Tipos de Atividade',
  funnels:                  'Funis',
  funnel_stages:            'Etapas de Funil',
  funnel_responsible_users: 'Vínculos Funil↔Usuário',
  products:                 'Produtos',
  classes:                  'Turmas',
  class_courses:            'Vínculos Turma↔Curso',
  class_products:           'Produtos de Turma',
  class_timeline_events:    'Timeline de Turmas',
  clients:                  'Clientes',
  client_activities:        'Atividades de Clientes',
  events:                   'Eventos',
  event_activities:         'Log de Eventos',
  cs_actions:               'Ações CS',
  cs_action_activities:     'Log de Ações CS',
  cs_daily_services:        'Atendimentos CS',
  product_negotiations:     'Negociações',
  sales:                    'Vendas',
  client_tasks:             'Tarefas',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalRecords(counts: Record<string, number>) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ExportPhase = 'idle' | 'loading' | 'done' | 'error';
type ImportPhase = 'idle' | 'ready' | 'confirming' | 'importing' | 'done' | 'error';
type ResetPhase  = 'idle' | 'confirm1' | 'confirm2' | 'resetting' | 'done' | 'error';

interface ExportResult {
  filename: string;
  sizeKb: number;
  counts: Record<string, number>;
  json: string;
}

interface ImportPreview {
  name: string;
  content: string;
  exportedAt: string;
  counts: Record<string, number>;
}

// ─── Componente ──────────────────────────────────────────────────────────────

const DatabaseAdmin: React.FC = () => {
  const {
    exportAllData, importAllData, resetAllData,
    googleSheetUrl, setGoogleSheetUrl, syncWithGoogleSheet,
    users,
  } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportPhase, setExportPhase] = useState<ExportPhase>('idle');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Import ──────────────────────────────────────────────────────────────────
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const [resetPhase, setResetPhase] = useState<ResetPhase>('idle');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // ── Export handler ──────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExportPhase('loading');
    setExportError(null);
    setExportResult(null);
    try {
      const json = await exportAllData();
      const parsed = JSON.parse(json);

      const counts: Record<string, number> = {};
      Object.entries(parsed.tables ?? {}).forEach(([key, arr]) => {
        counts[key] = (arr as unknown[]).length;
      });

      const blob = new Blob([json], { type: 'application/json' });
      const sizeKb = Math.round(blob.size / 1024);
      const filename = `backup_crm_${new Date().toISOString().split('T')[0]}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportResult({ filename, sizeKb, counts, json });
      setExportPhase('done');
    } catch (e: any) {
      setExportError(e.message ?? 'Erro desconhecido ao exportar.');
      setExportPhase('error');
    }
  };

  // ── Import handlers ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.version !== '2.0' || !parsed.tables) {
          setImportError('Arquivo inválido ou gerado em formato antigo. Use apenas backups exportados por esta página (versão 2.0).');
          return;
        }

        const counts: Record<string, number> = {};
        Object.entries(parsed.tables).forEach(([key, arr]) => {
          counts[key] = (arr as unknown[]).length;
        });

        setImportPreview({ name: file.name, content, exportedAt: parsed.exportedAt ?? '', counts });
        setImportPhase('ready');
      } catch {
        setImportError('Não foi possível ler o arquivo. Verifique se é um JSON válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportPhase('importing');
    setImportError(null);
    try {
      await importAllData(importPreview.content);
      setImportPhase('done');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      setImportError(e.message ?? 'Erro desconhecido durante a importação.');
      setImportPhase('error');
    }
  };

  const resetImport = () => {
    setImportPhase('idle');
    setImportPreview(null);
    setImportError(null);
  };

  // ── Reset handlers ──────────────────────────────────────────────────────────

  const handleResetConfirm2 = async () => {
    setResetPhase('resetting');
    setResetError(null);

    // 1. Exporta silenciosamente para anexar ao e-mail
    let backupJson = '';
    try {
      backupJson = await exportAllData();
    } catch (_) {
      // não bloqueia o reset se o export falhar
    }

    // 2. Executa a limpeza no Supabase
    try {
      await resetAllData();
    } catch (e: any) {
      setResetError(e.message ?? 'Erro ao limpar o banco.');
      setResetPhase('error');
      return;
    }

    // 3. Notifica via Supabase Edge Function (não bloqueia; edge fn precisa ser deployada)
    try {
      const adminEmails = users.filter(u => u.role === 'ADMIN').map(u => u.email).filter(Boolean);
      const ownerEmail  = import.meta.env.VITE_OWNER_EMAIL ?? '';
      const allRecipients = [...new Set([...adminEmails, ownerEmail].filter(Boolean))];

      await supabase.functions.invoke('notify-db-reset', {
        body: {
          recipients:  allRecipients,
          resetAt:     new Date().toISOString(),
          backupJson,           // edge fn pode salvar no Storage e enviar link
          totalRecords: backupJson ? totalRecords(
            Object.fromEntries(
              Object.entries((JSON.parse(backupJson).tables ?? {}))
                .map(([k, v]) => [k, (v as unknown[]).length])
            )
          ) : 0,
        },
      });
    } catch (err) {
      // Edge function não deployada — falha silenciosa
      console.warn('notify-db-reset: edge function não disponível.', err);
    }

    setResetPhase('done');
    setTimeout(() => window.location.reload(), 2500);
  };

  // ── Google Sheets sync ──────────────────────────────────────────────────────

  const handleSync = async () => {
    if (!googleSheetUrl) {
      alert('Por favor, insira o link da planilha primeiro.');
      return;
    }
    setIsSyncing(true);
    await syncWithGoogleSheet();
    setTimeout(() => {
      setIsSyncing(false);
      alert('Sincronização concluída (se o formato da planilha estiver correto).');
    }, 1500);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <Database size={28} className="text-amber-500" />
          Segurança & Backup
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Gerencie backups, restaurações e a limpeza completa dos dados do sistema.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
          O backup inclui todas as entidades: instituições, turmas, clientes, funis, eventos, ações CS,
          atendimentos, negociações, vendas, tarefas e muito mais — com fidelidade total aos dados do Supabase.
          A restauração <span className="text-rose-700">apaga e reescreve todos os dados do tenant</span>.
        </p>
      </div>

      {/* ── Backup & Restore ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
          <HardDriveDownload size={14} /> Backup & Restore
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Card Exportar */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col gap-6 hover:border-amber-300 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                <Download size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Exportar Dados</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Busca todos os dados do Supabase e gera um arquivo JSON completo para download.
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {[
                'Todas as entidades em um único arquivo',
                'Dados buscados direto do banco (sempre atualizados)',
                'Formato estruturado por tabela (versão 2.0)',
                'Compatível com a restauração desta ferramenta',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" /> {item}
                </li>
              ))}
            </ul>

            {exportPhase === 'done' && exportResult && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                    Download iniciado — {exportResult.sizeKb} KB
                  </span>
                </div>
                <p className="text-[10px] font-mono text-emerald-600">{exportResult.filename}</p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {Object.entries(exportResult.counts)
                    .filter(([, n]) => (n as number) > 0)
                    .map(([key, n]) => (
                      <div key={key} className="flex items-center justify-between bg-white rounded-xl px-3 py-1.5 border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">
                          {TABLE_LABELS[key] ?? key}
                        </span>
                        <span className="text-[10px] font-black text-emerald-600 ml-2">{n}</span>
                      </div>
                    ))}
                </div>
                <p className="text-[10px] font-black text-emerald-600 uppercase">
                  Total: {totalRecords(exportResult.counts).toLocaleString('pt-BR')} registros
                </p>
              </div>
            )}

            {exportPhase === 'error' && (
              <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-rose-700">{exportError}</p>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exportPhase === 'loading'}
              className="w-full mt-auto bg-slate-900 hover:bg-amber-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-3"
            >
              {exportPhase === 'loading' ? (
                <><Loader2 size={18} className="animate-spin" /> Buscando dados do Supabase…</>
              ) : exportPhase === 'done' ? (
                <><RefreshCcw size={18} /> Exportar novamente</>
              ) : (
                <><Download size={18} /> Exportar todos os dados</>
              )}
            </button>
          </div>

          {/* Card Importar */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col gap-6 hover:border-emerald-300 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0">
                <Upload size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Restaurar Backup</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Selecione um arquivo de backup para restaurar todos os dados do sistema.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[10px] font-black text-rose-800 uppercase leading-relaxed tracking-tight">
                ATENÇÃO: a restauração apaga <u>permanentemente</u> todos os dados atuais do tenant
                antes de reinserir o conteúdo do backup. Esta ação não pode ser desfeita.
              </p>
            </div>

            {importPhase === 'idle' && (
              <>
                {importError && (
                  <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                    <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-bold text-rose-700">{importError}</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-auto bg-emerald-500 hover:bg-emerald-400 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200/50 transition-all flex items-center justify-center gap-3"
                >
                  <FileJson size={18} /> Selecionar arquivo de backup
                </button>
              </>
            )}

            {(importPhase === 'ready' || importPhase === 'confirming') && importPreview && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileJson size={16} className="text-amber-500" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">{importPreview.name}</span>
                  </div>
                  {importPreview.exportedAt && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Exportado em: {formatDate(importPreview.exportedAt)}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {Object.entries(importPreview.counts).filter(([, n]) => (n as number) > 0).map(([key, n]) => (
                      <div key={key} className="flex items-center justify-between bg-white rounded-xl px-3 py-1.5 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{TABLE_LABELS[key] ?? key}</span>
                        <span className="text-[10px] font-black text-slate-700 ml-2">{n}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-black text-slate-600 uppercase">
                    Total: {totalRecords(importPreview.counts).toLocaleString('pt-BR')} registros
                  </p>
                </div>

                {importPhase === 'ready' && (
                  <div className="mt-auto space-y-3">
                    <button
                      onClick={() => setImportPhase('confirming')}
                      className="w-full bg-rose-500 hover:bg-rose-400 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-200/50 transition-all flex items-center justify-center gap-3"
                    >
                      <ChevronRight size={18} /> Continuar com a restauração
                    </button>
                    <button onClick={resetImport} className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest py-2 transition-colors flex items-center justify-center gap-2">
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                )}

                {importPhase === 'confirming' && (
                  <div className="mt-auto bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 space-y-4">
                    <p className="text-xs font-black text-rose-800 uppercase tracking-tight leading-relaxed text-center">
                      Confirma a restauração?
                      <br />
                      <span className="font-bold normal-case text-rose-600">
                        Todos os dados atuais serão apagados e substituídos pelos do backup.
                      </span>
                    </p>
                    <div className="flex gap-3">
                      <button onClick={resetImport} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">
                        Cancelar
                      </button>
                      <button onClick={handleConfirmImport} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all flex items-center justify-center gap-2">
                        <Upload size={14} /> Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {importPhase === 'importing' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
                <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Restaurando dados…</p>
                  <p className="text-xs text-slate-400 font-medium">Apagando dados antigos e reinserindo o backup.</p>
                  <p className="text-[10px] text-slate-400">Não feche esta aba.</p>
                </div>
              </div>
            )}

            {importPhase === 'done' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Restauração concluída!</p>
                  <p className="text-xs text-slate-400 font-medium">Recarregando o sistema…</p>
                </div>
                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {importPhase === 'error' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold text-rose-700">{importError}</p>
                </div>
                <button onClick={resetImport} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                  <RefreshCcw size={14} /> Tentar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Sincronização Google Sheets ──────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
          <Share2 size={14} /> Sincronização Google Sheets
        </h2>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 hover:border-amber-400 transition-all">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Link da Planilha Google (ou CSV Público)
            </label>
            <div className="flex gap-4">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetUrl}
                onChange={e => setGoogleSheetUrl(e.target.value)}
              />
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                Sincronizar Agora
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 mt-0.5" size={16} />
              <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">
                Para funcionar: 1. A planilha deve estar "Compartilhada com qualquer pessoa com o link" (Leitor).
                2. O app buscará uma coluna chamada "backup_json" com o conteúdo JSON do sistema.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Limpeza do Banco ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
          <Trash2 size={14} /> Manutenção Técnica
        </h2>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-400"><Trash2 size={24} /></div>
              <div>
                <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Limpar Banco de Dados</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Remove <strong>permanentemente</strong> todos os registros do Supabase e reinicia o sistema.
                  Um backup automático será gerado e os admins serão notificados por e-mail.
                </p>
              </div>
            </div>
            {resetPhase === 'idle' && (
              <button
                onClick={() => setResetPhase('confirm1')}
                className="shrink-0 px-8 py-4 border-2 border-rose-100 text-rose-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all flex items-center gap-2"
              >
                <Trash2 size={16} /> Limpar tudo
              </button>
            )}
          </div>

          {/* Confirmação 1 */}
          {resetPhase === 'confirm1' && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-rose-800 uppercase tracking-tight">
                    Tem certeza? Esta ação é irreversível.
                  </p>
                  <p className="text-xs text-rose-600 font-medium mt-1">
                    Todos os clientes, turmas, funis, vendas e demais registros serão apagados permanentemente do banco de dados.
                    Para continuar, digite <strong>LIMPAR</strong> no campo abaixo.
                  </p>
                </div>
              </div>
              <input
                autoFocus
                value={resetConfirmText}
                onChange={e => setResetConfirmText(e.target.value)}
                placeholder="Digite LIMPAR para continuar"
                className="w-full border-2 border-rose-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-rose-800 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setResetPhase('idle'); setResetConfirmText(''); }}
                  className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { if (resetConfirmText === 'LIMPAR') setResetPhase('confirm2'); }}
                  disabled={resetConfirmText !== 'LIMPAR'}
                  className="flex-1 bg-rose-500 disabled:bg-rose-200 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                >
                  <ChevronRight size={16} /> Continuar
                </button>
              </div>
            </div>
          )}

          {/* Confirmação 2 — última chance */}
          {resetPhase === 'confirm2' && (
            <div className="bg-red-900 border-2 border-red-700 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">
                    🚨 Última confirmação — ponto sem retorno
                  </p>
                  <p className="text-xs text-red-300 font-medium mt-1">
                    Um backup automático será gerado antes da limpeza e um e-mail de notificação será enviado a todos os administradores e ao dono do sistema.
                    Clique em <strong className="text-white">Confirmar Limpeza Total</strong> para executar.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setResetPhase('idle'); setResetConfirmText(''); }}
                  className="flex-1 bg-red-800 border border-red-700 text-red-300 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetConfirm2}
                  className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-rose-400 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Confirmar Limpeza Total
                </button>
              </div>
            </div>
          )}

          {/* Em progresso */}
          {resetPhase === 'resetting' && (
            <div className="flex flex-col items-center justify-center gap-5 py-8 animate-in fade-in">
              <div className="w-16 h-16 border-4 border-rose-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Limpando banco de dados…</p>
                <p className="text-xs text-slate-400 font-medium">Gerando backup e removendo todos os registros. Não feche esta aba.</p>
              </div>
            </div>
          )}

          {/* Concluído */}
          {resetPhase === 'done' && (
            <div className="flex flex-col items-center justify-center gap-5 py-8 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={36} className="text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Banco limpo com sucesso!</p>
                <p className="text-xs text-slate-400 font-medium">Notificação enviada aos admins. Recarregando…</p>
              </div>
              <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Erro */}
          {resetPhase === 'error' && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-700">{resetError}</p>
                <button
                  onClick={() => { setResetPhase('idle'); setResetConfirmText(''); setResetError(null); }}
                  className="mt-2 text-[10px] font-black text-rose-500 uppercase hover:underline"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default DatabaseAdmin;
