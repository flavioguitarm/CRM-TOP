import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  createElement,
} from 'react';
import type { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SignInResult {
  error: AuthError | null;
}

interface AuthContextType {
  /** Sessão Supabase ativa (null enquanto carrega ou deslogado) */
  session: Session | null;
  /** Objeto de usuário do Supabase Auth */
  supabaseUser: SupabaseUser | null;
  /** true enquanto o estado inicial da sessão ainda não foi resolvido */
  loading: boolean;
  /** Faz login com email/senha via Supabase Auth */
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** Desloga e encerra a sessão */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]       = useState<Session | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // Recupera a sessão existente ao montar (ex.: refresh da página)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Ouve mudanças de estado: login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    session,
    supabaseUser: session?.user ?? null,
    loading,
    signIn,
    signOut,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
