import React, { useState, FormEvent } from 'react';
import { GraduationCap, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface Props {
  /** Chamado após redefinição bem-sucedida (ou se o usuário quiser fazer logout/voltar). */
  onDone: () => void;
}

const ResetPasswordPage: React.FC<Props> = ({ onDone }) => {
  const [password,        setPassword]        = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (authError) {
      setError(translateError(authError.message));
      return;
    }

    setSuccess(true);

    // Aguarda 2 s e então chama onDone para redirecionar para o app
    setTimeout(() => {
      onDone();
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-400/20">
            <GraduationCap size={40} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">CRM Formaturas</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão comercial inteligente</p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-8">

          {success ? (
            /* ── Estado de sucesso ── */
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-400/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-400/20">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-black text-slate-200 uppercase tracking-[0.2em]">
                  Senha redefinida!
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Sua nova senha foi salva com sucesso.
                  <br />
                  Redirecionando para o sistema…
                </p>
              </div>
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            /* ── Formulário ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1 mb-6">
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">
                  Nova senha
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Escolha uma senha segura com pelo menos 6 caracteres.
                </p>
              </div>

              {/* Campo nova senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Campo confirmar senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-slate-900 border text-white placeholder-slate-600 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                      passwordConfirm && password !== passwordConfirm
                        ? 'border-rose-500/60 focus:ring-rose-500/30 focus:border-rose-500'
                        : 'border-slate-700 focus:ring-amber-400/50 focus:border-amber-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Indicador visual de correspondência */}
                {passwordConfirm.length > 0 && (
                  <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                    password === passwordConfirm ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {password === passwordConfirm ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
                  </p>
                )}
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-rose-300 text-xs font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Botão salvar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:cursor-not-allowed text-slate-900 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 text-sm uppercase tracking-widest mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 uppercase tracking-widest">
          CRM v1.2 Platinum
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function translateError(msg: string): string {
  const map: Record<string, string> = {
    'Auth session missing':  'Sessão expirada. Solicite um novo link de redefinição.',
    'New password should be': 'A senha deve ter no mínimo 6 caracteres.',
    'Token has expired':      'O link de redefinição expirou. Solicite um novo.',
    'Password should be':     'A senha não atende aos requisitos mínimos.',
  };
  for (const [key, pt] of Object.entries(map)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return pt;
  }
  return 'Erro ao redefinir a senha. Solicite um novo link e tente novamente.';
}
