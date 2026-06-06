import React, { useState, FormEvent } from 'react';
import { GraduationCap, Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface Props {
  onBack: () => void;
}

const ForgotPasswordPage: React.FC<Props> = ({ onBack }) => {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // redirectTo aponta para a base URL sem hash.
    // O supabase-js detecta automaticamente os tokens de recovery
    // no fragment (#access_token=...&type=recovery) na próxima carga da página.
    const redirectTo = window.location.href.split('#')[0];

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    setLoading(false);

    if (authError) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
      return;
    }

    setSuccess(true);
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
                  E-mail enviado!
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Enviamos um link de redefinição para{' '}
                  <span className="text-amber-400 font-bold">{email}</span>.
                  <br />
                  Verifique sua caixa de entrada (e o spam).
                </p>
              </div>
              <button
                onClick={onBack}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-black py-3.5 rounded-xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Voltar ao login
              </button>
            </div>
          ) : (
            /* ── Formulário ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1 mb-6">
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">
                  Recuperar senha
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Informe seu e-mail cadastrado e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              {/* Campo e-mail */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-rose-300 text-xs font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Botão enviar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:cursor-not-allowed text-slate-900 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 text-sm uppercase tracking-widest mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de redefinição'
                )}
              </button>

              {/* Voltar */}
              <button
                type="button"
                onClick={onBack}
                className="w-full text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-widest py-2 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Voltar ao login
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

export default ForgotPasswordPage;
