
import React, { useState } from 'react';
import { useData } from '../../store';
import { GenericRegistry, Column } from '../../components/GenericRegistry';
import { User, UserRole } from '../../types';
import { Shield, Mail, Phone, Lock, X, Check, AlertCircle } from 'lucide-react';

const UserModal: React.FC<{
  user?: User | null;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
}> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      name: '',
      email: '',
      phone: '',
      password: '',
      role: UserRole.CONSULTOR,
      status: 'ATIVO',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || (!user && !formData.password)) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold text-slate-900">
            {user ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail (Login) *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="password" 
                    required={!user}
                    placeholder={user ? "Deixe em branco para manter" : ""}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nível de Acesso</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.ADMIN}>Administrador (Gerente)</option>
                  <option value={UserRole.CONSULTOR}>Consultor</option>
                  <option value={UserRole.VISUALIZADOR}>Visualizador (Diretoria)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status do Usuário</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="status"
                    checked={formData.status === 'ATIVO'}
                    onChange={() => setFormData({...formData, status: 'ATIVO'})}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="status"
                    checked={formData.status === 'INATIVO'}
                    onChange={() => setFormData({...formData, status: 'INATIVO'})}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Inativo</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} />
              {user ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsersAdmin: React.FC = () => {
  const { users, setUsers, addUser, updateUser, deleteUser, currentUser } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case UserRole.ADMIN: return 'bg-slate-900 text-white';
      case UserRole.CONSULTOR: return 'bg-amber-100 text-amber-700';
      case UserRole.VISUALIZADOR: return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns: Column<User>[] = [
    { 
      header: 'Usuário', 
      accessor: (item: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-200">
            {item.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-none mb-1">{item.name}</p>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Mail size={10} /> {item.email}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Contato',
      accessor: (item: User) => (
        <div className="text-xs text-slate-600 flex items-center gap-1.5">
          <Phone size={12} className="text-slate-400" />
          {item.phone || 'N/A'}
        </div>
      )
    },
    { 
      header: 'Nível de Acesso', 
      accessor: (item: User) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRoleBadge(item.role)}`}>
          <Shield size={10} />
          {item.role === UserRole.ADMIN ? 'Gerente' : item.role === UserRole.CONSULTOR ? 'Consultor' : 'Diretoria'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (item: User) => (
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${item.status === 'ATIVO' ? 'text-emerald-600' : 'text-rose-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'ATIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          {item.status || 'ATIVO'}
        </span>
      )
    }
  ];

  const handleAdd = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEdit = (item: User) => {
    setSelectedUser(item);
    setModalOpen(true);
  };

  const handleDelete = (ids: string[]) => {
    if (!isAdmin) {
      alert("Permissão negada. Apenas administradores podem excluir usuários.");
      return;
    }
    ids.forEach(id => deleteUser(id));
  };

  const handleSave = (userData: Partial<User>) => {
    if (selectedUser) {
      updateUser({ ...selectedUser, ...userData } as User);
    } else {
      addUser(userData as Omit<User, 'id' | 'createdAt'>);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <GenericRegistry
        title="Controle de Usuários"
        description="Gerencie os colaboradores e suas permissões hierárquicas."
        entityType="user"
        data={users}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Pesquisar por nome ou e-mail..."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-lg text-amber-400"><Shield size={24} /></div>
          <div>
            <h3 className="font-bold text-white mb-2">Administrador (Gerente)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Acesso total ao sistema, gestão financeira e exclusão de usuários.</p>
          </div>
        </div>
        <div className="p-6 bg-amber-50 rounded-xl border border-amber-100 flex flex-col items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-600"><Mail size={24} /></div>
          <div>
            <h3 className="font-bold text-amber-900 mb-2">Consultor</h3>
            <p className="text-sm text-amber-700 leading-relaxed">Acesso operacional ao funil de vendas e cadastro de clientes da carteira.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-start gap-4">
          <div className="p-3 bg-slate-200 rounded-lg text-slate-600"><Lock size={24} /></div>
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Visualizador (Diretoria)</h3>
            <p className="text-sm text-slate-700 leading-relaxed">Acesso de leitura total aos indicadores de performance sem permissão de edição.</p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <UserModal 
          user={selectedUser} 
          onClose={() => setModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
};

export default UsersAdmin;
