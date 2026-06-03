
import React, { useRef, useState } from 'react';
import { useData } from '../../store';
import { Database, Download, Upload, ShieldCheck, AlertTriangle, RefreshCcw, HardDrive, Share2, Loader2, CheckCircle2 } from 'lucide-react';

const DatabaseAdmin: React.FC = () => {
  const { exportDatabase, importDatabase, resetDatabase, googleSheetUrl, setGoogleSheetUrl, syncWithGoogleSheet } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleExport = () => {
    const data = exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_crm_formaturas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (confirm("ATENÇÃO: Importar um backup irá SUBSTITUIR todos os dados atuais. Deseja prosseguir?")) {
        importDatabase(content);
        alert("Sistema restaurado com sucesso!");
        window.location.reload();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSync = async () => {
    if (!googleSheetUrl) {
        alert("Por favor, insira o link da planilha primeiro.");
        return;
    }
    setIsSyncing(true);
    await syncWithGoogleSheet();
    setTimeout(() => {
        setIsSyncing(false);
        alert("Sincronização concluída (se o formato da planilha estiver correto).");
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Segurança de Dados</h1>
        <p className="text-slate-500 font-medium">Gerencie a persistência e backups da sua base de dados.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 group hover:border-amber-400 transition-all">
         <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Share2 size={24} />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Sincronização Google Sheets</h3>
                <p className="text-sm text-slate-500 font-medium italic">Vincule o CRM a uma planilha para persistência entre atualizações.</p>
            </div>
         </div>
         
         <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link da Planilha Google (ou CSV Público)</label>
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
                    {isSyncing ? <Loader2 size={18} className="animate-spin"/> : <RefreshCcw size={18}/>}
                    Sincronizar Agora
                </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 mt-0.5" size={16} />
                <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">
                    Para funcionar: 1. A planilha deve estar "Compartilhada com qualquer pessoa com o link" (Leitor). 2. O app buscará uma coluna chamada "backup_json" com o conteúdo JSON do sistema.
                </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col justify-between group hover:border-amber-400 transition-all">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Download size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Exportar Backup Local</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Gere um arquivo físico com todos os seus dados atuais.</p>
            </div>
            <ul className="space-y-3">
              {['Backup completo em JSON', 'Garantia contra limpeza de cache', 'Pode ser restaurado em qualquer PC'].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                  <ShieldCheck size={14} className="text-emerald-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <button 
            onClick={handleExport}
            className="w-full mt-10 bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
          >
            Baixar Arquivo de Backup (.json)
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 flex flex-col justify-between group hover:border-emerald-400 transition-all">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Restaurar do Arquivo</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Carregue um backup manual para restaurar toda a inteligência do CRM.</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-rose-500 mt-0.5" size={18} />
                <p className="text-[10px] font-black text-rose-800 uppercase leading-relaxed tracking-tight">
                    IMPORTANTE: A restauração apagará os dados atuais do navegador.
                </p>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleFileChange} 
          />
          <button 
            onClick={handleImportClick}
            className="w-full mt-10 bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
          >
            Selecionar Arquivo de Backup
          </button>
        </div>
      </div>

      <div className="pt-10 border-t border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Manutenção Técnica</h4>
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl text-slate-400"><HardDrive size={24}/></div>
                <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Limpar Banco de Dados Local</p>
                    <p className="text-xs text-slate-400 font-medium">Remove todos os dados do navegador e reinicia o sistema.</p>
                </div>
            </div>
            <button 
                onClick={resetDatabase}
                className="px-8 py-4 border-2 border-rose-100 text-rose-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all flex items-center gap-2"
            >
                <RefreshCcw size={16}/> Resetar CRM (Fábrica)
            </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseAdmin;
