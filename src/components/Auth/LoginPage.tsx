import React, { useState, FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';

interface Props {
  onForgotPassword?: () => void;
}

const LoginPage: React.FC<Props> = ({ onForgotPassword }) => {
  const { signIn } = useAuth();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await signIn(email.trim(), password);

    if (authError) {
      setError(translateError(authError.message));
      setLoading(false);
    }
    // Se não houver erro, onAuthStateChange no useAuth já atualiza a sessão
    // e o App.tsx redireciona automaticamente — não precisa setar estado aqui.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      {/* Card central */}
      <div className="w-full max-w-md">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <img
            src="/assets/logo-top.png.png"
            alt="TOP Formaturas"
            className="h-24 w-auto object-contain mx-auto mb-5 drop-shadow-2xl"
          />
          <p className="text-slate-400 text-sm">Gestão comercial inteligente</p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-8 space-y-5"
        >
          <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] mb-6">
            Acesse sua conta
          </h2>

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
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Campo senha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Senha
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
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

          {/* Link esqueci minha senha */}
          {onForgotPassword && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-slate-500 hover:text-amber-400 font-bold uppercase tracking-widest transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-rose-300 text-xs font-medium leading-snug">{error}</p>
            </div>
          )}

          {/* Botão submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:cursor-not-allowed text-slate-900 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 text-sm uppercase tracking-widest mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6 uppercase tracking-widest">
          CRM v1.2 Platinum
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function translateError(msg: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials':   'E-mail ou senha incorretos.',
    'Email not confirmed':          'Confirme seu e-mail antes de entrar.',
    'Too many requests':            'Muitas tentativas. Aguarde alguns minutos.',
    'User not found':               'Usuário não encontrado.',
  };
  for (const [key, pt] of Object.entries(map)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return pt;
  }
  return 'Erro ao fazer login. Tente novamente.';
}
