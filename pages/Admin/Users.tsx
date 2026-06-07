
import React, { useState } from 'react';
import { useData } from '../../store';
import { User, UserRole } from '../../types';
import { supabase } from '../../src/lib/supabase';
import { Shield, Mail, Phone, Lock, X, Check, AlertCircle, RefreshCw, Trash2, Edit2, KeyRound, Loader2 } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Modal Criar / Editar ────────────────────────────────────────────────────

const UserModal: React.FC<{
  user?: User | null;
  onClose: () => void;
  onCreated: (user: User) => void;
  onUpdated: (user: User) => void;
}> = ({ user, onClose, onCreated, onUpdated }) => {
  const isEdit = !!user;

  const [formData, setFormData] = useState({
    name:     user?.name     ?? '',
    email:    user?.email    ?? '',
    phone:    user?.phone    ?? '',
    password: '',
    role:     user?.role     ?? UserRole.CONSULTOR,
    status:   user?.status   ?? 'ATIVO' as 'ATIVO' | 'INATIVO',
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) { setError('Nome é obrigatório.'); return; }
    if (!isEdit && !formData.email.trim()) { setError('E-mail é obrigatório.'); return; }
    if (!isEdit && formData.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }

    setLoading(true);

    if (isEdit) {
      // ── Edição: apenas nome, telefone, role, status ──────────────────────
      const updated: User = {
        ...user!,
        name:   formData.name.trim(),
        phone:  formData.phone.trim(),
        role:   formData.role,
        status: formData.status,
      };
      onUpdated(updated);
    } else {
      // ── Criação: via Edge Function create-user ───────────────────────────
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return; }

        const res = await supabase.functions.invoke('create-user', {
          body: {
            email:    formData.email.trim(),
            password: formData.password,
            name:     formData.name.trim(),
            phone:    formData.phone.trim(),
            role:     formData.role,
          },
        });

        if (res.error || res.data?.error) {
          setError(res.data?.error ?? res.error?.message ?? 'Erro ao criar usuário.');
          setLoading(false);
          return;
        }

        const created: User = {
          id:             res.data.id,
          name:           res.data.name,
          email:          res.data.email,
          phone:          res.data.phone ?? '',
          role:           res.data.role as UserRole,
          status:         'ATIVO',
          password:       '',
          createdAt:      new Date().toISOString().split('T')[0],
        };
        onCreated(created);
      } catch (err: any) {
        setError(err.message ?? 'Erro inesperado.');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Erro inline */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Email + Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                E-mail (Login) {!isEdit && '*'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="email"
                  required={!isEdit}
                  disabled={isEdit}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isEdit
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              {isEdit && (
                <p className="text-[10px] text-slate-400 px-1">E-mail não pode ser alterado.</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Senha (apenas criação) */}
          {!isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha * (mín. 6 caracteres)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="password"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium"
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Role + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nível de Acesso</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm font-medium"
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
              >
                <option value={UserRole.ADMIN}>Administrador</option>
                <option value={UserRole.GESTOR}>Gestor</option>
                <option value={UserRole.CONSULTOR}>Consultor</option>
                <option value={UserRole.VISUALIZADOR}>Visualizador</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <div className="flex gap-4 pt-2">
                {(['ATIVO', 'INATIVO'] as const).map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === s}
                      onChange={() => setFormData(p => ({ ...p, status: s }))}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{s === 'ATIVO' ? 'Ativo' : 'Inativo'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Aguarde...</>
                : <><Check size={16} /> {isEdit ? 'Salvar Alterações' : 'Criar Usuário'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Página principal ────────────────────────────────────────────────────────

const UsersAdmin: React.FC = () => {
  const { users, setUsers, updateUser, deleteUser, currentUser } = useData();

  const [modalOpen, setModalOpen]         = useState(false);
  const [selectedUser, setSelectedUser]   = useState<User | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [resetStatus, setResetStatus]     = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  const [searchTerm, setSearchTerm]       = useState('');

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // ── Filtro de busca ────────────────────────────────────────────────────────
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Badges ─────────────────────────────────────────────────────────────────
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:        return 'bg-slate-900 text-white';
      case UserRole.GESTOR:       return 'bg-emerald-100 text-emerald-700';
      case UserRole.CONSULTOR:    return 'bg-amber-100 text-amber-700';
      case UserRole.VISUALIZADOR: return 'bg-slate-100 text-slate-600';
      default:                    return 'bg-slate-100 text-slate-600';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:        return 'Admin';
      case UserRole.GESTOR:       return 'Gestor';
      case UserRole.CONSULTOR:    return 'Consultor';
      case UserRole.VISUALIZADOR: return 'Visualizador';
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreated = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdated = (updated: User) => {
    updateUser(updated);
  };

  const handleDeleteConfirm = (user: User) => {
    if (!isAdmin) return;
    setConfirmConfig({
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir "${user.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => {
        deleteUser(user.id);
        setConfirmConfig(null);
      },
    });
  };

  const handleResetPassword = async (user: User) => {
    setResetStatus(p => ({ ...p, [user.id]: 'sending' }));
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + '/#/reset-password',
    });
    setResetStatus(p => ({ ...p, [user.id]: error ? 'error' : 'sent' }));
    // Volta para idle após 4 segundos
    setTimeout(() => setResetStatus(p => ({ ...p, [user.id]: 'idle' })), 4000);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">Controle de Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os colaboradores e suas permissões hierárquicas.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setSelectedUser(null); setModalOpen(true); }}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            + Adicionar Usuário
          </button>
        )}
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Pesquisar por nome ou e-mail..."
        className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
              <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
              <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível</th>
              <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              {isAdmin && (
                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                {/* Usuário */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{u.name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail size={10} /> {u.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Contato */}
                <td className="px-6 py-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400" />
                    {u.phone || '—'}
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRoleBadge(u.role)}`}>
                    <Shield size={9} /> {getRoleLabel(u.role)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${u.status === 'ATIVO' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ATIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {u.status ?? 'ATIVO'}
                  </span>
                </td>

                {/* Ações */}
                {isAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">

                      {/* Redefinir senha */}
                      <button
                        onClick={() => handleResetPassword(u)}
                        disabled={resetStatus[u.id] === 'sending'}
                        title="Enviar e-mail de redefinição de senha"
                        className={`p-2 rounded-lg transition-all text-xs font-bold flex items-center gap-1 ${
                          resetStatus[u.id] === 'sent'
                            ? 'text-emerald-600 bg-emerald-50'
                            : resetStatus[u.id] === 'error'
                            ? 'text-rose-500 bg-rose-50'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        {resetStatus[u.id] === 'sending' && <Loader2 size={14} className="animate-spin" />}
                        {resetStatus[u.id] === 'sent'    && <Check size={14} />}
                        {resetStatus[u.id] === 'error'   && <AlertCircle size={14} />}
                        {(!resetStatus[u.id] || resetStatus[u.id] === 'idle') && <KeyRound size={14} />}
                        <span className="hidden sm:inline">
                          {resetStatus[u.id] === 'sent'    ? 'Enviado!'
                          : resetStatus[u.id] === 'error'  ? 'Erro'
                          : resetStatus[u.id] === 'sending' ? ''
                          : 'Resetar'}
                        </span>
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => { setSelectedUser(u); setModalOpen(true); }}
                        title="Editar usuário"
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Excluir */}
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteConfirm(u)}
                          title="Excluir usuário"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards de nível */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { role: 'ADMIN',        label: 'Administrador', desc: 'Acesso total ao sistema, incluindo usuários e database.', color: 'bg-slate-900 text-white border-slate-700', icon: 'bg-slate-800 text-amber-400' },
          { role: 'GESTOR',       label: 'Gestor',        desc: 'Acesso total exceto gestão de usuários e database.',       color: 'bg-emerald-50 text-emerald-900 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600' },
          { role: 'CONSULTOR',    label: 'Consultor',     desc: 'Acesso operacional ao funil e cadastro de clientes.',      color: 'bg-amber-50 text-amber-900 border-amber-100', icon: 'bg-amber-100 text-amber-600' },
          { role: 'VISUALIZADOR', label: 'Visualizador',  desc: 'Apenas leitura — sem permissão de edição.',               color: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'bg-slate-200 text-slate-500' },
        ].map(r => (
          <div key={r.role} className={`p-5 rounded-xl border flex flex-col gap-3 ${r.color}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.icon}`}>
              <Shield size={16} />
            </div>
            <div>
              <p className="font-bold text-sm">{r.label}</p>
              <p className="text-xs leading-relaxed opacity-70 mt-1">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <UserModal
          user={selectedUser}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      {/* Confirm delete */}
      {confirmConfig && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel="Excluir"
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
};

export default UsersAdmin;
