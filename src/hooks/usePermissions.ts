import { useData } from '../../store';
import { UserRole } from '../../types';

// ─── Módulos disponíveis no sistema ──────────────────────────────────────────

export type AppModule =
  // Operação (todos os roles com sessão)
  | 'dashboard'
  | 'funil'
  | 'clientes'
  | 'acoesCs'
  | 'atendimentosCs'
  | 'agenda'
  // Cadastro Geral (ADMIN + GESTOR)
  | 'instituicoes'
  | 'cursos'
  | 'produtos'
  | 'turmas'
  | 'eventos'
  | 'funis'
  | 'activityTypes'
  | 'lixeira'
  // Restrito (ADMIN apenas)
  | 'usuarios'
  | 'database';

// ─── Estrutura de permissões por módulo ──────────────────────────────────────

export interface ModulePermissions {
  canView: boolean;
  canInsert: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ─── Matriz de permissões ─────────────────────────────────────────────────────
//
//  Módulos operacionais (dashboard, funil, clientes, acoesCs, atendimentosCs, agenda):
//    ADMIN       → View + Insert + Edit + Delete
//    GESTOR      → View + Insert + Edit + Delete
//    CONSULTOR   → View + Insert + Edit  (sem Delete)
//    VISUALIZADOR→ View apenas
//
//  Módulos de cadastro (instituicoes, cursos, produtos, turmas, eventos, funis, activityTypes, lixeira):
//    ADMIN       → View + Insert + Edit + Delete
//    GESTOR      → View + Insert + Edit + Delete
//    CONSULTOR   → sem acesso
//    VISUALIZADOR→ sem acesso
//
//  Módulos restritos (usuarios, database):
//    ADMIN       → View + Insert + Edit + Delete
//    todos demais→ sem acesso

const NONE: ModulePermissions = { canView: false, canInsert: false, canEdit: false, canDelete: false };
const FULL: ModulePermissions = { canView: true,  canInsert: true,  canEdit: true,  canDelete: true  };
const VIEW_ONLY: ModulePermissions = { canView: true, canInsert: false, canEdit: false, canDelete: false };
const INSERT_EDIT: ModulePermissions = { canView: true, canInsert: true, canEdit: true, canDelete: false };

const OPERATIONAL_MODULES: AppModule[] = [
  'dashboard', 'funil', 'clientes', 'acoesCs', 'atendimentosCs', 'agenda',
];

const CADASTRO_MODULES: AppModule[] = [
  'instituicoes', 'cursos', 'produtos', 'turmas', 'eventos', 'funis', 'activityTypes', 'lixeira',
];

const RESTRICTED_MODULES: AppModule[] = ['usuarios', 'database'];

function resolvePermissions(role: UserRole | undefined, module: AppModule): ModulePermissions {
  if (!role) return NONE;

  if (role === UserRole.ADMIN) return FULL;

  if (role === UserRole.GESTOR) {
    if (RESTRICTED_MODULES.includes(module)) return NONE;
    return FULL; // operational + cadastro
  }

  if (role === UserRole.CONSULTOR) {
    if (OPERATIONAL_MODULES.includes(module)) return INSERT_EDIT;
    return NONE;
  }

  if (role === UserRole.VISUALIZADOR) {
    if (OPERATIONAL_MODULES.includes(module)) return VIEW_ONLY;
    return NONE;
  }

  return NONE;
}

// ─── Hook público ─────────────────────────────────────────────────────────────

export function usePermissions(module: AppModule): ModulePermissions {
  const { currentUser } = useData();
  return resolvePermissions(currentUser?.role as UserRole | undefined, module);
}

// ─── Helper: verifica se o role tem acesso a uma rota ────────────────────────
//  Usado pelo RoleGuard no App.tsx

export function canAccessModule(role: UserRole | undefined, module: AppModule): boolean {
  return resolvePermissions(role, module).canView;
}
