
import React, { useState } from 'react';
import { useData } from '../store';
import { useAuth } from '../src/hooks/useAuth';
import { User, Mail, Phone, Shield, Save, KeyRound } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { currentUser, updateUser } = useData();
  const { supabaseUser } = useAuth();

  const [name, setName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [saved, setSaved] = useState(false);

  if (!currentUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ ...currentUser, name: name.trim() || currentUser.name, phone: phone.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Minhas Informações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie seu perfil e dados de acesso.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-3xl font-black text-amber-600 border-4 border-white shadow-xl">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{currentUser.name}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentUser.role}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome</label>
            <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-amber-400">
              <User size={16} className="text-slate-400 shrink-0" />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
            <div className="flex items-center gap-3 border border-slate-100 rounded-xl px-4 py-2.5 bg-slate-50">
              <Mail size={16} className="text-slate-300 shrink-0" />
              <span className="text-sm text-slate-400 font-semibold">{supabaseUser?.email ?? currentUser.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone</label>
            <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-amber-400">
              <Phone size={16} className="text-slate-400 shrink-0" />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Função / Papel</label>
            <div className="flex items-center gap-3 border border-slate-100 rounded-xl px-4 py-2.5 bg-slate-50">
              <Shield size={16} className="text-slate-300 shrink-0" />
              <span className="text-sm text-slate-400 font-semibold">{currentUser.role}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-xs tracking-widest py-3.5 rounded-xl transition-colors shadow-sm"
          >
            {saved ? <><Save size={16} /> Salvo!</> : <><Save size={16} /> Salvar Alterações</>}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-4">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <KeyRound size={20} className="text-amber-500" /> Segurança
        </h2>
        <p className="text-sm text-slate-500">Para alterar sua senha, utilize a opção "Esqueci minha senha" na tela de login.</p>
      </div>
    </div>
  );
};

export default UserProfile;
