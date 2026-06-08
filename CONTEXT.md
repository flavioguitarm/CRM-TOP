# CRM-TOP — Contexto de Desenvolvimento

> Atualizado em: 2026-06-08 (Sessão 14 — concluída)
> Usar como briefing ao retomar a sessão no Claude Code.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework UI | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Roteamento | React Router DOM 7 (HashRouter) |
| Estilização | Tailwind CSS (utilitários inline) |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Planilhas | SheetJS (xlsx 0.18.5) |
| Backend / Auth / DB | Supabase (supabase-js ^2.49.8) |
| Banco | PostgreSQL via Supabase |

---

## Estrutura de pastas principais

```
CRM-TOP/
├── App.tsx                         # Raiz: AuthProvider > DataProvider > Router > Layout
├── store.tsx                       # Context global (DataProvider + useData hook)
├── types.ts                        # Interfaces TypeScript de todas as entidades
├── constants.tsx                   # Dados mock (usados como fallback/seed)
├── index.tsx                       # Entry point React
├── vite.config.ts                  # Alias @ → raiz do projeto
├── .env.local                      # Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
├── CONTEXT.md                      # Este arquivo — briefing de retomada
│
├── public/
│   └── assets/
│       ├── logo-top.png.png        # Logo branco (fundo transparente) → sidebar + login
│       ├── TopFormaturas.png       # Logo preto/cinza → uso em fundos claros
│       └── TopFormaturasPRETO.png  # Logo totalmente preto → impressão / fundos claros
│
├── src/
│   ├── lib/supabase.ts             # Cliente Supabase (createClient com variáveis de ambiente)
│   ├── hooks/useAuth.ts            # AuthProvider + useAuth (session, signIn, signOut)
│   └── components/Auth/
│       ├── LoginPage.tsx           # Tela de login — logo TOP substituiu GraduationCap
│       ├── ForgotPasswordPage.tsx  # Tela "esqueci minha senha"
│       └── ResetPasswordPage.tsx   # Tela de redefinição de senha
│
├── components/
│   ├── Header.tsx                  # Barra superior (notificações, menu do usuário, logout)
│   ├── Sidebar.tsx                 # Menu lateral — logo TOP expandido/colapsado
│   ├── BulkImportModal.tsx         # Modal de importação em massa via planilha
│   ├── ConfirmModal.tsx            # Modal de confirmação reutilizável (Sim/Não)
│   ├── GenericRegistry.tsx         # Tabela genérica com busca, seleção e ações CRUD
│   ├── ClientProfileView.tsx       # Painel lateral de perfil do cliente
│   └── HelpTooltip.tsx             # ✅ NOVO (Sessão 6) — Tooltip de ajuda reutilizável
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Funnel.tsx                  # Kanban de funil — label sidebar: "Negociações"
│   ├── Clients.tsx                 # Lista e perfil de clientes — h1: "Clientes"
│   ├── CSActions.tsx               # Ações CS — label sidebar: "Painel de Ações CS"
│   ├── CSDailyServices.tsx         # Atendimentos diários CS — importação em massa conectada
│   ├── Agenda.tsx                  # Agenda — label sidebar: "Agenda Integrada"
│   ├── UserProfile.tsx             # Perfil do usuário logado
│   └── Admin/
│       ├── Instituicoes.tsx
│       ├── Cursos.tsx
│       ├── Turmas.tsx              # Label sidebar: "Gestão de Turmas" — saleLimit implementado
│       ├── Produtos.tsx            # Label sidebar: "Catálogo de Vendas"
│       ├── Eventos.tsx             # Label sidebar: "Cronograma Mestre"
│       ├── Users.tsx
│       ├── FunnelConfig.tsx
│       ├── ActivityTypes.tsx
│       ├── Database.tsx
│       ├── Backup.tsx              # Backup & Restore com tooltips
│       ├── Seguranca.tsx
│       └── Trash.tsx               # Lixeira completa (90 dias, bulk delete permanente)
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Schema completo
```

---

## Autenticação (concluída)

- **Supabase Auth** via `src/hooks/useAuth.ts` (`AuthProvider` + `useAuth`)
- `AuthProvider` envolve toda a árvore em `App.tsx`
- `ProtectedRoute` gerencia três views: `'login'` → `LoginPage`, `'forgot'` → `ForgotPasswordPage`, `'reset'` → `ResetPasswordPage`
- Listener `onAuthStateChange` detecta `PASSWORD_RECOVERY` e ativa view `'reset'` automaticamente
- `AuthSync` (componente interno em `App.tsx`) sincroniza `session.user` → `currentUser` do store
- Logout em `Header.tsx` chama `useAuth().signOut()`
- `tenantId` no store = `supabase.auth.getSession().user.id` (usuário Auth = tenant)

---

## Banco de dados — Schema (`001_initial_schema.sql`)

Tabelas criadas com **`tenant_id UUID NOT NULL`** em todas (exceto junction tables).

### ⚠️ RLS — Status atual: DESATIVADA para desenvolvimento

O isolamento de dados é feito apenas pelo filtro `.eq('tenant_id', tenantId)` nas queries do cliente.
As políticas existem no schema — basta reativar quando o `set_config` estiver implementado.

### Migração adicionada na Sessão 6

```sql
-- Coluna adicionada manualmente no Supabase (não está em 001_initial_schema.sql):
ALTER TABLE class_products
  ADD COLUMN sale_limit TEXT NOT NULL DEFAULT 'MULTIPLO'
  CHECK (sale_limit IN ('UNICO', 'MULTIPLO'));
```

---

## Padrões técnicos importantes

### IDs
- **Sempre usar `crypto.randomUUID()`** para IDs de novas entidades que vão para o Supabase.
- Nunca usar `Date.now()`, `Math.random()` ou prefixos tipo `t-${Date.now()}` — Supabase exige UUID válido nas colunas `UUID NOT NULL`.

### Soft delete (Lixeira)
- **Todo delete passa pelo `moveToTrash(entityType, ids[])`** — nunca deletar direto do store ou chamar funções de delete antigas.
- `moveToTrash` faz: Supabase DELETE + remove do estado local + push ao array `trash` no localStorage.
- `restoreFromTrash(trashId)` faz: re-insere no Supabase (upsert com `onConflict: 'id'`) + volta ao estado local + remove do `trash`.
- `permanentDeleteFromTrash(trashIds[])` — remove apenas do array `trash` (sem Supabase — já foi deletado).
- `purgeExpiredTrash()` — remove itens com mais de 90 dias do array `trash`.

### Restore de Cliente (fix Sessão 6)
- `restoreFromTrash` case `'client'` usa **upsert** (não insert) com `onConflict: 'id'` para contornar constraint `UNIQUE (tenant_id, email)`.
- Após upsert bem-sucedido, re-insere `client_activities` (foram deletadas por `ON DELETE CASCADE`).

### Confirmação de exclusão
- **Todo delete (individual ou em massa) usa `<ConfirmModal>`** — nunca `window.confirm()`.
- Padrão: cada componente tem `const [confirmConfig, setConfirmConfig] = useState<{title, message, onConfirm}|null>(null)` e renderiza `{confirmConfig && <ConfirmModal ... />}` no final do return.

### Otimistic updates
- Estado local atualizado imediatamente; Supabase fire-and-forget.

---

## Migração store → Supabase (COMPLETA — Sessões 1–4)

| Entidade | Tabelas Supabase |
|---|---|
| `institutions` | `institutions` |
| `courses` | `courses` |
| `classes` | `classes` + `class_courses` + `class_products` + `class_timeline_events` |
| `clients` | `clients` + `client_activities` |
| `funnels` | `funnels` + `funnel_stages` + `funnel_responsible_users` |
| `users` | `users` |
| `productCategories` | `product_categories` |
| `products` | `products` |
| `activityTypes` | `activity_types` |
| `events` | `events` + `event_activities` |
| `csActions` | `cs_actions` + `cs_action_activities` |
| `csDailyServices` | `cs_daily_services` |
| `sales` | `sales` |
| `negotiations` | `product_negotiations` |
| `tasks` | `client_tasks` |

### ❌ Ainda no localStorage (intencionalmente)

| Entidade | Motivo |
|---|---|
| `trash` | Frontend-only — sem tabela no DB |
| `googleSheetUrl` | Configuração de integração |

---

## ✅ Sessão 5 — Segurança, Backup, CRUD completo e Lixeira (2026-06-06)

### Melhorias de segurança e navegação

- **"Segurança" movida do sidebar para o dropdown do usuário no Header**
- **Backup & Restore unificado dentro de `Database.tsx`**
- **Limpeza de banco com dupla confirmação**
- **`UserProfile.tsx`** criado — rota `/perfil`

### Bug fixes

1. **Turmas** — `id: crypto.randomUUID()` em `handleSaveClass` e `handleBulkImport`
2. **FunnelConfig** — botão "Adicionar novo estágio" não persistia + botão deletar stage não funcionava
3. **Minhas Informações** — página e rota criadas

### Grupo A — Bulk delete com lixeira (5 módulos)

`Instituicoes.tsx`, `Turmas.tsx`, `Produtos.tsx`, `Eventos.tsx`, `CSDailyServices.tsx`

**Padrão:**
- `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
- Floating action bar: `fixed bottom-8 left-1/2 -translate-x-1/2 z-50`

### Grupo B — Clients.tsx bulk delete + individual

### Grupo C — Fix cirúrgico FunnelConfig

### Grupo D — Trash.tsx reescrito

- Auto-expiração 90 dias, exclusão manual após 30 dias, confirmação de senha obrigatória

### ConfirmModal global (`components/ConfirmModal.tsx`)

```ts
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;  // default: "Confirmar"
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

## ✅ Sessão 6 — Identidade Visual, UX e Funcionalidades de Negócio (2026-06-06)

### 🐛 Bugs corrigidos (3)

#### Bug 1 — Cliente restaurado não reaparecia na lista
- **Causa raiz 1:** Constraint `UNIQUE (tenant_id, email)` na tabela `clients` — insert falhava silenciosamente se o email já existia (estado de race condition).
- **Causa raiz 2:** `ON DELETE CASCADE` em `client_activities` — ao deletar o cliente, todas as atividades eram apagadas. O restore re-inseria o cliente mas não as atividades.
- **Fix em `store.tsx`:** `restoreFromTrash` case `'client'` passou de `insert` para `upsert` com `onConflict: 'id'`, seguido de upsert em cascata das `client_activities`.

#### Bug 2 — Dropdown de produtos vazio no perfil do cliente
- **Causa:** `allowedClassProducts` em `ClientProfileView.tsx` retornava `[]` quando cliente não tinha turma ou turma não tinha produtos configurados.
- **Fix:** Adicionado fallback — quando sem produtos de turma, retorna todos os produtos do catálogo.

#### Bug 3 — Importação em massa não funcionava em CSDailyServices
- **Causa:** `BulkImportModal` estava importado mas sem estado, handler nem campos definidos.
- **Fix:** Adicionado `isImportModalOpen`, `handleBulkImport` (com auto-link por telefone) e `importFields` (7 campos).

---

### 🎨 Padronização visual — Identidade TOP Formaturas

**Paleta canônica:** `slate-900` (preto) · `amber-500` (âmbar) · `emerald` (sucesso semântico) · `rose` (perigo semântico)

**Nomenclatura padronizada (sidebar ↔ página):**

| Sidebar (antes) | Sidebar (agora) | h1 da página |
|---|---|---|
| Funil de Vendas | **Negociações** | Negociações |
| Ações do CS | **Painel de Ações CS** | Painel de Ações CS |
| Agenda | **Agenda Integrada** | Agenda Integrada CRM |
| Produtos | **Catálogo de Vendas** | Catálogo de Vendas |
| Turmas | **Gestão de Turmas** | Gestão de Turmas |
| Eventos | **Cronograma Mestre** | Cronograma Mestre |

**"Banco de Formandos" → "Clientes" (5 pontos em `Clients.tsx` + `BulkImportModal.tsx`):**
- h1 da página
- Modal "Exportar Base de Clientes"
- Sheet name Excel: `Base_Clientes`
- BulkImportModal `title="Clientes"`
- Validação de duplicatas: `title !== 'Clientes'`

**Cores fora da paleta corrigidas:**

| Arquivo | O que foi corrigido |
|---|---|
| `Admin/Produtos.tsx` | Badges de categoria: `blue` → `amber` |
| `Admin/Turmas.tsx` | Card VGV: gradiente `indigo` → `slate`, label → `amber-400` |
| `Admin/Users.tsx` | Badge ADMIN: `purple` → `slate-900/white`; card de perfil → `slate-900` |
| `Agenda.tsx` | Status "Realizado": `indigo` → `slate` |
| `CSActions.tsx` | Status "INICIAR": `blue` → `amber` |
| `Dashboard.tsx` | StatCard "Conversão": `blue` → `amber`; ícone "Status da Base": `indigo` → `amber` |

---

### 💬 HelpTooltip (`components/HelpTooltip.tsx`) — NOVO

**Componente reutilizável de tooltip de ajuda:**
```tsx
<HelpTooltip text="Texto explicativo" position="top" /> // top | bottom | left | right
```

- Ícone `?` circular discreto (`slate-200`, hover `amber-400`)
- Hover no desktop, clique no mobile (fecha ao clicar fora via `mousedown`/`touchstart`)
- Fundo `slate-800`, texto branco, seta direcional, `z-[9999]`
- Acessível: `role="tooltip"`, `aria-label`, suporte `focus`/`blur`

**Tooltips adicionados em:**

| Formulário / Página | Campos cobertos |
|---|---|
| Cadastro de Cliente | Nome, Nascimento, Sexo, CPF, E-mail, Telefone, Turma/Sala, Instituição, Campus, Curso, Turno, Etiquetas |
| Cadastro de Turma | Nome, Instituição, Cursos, Ano de Formatura, Semestre, Comercial, Gestor, Consultor CS |
| Cadastro de Produto | Nome do Item, Categoria |
| Lixeira | Título (regras 30/90 dias), Restaurar, Excluir (countdown) |
| Backup & Restore | Botão Exportar, Botão Restaurar |

---

### 🔗 Vinculação inteligente entre formulários

**Formulário de Cliente (`Clients.tsx`):**
- Campo "Turma / Sala" convertido de `<select>` nativo para `SearchableSelect` com busca por texto
- Selecionar **Instituição** filtra as turmas disponíveis (apenas as da instituição)
- Selecionar **Turma** preenche Instituição + Curso automaticamente
- Trocar **Instituição** desmarca turma incompatível automaticamente
- `SearchableSelect` ganhou prop `labelExtra?: React.ReactNode` para suportar tooltips

**Importação em massa de Clientes:**
- Campos `institutionId`, `courseId`, `classId` aceitam **nome ou UUID**
- Função `resolveId(value, list)`: se não é UUID → busca por nome (partial match case-insensitive)
- Se vier nome de turma → resolve para ID e preenche instituição + curso automaticamente
- Labels: `"Turma / Sala (nome ou ID) — preenche inst. e curso automaticamente"`

---

### 🏷️ Limite de Vendas por Aluno (`saleLimit`)

**Novo tipo em `types.ts`:**
```ts
export type SaleLimit = 'UNICO' | 'MULTIPLO';

export interface ClassProduct {
  // ... campos existentes ...
  saleLimit: SaleLimit;  // ← NOVO
}
```

**Migration aplicada no Supabase:**
```sql
ALTER TABLE class_products
  ADD COLUMN sale_limit TEXT NOT NULL DEFAULT 'MULTIPLO'
  CHECK (sale_limit IN ('UNICO', 'MULTIPLO'));
```

**`store.tsx` atualizado (4 pontos):**
- Deserialização: `saleLimit: cp.sale_limit ?? 'MULTIPLO'`
- Select: `class_products(..., sale_limit)` incluído na query
- `addClassProduct`: `sale_limit: cp.saleLimit ?? 'MULTIPLO'` no insert
- `updateClassProduct`: `sale_limit: cp.saleLimit ?? 'MULTIPLO'` no update

**`Turmas.tsx` — `ClassProductModal`:**
- Campo visual de dois botões toggle: **① Único** (slate-900) / **∞ Múltiplo** (amber)
- Tooltip explicativo no label
- Badge `① Único` / `∞ Múltiplo` na listagem de produtos da turma

**`ClientProfileView.tsx` — Bloqueio ÚNICO:**
- `uniqueLimitProductsOwned` (useMemo): set de productIds com `saleLimit === 'UNICO'` que o cliente já possui (negociações ativas + vendas)
- `handleStartNegotiation`: retorna imediatamente se produto bloqueado
- Select: opções ÚNICO já adquiridas aparecem `disabled` com sufixo `— já adquirido`
- Badge contextual: `①` ou `∞` ao selecionar produto
- Mensagem de bloqueio: *"Este produto já foi adquirido por este cliente e possui limite de 1 unidade"*
- Campos de preço/qtd com `opacity-30 pointer-events-none` quando bloqueado
- Input de Qtd limitado a `max={1}` para produtos ÚNICO

---

### 🖼️ Logo TOP Formaturas

**Arquivos em `public/assets/`:**
| Arquivo | Versão | Uso |
|---|---|---|
| `logo-top.png.png` | Branca (transparente) | ✅ Sidebar + Login (fundo slate-900) |
| `TopFormaturas.png` | Preto/cinza com fundo branco | Fundos claros |
| `TopFormaturasPRETO.png` | Totalmente preta com fundo branco | Impressão / fundos claros |

**`components/Sidebar.tsx`:**
- **Expandido (`w-64`):** `<img src="/assets/logo-top.png.png" class="h-14 object-contain">` centralizado; botão `ChevronLeft` com `absolute right-4`
- **Colapsado (`w-20`):** logo `h-10 w-full object-contain` + botão `Menu` abaixo, tudo em `flex-col items-center`
- Import `GraduationCap` mantido (ainda usado no item "Gestão de Turmas" do menu)

**`src/components/Auth/LoginPage.tsx`:**
- Substituído bloco `GraduationCap` + `h1 "CRM Formaturas"` por `<img class="h-24 object-contain drop-shadow-2xl">`
- Subtítulo *"Gestão comercial inteligente"* mantido
- Import `GraduationCap` removido

---

---

## ✅ Sessão 7 — Backups Automáticos (2026-06-06)

### Edge Function `auto-backup` (`supabase/functions/auto-backup/index.ts`)
- Recebe `{ tenantId }` via POST
- Busca todos os dados do tenant (mesma lógica de `exportAllData`)
- Salva no bucket `backups` como `{tenantId}/backup_YYYY-MM-DD_HH-mm.json`
- Mantém apenas os últimos 30 backups (deleta os mais antigos automaticamente)
- Atualiza `backup_settings.last_backup_at` após cada backup

### Tabela `backup_settings` (criada manualmente no Supabase)
```sql
CREATE TABLE backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  last_backup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tipos adicionados em `types.ts`
- `BackupSettings` — configurações de backup do tenant
- `BackupFile` — arquivo listado do Storage

### Funções adicionadas em `store.tsx`
- `backupSettings: BackupSettings | null` — estado reativo das configs
- `loadBackupSettings()` — carrega do Supabase
- `saveBackupSettings({ enabled?, frequency? })` — upsert no Supabase
- `listBackups()` — lista arquivos do bucket `backups/{tenantId}`
- `triggerManualBackup()` — invoca Edge Function `auto-backup`
- `downloadBackupFile(path, filename)` — baixa arquivo do Storage

### Seção "Backups Automáticos" em `Database.tsx`
- Toggle ativar/desativar backup automático (salva em `backup_settings`)
- Seletor de frequência: Diário / Semanal
- Botão "Fazer Backup Agora" (chama `triggerManualBackup`)
- Lista de backups salvos no Storage com data, tamanho e botão de download
- Estado do último backup (`last_backup_at`)

### Deploy da Edge Function (necessário fazer no Supabase)
```bash
supabase functions deploy auto-backup
```
A função usa `SUPABASE_SERVICE_ROLE_KEY` (variável automática no ambiente da Edge Function).

### Bucket `backups` no Supabase Storage
- Criado manualmente (privado) — arquivos acessíveis apenas via SDK autenticado.

---

---

## ✅ Sessão 7 (cont.) — Níveis de Acesso por Hierarquia

### Novo role adicionado em `types.ts`
```ts
export enum UserRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',       // ← NOVO
  CONSULTOR = 'CONSULTOR',
  VISUALIZADOR = 'VISUALIZADOR'
}
```

### Hook `src/hooks/usePermissions.ts` *(novo)*
- `usePermissions(module: AppModule): ModulePermissions` — retorna `{ canView, canInsert, canEdit, canDelete }`
- `canAccessModule(role, module): boolean` — usado pelo `RoleGuard`
- **Matriz de permissões:**

| Módulo | ADMIN | GESTOR | CONSULTOR | VISUALIZADOR |
|---|:---:|:---:|:---:|:---:|
| Operação (dashboard, funil, clientes, acoesCs, atendimentosCs, agenda) | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ |
| Cadastro Geral (instituicoes, cursos, produtos, turmas, eventos, funis, activityTypes, lixeira) | ✅✅✅✅ | ✅✅✅✅ | ❌ | ❌ |
| Sistema (usuarios, database) | ✅✅✅✅ | ❌ | ❌ | ❌ |

*(V/I/E/D = canView/canInsert/canEdit/canDelete)*

### `App.tsx` — `RoleGuard` em todas as rotas
- Componente `<RoleGuard module="..." />` envolve cada `<Route>`
- Redireciona para `/` se `!canView`
- Rotas agrupadas: Operação / Cadastro Geral / Sistema

### `Sidebar.tsx` — reescrito
- 3 grupos de menu filtrados por role: **Operação**, **Cadastro Geral**, **Sistema**
- Componentes `NavLink` e `SmallNavLink` (React.FC) para dois estilos
- Badge de role no rodapé expandido (amber=Admin, emerald=Gestor, slate=Consultor/Visualizador)
- GESTOR vê Cadastro Geral mas não vê seção Sistema

### Páginas operacionais — permissões aplicadas
| Página | canInsert | canEdit | canDelete |
|---|---|---|---|
| `Funnel.tsx` | Botão "Novo Lead" | draggable, ações de stage | bulk delete |
| `Clients.tsx` | Exportar/Importar/Novo | Editar no painel lateral | Lixeira individual + bulk |
| `CSActions.tsx` | Importar/Nova Operação | Editar no painel lateral | bulk delete + delete individual |
| `CSDailyServices.tsx` | Importar/Novo Atendimento | Editar linha | Lixeira individual + bulk |
| `Agenda.tsx` | (só leitura — sem CRUD próprio) | — | — |

### `Admin/Users.tsx` — atualizado
- Dropdown de roles: adicionado `GESTOR` com descrição clara
- `getRoleBadge`: `GESTOR` → `emerald`
- Label na tabela: "Gestor" ao lado de Admin/Consultor/Visualizador

---

## ✅ Sessão 8 — HelpTooltip Fix, Padronização Tipográfica (2026-06-06)

### 🔧 Fix: HelpTooltip viewport-aware (`components/HelpTooltip.tsx`)

**Problema:** tooltip cortado nas bordas da tela quando o trigger ficava próximo das margens.

**Solução — reescrita completa:**
- `position: fixed` + `getBoundingClientRect()` para coordenadas relativas ao viewport
- `calcPosition(trigger, tooltipEl, preferredSide)` — testa o lado preferido, faz fallback (top→bottom→right→left) se não couber
- `Arrow` component calcula posição relativa ao centro do trigger
- Double `requestAnimationFrame` em `open()` para medir altura real do DOM
- Listeners de `scroll` (capture mode) e `resize` para reposicionar em tempo real
- `z-index: 99999` via inline style
- Constantes: `TOOLTIP_WIDTH=224`, `TOOLTIP_GAP=10`, `ARROW_SIZE=6`, `SCREEN_PADDING=8`
- Fix TS: `position = 'top' as Side` no destructure de props

---

### 🎨 Padronização Tipográfica Global

**Regras estabelecidas:**
- **H1 de páginas:** `text-2xl font-bold text-slate-900 uppercase tracking-wider`
- **Subtítulos de seção:** `text-sm font-semibold text-slate-900 uppercase tracking-wider`
- **`italic` removido** de todos os títulos, labels e empty states (exceto 3 `<option>` de placeholder em selects)

**Arquivos alterados (16):**

| Arquivo | Alterações |
|---|---|
| `Dashboard.tsx` | h1, 3×h3, span, empty state |
| `Funnel.tsx` | h1, 2×h3, 2× empty states |
| `Agenda.tsx` | h1, h2, label, 2× empty states |
| `CSDailyServices.tsx` | h1, h3, 3× inline italics removidos |
| `CSActions.tsx` | h1 |
| `Clients.tsx` | h1 |
| `UserProfile.tsx` | h1 |
| `Admin/Instituicoes.tsx` | h1 (`tracking-tight` → `tracking-wider`) |
| `Admin/Turmas.tsx` | h1 |
| `Admin/Produtos.tsx` | h1, empty state `italic` removido |
| `Admin/Eventos.tsx` | h1, span `italic` removido |
| `Admin/Trash.tsx` | h1 |
| `Admin/Backup.tsx` | h1 |
| `Admin/Database.tsx` | h1 |
| `components/GenericRegistry.tsx` | h1 (adicionado `uppercase tracking-wider`), empty state `italic` removido |
| `components/ClientProfileView.tsx` | 2× `italic` removidos (activity description + empty state) |

---

## ✅ Sessão 9 — Tipos de Demanda + Campos Completos em Atendimentos (2026-06-07)

### 🏷️ Nova entidade: `DemandType`

**`types.ts`:**
```ts
export interface DemandType {
  id: string;
  name: string;
  color: string;  // hex, ex.: '#f59e0b'
  createdAt: string;
}
```

**Tabela Supabase criada manualmente:**
```sql
CREATE TABLE demand_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#94a3b8',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`store.tsx`:**
- Estado `demandTypes: DemandType[]` + `setDemandTypes`
- Fetch via Supabase no `useEffect([tenantId])`
- Funções: `addDemandType`, `updateDemandType`, `deleteDemandType` (sem lixeira — exclusão direta)
- Expostos no `DataContext`

---

### 📋 `CSActions.tsx` — Tabs + Configurar Tipos de Demanda

**Estrutura com dois tabs** (igual ao padrão do Cronograma Mestre):
- **"Painel de Ações CS"** → tabela de ações (comportamento original)
- **"Configurar Tipos de Demanda"** → view `DemandTypesConfig`

**`DemandTypesConfig`:**
- Tabela com `name` + color swatch + ações (edit/delete)
- Color picker nativo (`<input type="color">`) para cada tipo
- Edição inline na linha da tabela (Enter salva, Escape cancela)
- Botão "+ Novo Tipo" abre formulário no topo da tabela
- Exclusão direta (sem soft delete — tipos não têm lixeira)

**Mudanças no modal `CSActionModal`:**
- "Tipo de Ação" → **"Tipo de Demanda"** em todos os labels
- Select agora é dinâmico: `demandTypes.map(...)` (substituiu opções hardcoded)
- Fallback "Outro (Livre)..." mantido para quando a lista está vazia
- IDs corrigidos: `crypto.randomUUID()` (antes usava `Date.now()`)

**Mudanças na tabela principal:**
- Header: "Campanha / Turma" → "Tipo de Demanda / Turma"
- Bolinha colorida ao lado do nome do tipo (cor vinda de `demandTypes`)
- Painel de detalhe lateral exibe o tipo com cor

**Exportação XLS:** coluna renomeada para "Tipo de Demanda"

---

### 📝 `CSDailyServices.tsx` — 17 campos completos

**Novas colunas em `cs_daily_services` (aplicadas no Supabase):**
```sql
ALTER TABLE cs_daily_services
  ADD COLUMN class_id        UUID,
  ADD COLUMN canal_contatado TEXT,
  ADD COLUMN demand_type_id  UUID,
  ADD COLUMN resolucao       TEXT,
  ADD COLUMN repasse         BOOLEAN DEFAULT FALSE,
  ADD COLUMN repasse_setor   TEXT,
  ADD COLUMN obs             TEXT,
  ADD COLUMN valor_venda     NUMERIC(12,2),
  ADD COLUMN retorno         DATE,
  ADD COLUMN remarketing     BOOLEAN DEFAULT FALSE,
  ADD COLUMN objecao         TEXT;
```

**`CSDailyService` em `types.ts`** — 11 campos opcionais adicionados:
`classId?`, `canalContatado?`, `demandTypeId?`, `resolucao?`, `repasse?`, `repasseSetor?`, `obs?`, `valorVenda?`, `retorno?`, `remarketing?`, `objecao?`

**Formulário `ServiceModal` — 17 campos em 4 blocos:**

| Bloco | Campos |
|---|---|
| Identificação | Data (padrão hoje), Canal Contatado, Telefone*, Nome (auto-link), Turma (select ou auto-detect) |
| Atendimento | Canal de Atendimento, Tipo de Demanda, Resumo*, Resolução da Demanda, Repasse? (toggle + setor condicional), OBS |
| Dados Comerciais | Valor de Venda (R$), Data de Retorno, Remarketing (toggle), Objeção |
| Controle | Status, Responsável |

**Tabela principal** — 7 colunas:
- Data / Canal, Identificação, Tipo de Demanda (bolinha colorida), Resumo + Resolução, Indicadores, Ações

**Coluna "Indicadores"** — badges automáticos:
- Status (Concluído / Aguardando Retorno)
- Repasse (rose) com setor
- Remarketing (amber)
- Retorno com data formatada (blue)
- Valor de Venda (emerald)

**Exportação XLS** — 19 colunas cobrindo todos os campos.

**Busca** — inclui tipo de demanda além dos campos originais.

---

---

## ✅ Sessão 10 — Nome do Plano + Tipo de Lote + Hardening de Segurança (2026-06-07)

### 🏷️ Nome do Plano e Tipo de Lote em `class_products`

**Migration aplicada manualmente no Supabase:**
```sql
ALTER TABLE class_products
  ADD COLUMN plan_name TEXT,
  ADD COLUMN lot_type  TEXT
    CHECK (lot_type IN (
      'PROMOCIONAL',
      'LOTE_1','LOTE_2','LOTE_3','LOTE_4',
      'LOTE_5','LOTE_6','LOTE_7','LOTE_8',
      'LOTE_SANTO'
    ));
```
Ambas as colunas opcionais (sem `NOT NULL`, sem `DEFAULT`).

**`types.ts`:**
```ts
export interface ClassProduct {
  // ... campos existentes ...
  planName?: string;   // ← NOVO — texto livre, ex.: "Plano Ouro"
  lotType?: string;    // ← NOVO — enum: PROMOCIONAL | LOTE_1 … LOTE_8 | LOTE_SANTO
}
```

**`store.tsx` — 4 pontos atualizados:**
- Select query: `plan_name, lot_type` incluídos em `class_products(...)`
- Deserialização: `planName: cp.plan_name ?? undefined`, `lotType: cp.lot_type ?? undefined`
- `addClassProduct`: `plan_name: cp.planName ?? null`, `lot_type: cp.lotType ?? null`
- `updateClassProduct`: mesmos campos no update

**`Turmas.tsx` — `ClassProductModal`:**
- Campo texto "Nome do Plano" (input livre, placeholder "Ex: Plano Ouro...")
- Select "Tipo de Lote" com 10 opções: Sem tipo / Promocional / Lote 1–8 / Lote Santo
- Estado inicial: `planName: ''`, `lotType: ''`
- Na listagem de produtos da turma: badge do lote ao lado de Único/Múltiplo + nome do plano ao lado do preço de tabela

**`ClientProfileView.tsx`:**
- Dropdown de produtos: texto da option inclui nome do plano e tipo de lote
- Badge contextual ao selecionar produto: pills extras de plano e lote

---

### 🔒 Hardening de Segurança — RLS com `auth.uid()`

**Problema identificado e corrigido:** As políticas originais usavam `current_setting('app.current_tenant_id', true)::uuid`, que é transaction-local e incompatível com o PostgREST do Supabase (cada request HTTP = transação nova, `current_setting` retorna `null` → queries silenciosamente vazias).

**Solução aplicada:** Todas as políticas foram reescritas para usar `auth.uid()` diretamente — o JWT de cada request já carrega o `sub` do usuário, e o PostgREST popula `auth.uid()` automaticamente em cada transação.

**SQL aplicado:**
- RLS reativado em **25 tabelas** (21 originais + `backup_settings` + `demand_types` + 2 junction tables)
- `DROP POLICY / CREATE POLICY tenant_isolation` em todas as tabelas com `tenant_id` direto → `USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid())`
- Junction tables (`class_courses`, `funnel_responsible_users`) → `EXISTS` com join na tabela pai verificando `auth.uid()`
- Função `set_tenant_id()` criada mas **não necessária** — `auth.uid()` resolve sem RPC auxiliar

**Status atual:**
- ✅ RLS ativa em todas as 25 tabelas
- ✅ Políticas usam `auth.uid()` (JWT-based, zero configuração no cliente)
- ✅ Isolamento multi-tenant garantido a nível de banco
- ✅ Filtros `.eq('tenant_id', tenantId)` no cliente mantidos como redundância (defesa em profundidade)

---

---

## ✅ Sessão 11 — Bug Fix IDs + Multi-usuário + Criação de Usuários pelo CRM (2026-06-07)

### 🐛 Bug Fix — IDs não-UUID em 12 pontos (causa: clientes sumiam ao recarregar)

**Causa raiz:** colunas `UUID NOT NULL` no Supabase rejeitam silenciosamente inserts com IDs no formato `cli-${Date.now()}`, `act-${Date.now()}` etc. O optimistic update mostrava o dado na UI, mas ele nunca persistia — na próxima recarga a lista aparecia vazia.

**Arquivos e pontos corrigidos (`Date.now()` / `Math.random()` → `crypto.randomUUID()`):**

| Arquivo | Pontos corrigidos |
|---|---|
| `pages/Clients.tsx` | `clients.id` (bulk import), `product_negotiations.id` (bulk import), `sales.id` (bulk import) |
| `pages/Funnel.tsx` | `clients.id` (novo lead), `client_activities.id` (novo lead), `client_activities.id` (mover lead), `client_activities.id` (venda rápida), `client_activities.id` (perda rápida) |
| `pages/Admin/Eventos.tsx` | `event_activities.id` (nova atividade) |
| `pages/Admin/Turmas.tsx` | `class_products.id` (edit), `class_products.id` (novo) |
| `store.tsx` | `class_products.id` (fallback em `addClassProduct`), `client_activities.id` (fallback em `addClientActivity`), `client_activities.id` (vínculo CS em `addCsDailyService`) |

**IDs de lixeira (`trash-${Date.now()}`) mantidos** — são localStorage-only, nunca vão ao Supabase.

---

### 🏢 Arquitetura Multi-Usuário — `organizations` + `user_organizations`

**Problema:** RLS usava `auth.uid()` como `tenant_id`, então apenas o usuário que criou os dados conseguia vê-los. Karem (CONSULTOR) e Luana (VISUALIZADOR) da mesma empresa não enxergavam os dados do Flavio (ADMIN).

**SQL gerado e aplicado (5 blocos):**

**Novas tabelas:**
```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_organizations (
  user_id        UUID     NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id         UUID     NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  is_super_admin BOOLEAN  NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, org_id)
);
-- Índices: idx_user_organizations_user, idx_user_organizations_org
```

**Funções helper para RLS (STABLE + SECURITY DEFINER):**
```sql
-- Retorna org_id do usuário autenticado (lookup O(1) via índice)
CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS UUID ...

-- Retorna true se o usuário tem is_super_admin = true
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN ...
```

**Políticas RLS reescritas em todas as 27 tabelas:**
```sql
-- Tabelas com tenant_id direto (23 tabelas):
USING (public.is_super_admin() OR tenant_id = public.current_org_id())
WITH CHECK (public.is_super_admin() OR tenant_id = public.current_org_id())

-- Junction tables (class_courses, funnel_responsible_users):
EXISTS (...tabela pai... AND tenant_id = public.current_org_id())
  OR public.is_super_admin()
```

**Estratégia zero-migração de dados:**
- `organizations.id` = UUID já existente como `tenant_id` nas tabelas
- Nenhuma linha nas 25 tabelas precisou ser alterada
- Adicionar novo colaborador à empresa = 1 INSERT em `user_organizations`

**`flavio.oliveira@grupo.top`** cadastrado com `is_super_admin = TRUE` → bypassa todas as políticas.

---

### 👤 Criação de Usuários pelo CRM — Edge Function `create-user`

**Arquitetura:**
```
Frontend (Admin) → supabase.functions.invoke('create-user') → Edge Function
  → verifica JWT + role ADMIN
  → lê org_id do chamador em user_organizations
  → auth.admin.createUser (service_role)  ← requer service_role key (nunca exposta no frontend)
  → INSERT public.users (mesmo UUID do Auth)
  → INSERT user_organizations
  → retorna { id, email, name, phone, role, status }
```

**`supabase/functions/create-user/index.ts`** *(novo)*
- Valida JWT do chamador via `supabase.auth.getUser(token)`
- Verifica `role = 'ADMIN'` na tabela `users`
- `email_confirm: true` — confirma email automaticamente (sem link)
- Rollback automático: se INSERT em `users` falhar, deleta o Auth user criado
- INSERT em `user_organizations` não-fatal (tabela pode estar em transição)
- Erros descritivos em português com status HTTP corretos (401/403/400/422/500)
- Deploy: `supabase functions deploy create-user`

**`pages/Admin/Users.tsx`** *(reescrito)*
- Removido `GenericRegistry` — tabela própria com controle total
- `UserModal` modo **criar**: todos os campos + campo senha; chama Edge Function via `supabase.functions.invoke`
- `UserModal` modo **editar**: email readonly + aviso, senha oculta; chama `updateUser` do store
- Loading spinner + erro inline em ambos os modos (zero `alert()`)
- Botão **"Resetar"** por linha → `supabase.auth.resetPasswordForEmail()` com feedback visual (idle → sending → sent/error → idle após 4s)
- Botão editar (lápis) e excluir (lixeira) por linha
- Excluir usa `ConfirmModal` (padrão do projeto)
- Usuário logado não pode se autoexcluir
- Cards de roles expandidos para 4 níveis (Admin / Gestor / Consultor / Visualizador)

**`store.tsx`** *(atualizado)*
- `addUser` **removido** da interface `DataContext`, implementação e valor do contexto
- `updateUser` **corrigido**: persiste apenas `name`, `role`, `phone`, `status` — nunca email nem senha (gerenciados pelo Supabase Auth)
- Estado local atualizado via `setUsers` direto em `Users.tsx` após resposta da Edge Function

---

## ✅ Sessão 12 — UX Padronização, Turmas do Projeto, Painel de Ações e Sininho (2026-06-08)

### Painel de Detalhes — padrão oficial aplicado em todos os módulos

O padrão aprovado no FunnelConfig/Agenda foi propagado para todos os painéis restantes:

| Módulo | Mudança |
|--------|---------|
| `pages/Clients.tsx` | Toggle no click do row + `rounded-[2.5rem]` + `animate-in slide-in-from-right-4 duration-200` |
| `pages/CSActions.tsx` | Painel lateral criado do zero — mesmo padrão |
| `pages/Admin/Instituicoes.tsx` | Toggle + card arredondado padronizado |
| `pages/Admin/Turmas.tsx` | Toggle + card arredondado padronizado |

**Regras do padrão:**
- Sem backdrop/blur
- Container `flex gap-4`; lista encolhe quando painel abre
- `w-[480–580px] flex-shrink-0 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm`
- Toggle: clicar no mesmo item fecha o painel (`prev === id ? null : id`)
- Animação: `animate-in slide-in-from-right-4 duration-200`

---

### Turmas dentro do Projeto (`project_classes`)

**Nova tabela Supabase:**
```sql
CREATE TABLE IF NOT EXISTS public.project_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolate_project_classes" ON public.project_classes
  USING (tenant_id = current_org_id()) WITH CHECK (tenant_id = current_org_id());
```

**`types.ts`** — novo interface:
```typescript
export interface ProjectClass {
  id: string;
  projectId: string; // FK → ClassRoom.id
  name: string;
  createdAt: string;
}
```

**`store.tsx`** — adições:
- Estado `projectClasses: ProjectClass[]`
- useEffect de fetch da tabela `project_classes`
- CRUD: `addProjectClass`, `updateProjectClass`, `deleteProjectClass` (com optimistic update + rollback)
- Exportados no DataContext

**`pages/Admin/Turmas.tsx`** — seção "Turmas do Projeto" no painel de detalhes:
- Campo de texto + botão "Adicionar" (Enter ativa)
- Lista com inline edit (clique no lápis → input com Enter/Escape/Save)
- Delete via `ConfirmModal`
- Estados: `newPCName`, `editingPCId`, `editingPCName`

---

### Botão "Cadastrar Funil" no Projeto

No painel de detalhes de Turmas, botão que:
1. Verifica `funnels.find(f => f.name.toLowerCase() === selectedClass.name.toLowerCase())`
2. Se já existe → banner âmbar "Funil já existe"
3. Se não existe → cria funil com 5 etapas padrão via `addFunnel`
4. Banner feedback auto-dismiss em 4s (emerald = criado, amber = já existe)

**Etapas padrão ao criar qualquer funil:**
```typescript
const DEFAULT_STAGES = [
  { name: 'Sem Contato',      color: '#94a3b8' },
  { name: 'Contatado',        color: '#f59e0b' },
  { name: 'Proposta Enviada', color: '#3b82f6' },
  { name: 'Negociação',       color: '#8b5cf6' },
  { name: 'Fechamento',       color: '#10b981' },
];
```
Aplicado tanto no botão "Cadastrar Funil" quanto ao criar novo funil no `FunnelConfig`.

---

### Sub-menu "Tipo de Canal" no Painel de Ações

**Nova tabela Supabase:**
```sql
CREATE TABLE IF NOT EXISTS public.channel_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#94a3b8',
  tenant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channel_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolate_channel_types" ON public.channel_types
  USING (tenant_id = current_org_id()) WITH CHECK (tenant_id = current_org_id());
```

**`types.ts`** — novo interface:
```typescript
export interface ChannelType {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}
```

**`store.tsx`** — adições:
- Estado `channelTypes: ChannelType[]`
- CRUD: `addChannelType`, `updateChannelType`, `deleteChannelType`

**`pages/CSActions.tsx`** — terceiro tab:
- Tab type mudou para `'painel' | 'canais' | 'tipos'`
- Tab "Tipo de Canal" com ícone `Palette`
- Componente inline `ChannelTypesConfig` (mesmo padrão do `DemandTypesConfig`)

---

### Campo Custo + CAC no Painel de Ações

**SQL:**
```sql
ALTER TABLE public.cs_actions ADD COLUMN IF NOT EXISTS cost numeric(12,2) DEFAULT 0;
```

**`types.ts`** — `CSAction` atualizado:
```typescript
cost?: number; // após channel
```

**`store.tsx`** — `mapCSActionRow` e CRUD atualizados para incluir `cost`.

**`CSActionModal`** — Campo "13. Custo (R$)" (rose-themed, `type="number"`, `step="0.01"`).

**Painel de detalhes** — grid 2→4 cards:
| Card | Cor | Valor |
|------|-----|-------|
| Custo Total | rose | `action.cost` |
| Atingidos / Respostas | slate-900 | `totalReached` / `totalResponses` |
| Faturamento + ROI | emerald | `revenueResult` + ROI líquido (`revenueResult - cost`) |
| CAC | purple | `cost / totalReached` (null se sem dados) |

---

### Sininho — próximas 10 atividades

**`components/Header.tsx`** — `upcomingActivities` useMemo expandido:
- Adicionado filtro de `csActions`: `a.endDate >= todayStr && a.status !== 'FEITO'`
- Campo `link` por tipo: `'/clientes'` (task), `'/admin/eventos'` (event), `'/acoes-cs'` (action)
- Limite: 5 → **10**
- Render: cada item é um `<Link to={act.link}>` com ícone por tipo (ListTodo/Zap/Calendar) e badge colorido (Tarefa/Ação CS/Evento)
- Badge header: "pendentes" → "próximas"

---

### Canal Contatado fixo — `CSDailyServices.tsx`

Substituído array de 7 opções por lista fixa de 3:
```typescript
const CANAL_CONTATADO_OPTIONS = ['API', 'CS1', 'CS2'];
```
*(futuramente virá de cadastro — base para o módulo de Canal)*

---

### FunnelConfig — painel de detalhes reescrito

Substituído layout baseado em `GenericRegistry` por:
- Lista clicável de funis (esquerda)
- Painel de detalhes (direita) com:
  - Etapas com barras de progresso + contagem de clientes por etapa
  - Botão de export XLS por etapa (aparece no hover)
  - Botão "Exportar Funil Completo" (XLSX com todas as etapas em abas)
  - Botões Edit / Delete

**Imports adicionados:** `useMemo`, `Download`, `FileSpreadsheet`, `Edit3`, `GitBranch`, `* as XLSX`

---

### Fixes da sessão

- **`FunnelConfig.tsx`** — variável `funnelColumns` e tipo `Column` removidos (dead code que causava erro TS após reescrita do JSX)
- **`Agenda.tsx`** — painel de detalhes usava campos inexistentes (`e.location`, `e.responsible`, `a.objective`, `a.result`); corrigido para campos reais dos tipos
- **`store.tsx`** — `channelTypes` estava duplicado no objeto do Provider (linha 2349 + 2361); removido da linha 2349

---

## ✅ Sessão 13 — Fix Atendimentos + Painel de Detalhes Global (2026-06-08)

### 🐛 Bug Fix — `addCSDailyService` não persistia após reload

**Causa raiz 1:** `responsible_user_id` era `NOT NULL` no banco mas o código enviava um valor que não existia na tabela `users` (o `currentUser.id` é o auth.uid, nem sempre cadastrado na tabela pública `users`), causando FK constraint violation silenciosa.

**Causa raiz 2:** `addCSDailyService` era fire-and-forget — erros do Supabase não revertiam o optimistic update nem alertavam o usuário.

**Causa raiz 3:** `cs_actions` SELECT no fetch não incluía a coluna `cost` (adicionada na Sessão 12), fazendo o campo sempre mostrar 0 após reload.

**SQL aplicado no Supabase:**
```sql
-- Torna opcionais os campos FK de cs_daily_services
ALTER TABLE public.cs_daily_services
  ALTER COLUMN responsible_user_id DROP NOT NULL,
  ALTER COLUMN client_id           DROP NOT NULL,
  ALTER COLUMN class_id            DROP NOT NULL,
  ALTER COLUMN demand_type_id      DROP NOT NULL;

-- RLS corrigida para usar current_org_id() em vez de auth.uid()
DROP POLICY IF EXISTS tenant_isolation ON public.cs_daily_services;
CREATE POLICY tenant_isolation ON public.cs_daily_services
  FOR ALL
  USING  (public.is_super_admin() OR tenant_id = public.current_org_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.current_org_id());

-- SQL da Timeline (aplicado no início da sessão)
ALTER TABLE public.client_activities ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE TABLE IF NOT EXISTS public.project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'note',
  description TEXT NOT NULL,
  user_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolate_project_activities" ON public.project_activities
  USING (tenant_id = current_org_id()) WITH CHECK (tenant_id = current_org_id());
```

**Fixes em `store.tsx`:**
- `addCSDailyService` → async + rollback no erro + `alert()` com mensagem real
- Validação de FKs antes de qualquer insert/update: `responsible_user_id`, `client_id`, `class_id`, `demand_type_id` validados contra estado local (se ID não existir → `null`)
- Mesmo padrão aplicado em `updateCSDailyService`
- `cost` adicionado ao SELECT de `cs_actions` (estava faltando desde Sessão 12)

---

### 🎨 Padrão Painel de Detalhes — aplicado em todos os módulos faltantes

**Padrão oficial consolidado:**
- Card `rounded-[2.5rem] border border-slate-200 shadow-sm bg-white`
- `flex-shrink-0` com largura fixa (`w-[380–580px]`)
- Sem backdrop / sem overlay
- Toggle: clicar no mesmo item fecha (`prev === id ? null : id`)
- Animação: `animate-in slide-in-from-right-4 duration-200`
- Cabeçalho: título + botões [Editar] [Excluir] [Fechar]
- Container pai: `flex gap-4` com lista `flex-1 min-w-0`

**Módulos atualizados nesta sessão:**

| Módulo | Arquivo | Toggle | Card arredondado | Trash no header | duration-200 |
|--------|---------|:------:|:----------------:|:---------------:|:------------:|
| Atendimentos Diários | `CSDailyServices.tsx` | ✅ já tinha | ✅ já tinha | ✅ adicionado | ✅ já tinha |
| Catálogo de Vendas | `Admin/Produtos.tsx` | ✅ adicionado | ✅ migrado | ✅ adicionado | ✅ corrigido |
| Cronograma Mestre | `Admin/Eventos.tsx` | ✅ adicionado | ✅ migrado | ✅ movido do rodapé | ✅ corrigido |
| Negociações (Kanban) | `Funnel.tsx` | ✅ adicionado | ✅ adicionado | ✅ adicionado | ✅ corrigido |

**Observação Funnel:** por ser Kanban com scroll horizontal, o painel usa `fixed right-6 top-24 bottom-6 z-[100] w-[480px]` — flutua sobre o kanban sem encolher as colunas. Sem backdrop. O ClientProfileView é exibido dentro do painel.

**Módulos já com padrão aplicado (Sessões anteriores):**
- `Clients.tsx`, `CSActions.tsx`, `Admin/Instituicoes.tsx`, `Admin/Turmas.tsx`, `Admin/FunnelConfig.tsx`, `Agenda.tsx`

---

## ✅ Sessão 14 — Timeline de Atividades, Dashboard e Verificação Cruzada (2026-06-08)

### 🕐 Timeline de Atividades

#### `types.ts`
- `Activity` recebeu `userId?: string` e dois novos tipos: `'move'` e `'sale'`
- Novo interface `ProjectActivity` com campos `id`, `projectId`, `type`, `description`, `userId?`, `timestamp`

#### `components/ActivityTimeline.tsx` *(novo)*
Componente reutilizável com:
- Linha vertical conectando entradas (timeline clássica)
- Ícone por tipo: `MessageSquare` (note), `Phone` (call), `Mail` (email), `Users` (meeting), `ArrowRight` (move), `DollarSign` (sale)
- Badge colorido por tipo (slate, amber, blue, violet, sky, emerald)
- Nome do usuário responsável por entrada (lookup via `users[]`)
- Data/hora formatada (`toLocaleString pt-BR`)
- Campo textarea + select de tipo + botão "Registrar" (hidden quando `isReadOnly`)
- `maxVisible` prop com botão "Ver todas (N)" / "Mostrar menos"
- Props: `entries`, `users`, `onAddNote`, `isReadOnly`, `maxVisible`

#### `store.tsx`
- `addClientActivity`: enriquece activity com `userId: currentUser?.id` antes de persistir; inclui `user_id` no insert do Supabase
- Estado `projectActivities: ProjectActivity[]` adicionado
- `useEffect` de fetch da tabela `project_activities` (ordenado por `timestamp DESC`)
- `addProjectActivity(projectId, entry)`: async com optimistic update + rollback; persiste na tabela `project_activities`
- `ProjectActivity` importado de `./types`
- Interface `DataContext` atualizada com `projectActivities` e `addProjectActivity`
- Ambos expostos no Provider value

#### `components/ClientProfileView.tsx`
- Import `ActivityTimeline` adicionado
- `users` extraído do `useData()`
- `handleAddActivity` reescrito para receber `(text, type?)` — assinatura compatível com o componente
- Seção "Histórico de Atividades" substituída por `<ActivityTimeline entries={client.activities} users={users} onAddNote={handleAddActivity} maxVisible={5} />`
- `HistoryModal` removido (funcionalidade de "ver todas" agora é nativa no componente)
- `visibleActivities` removido (não mais necessário)
- `isHistoryModalOpen` removido

#### `pages/Admin/Turmas.tsx`
- Import `ActivityTimeline` e `MessageSquare` adicionados
- `projectActivities`, `addProjectActivity`, `currentUser` extraídos do `useData()`
- Nova seção "Timeline / Notas" inserida entre "Turmas do Projeto" e "Cronograma da Turma"
- `onAddNote` chama `addProjectActivity(selectedClassId, { type, description, userId: currentUser?.id, timestamp })`

---

### 📊 Dashboard Melhorado

**Novos dados no `Dashboard.tsx`:**
- `csActions` adicionado ao `useData()`
- 3 novos `useMemo` calculados independentemente dos filtros de data/funil

**Grid de 3 cards inserida entre os StatCards e os gráficos:**

| Card | Cálculo | Visual |
|------|---------|--------|
| **Meta Total dos Projetos** | Soma de `goalQuantity` e `goalValue` de todos os `classProducts` de todos os projetos | Fundo branco, ícone `Target` amber; breakdown Volume + VGV |
| **Custos × Faturamento** | `csActions[].cost` total vs `sales[].value` total; ROI = `(fat - custo) / custo × 100` | Fundo `slate-900`, barra proporcional, ROI emerald/rose |
| **Campanhas (Ações CS)** | Total de `csActions`; ativas = status ≠ FEITO/ENCERRADO | Fundo branco, ícone `Megaphone` violet; breakdown ativas/encerradas |

**Novos ícones importados:** `Megaphone`, `TrendingDown`, `BarChart2`

---

### 🔗 Verificação Cruzada Atendimentos × Clientes

#### Helper `normalizePhone`
```ts
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
```
- Definido em `store.tsx` (dentro do DataProvider) e duplicado em `CSDailyServices.tsx` (escopo de módulo)
- Usado em **todos** os pontos de comparação de telefone

#### `store.tsx` → `addClient` (ampliado)
- Comparação de telefone agora usa `normalizePhone` em ambos os lados
- Retroativo além de setar `clientId` agora também atualiza:
  - `clientNameManual = client.name`
  - `classId = client.classId` (apenas para atendimentos sem turma)
- Supabase: dois updates separados — `client_id + client_name_manual` para todos os órfãos; `class_id` apenas para os sem turma (via `.in('id', orphansWithoutClass.map(o => o.id))`)

#### `store.tsx` → `updateClient` (novo comportamento)
Ao editar qualquer campo de um cliente, propaga silenciosamente para todos os atendimentos com o mesmo telefone:
- **Estado local:** `clientId`, `clientNameManual` (cliente sempre vence), `classId` (só preenche se vazio)
- **Supabase:** `client_id + client_name_manual` para todos os vinculados; `class_id` apenas para os sem turma

#### `CSDailyServices.tsx` → Banner de divergência
- `normalizePhone` local para comparação no `matchedClient`
- Estado `divergenceDismissed` controla visibilidade do banner
- `useMemo divergence`: só calcula quando `serviceToEdit` existe + `matchedClient` existe + não foi descartado
  - Detecta `nameDiffers`: `serviceToEdit.clientNameManual !== matchedClient.name`
  - Detecta `classDiffers`: `serviceToEdit.classId !== matchedClient.classId`
- **Banner âmbar** (não-bloqueante, `animate-in slide-in-from-top-2`):
  - Mostra os valores divergentes (nome: antes → depois; turma no cliente)
  - Botão **"Sincronizar com cliente"**: atualiza `formData.clientNameManual` e `classId` + fecha banner
  - Botão **"Manter atual"**: fecha banner sem alterar dados
  - Botão ✕: fecha banner
- Aparece **apenas ao editar** atendimento existente com divergência real

---

## 🗺️ Próximos passos (Sessão 15+)

### 1. Testes gerais e correções de bugs
- Testar fluxo completo: criar cliente → atendimentos retroativos vinculados
- Testar atualização de cliente → atendimentos atualizados
- Testar banner de divergência ao editar atendimento com dados desatualizados
- Verificar `ActivityTimeline` em Clientes e Turmas com dados reais

### 2. Importação em massa com persistência completa
- `BulkImportModal` — revisar se atendimentos importados via planilha passam pela verificação cruzada
- Garantir que IDs gerados na importação são `crypto.randomUUID()` em todos os módulos

### 3. Deploy online
- Build de produção + hospedagem (Vercel / Netlify / servidor próprio)
- Configurar variáveis de ambiente de produção
- Testar RLS em ambiente limpo com múltiplos usuários

### 4. Deploy das Edge Functions (pendente desde Sessão 11)
- `supabase functions deploy create-user`
- `supabase functions deploy auto-backup`

### 5. Integrações futuras
- **WhatsApp**: integração com API (envio de mensagens a partir de atendimentos)
- **ARES**: integração com sistema ERP para sincronização de vendas e dados de formandos

---

## Variáveis de ambiente (`.env.local`)

```
VITE_SUPABASE_URL=https://uramvivojfqrkbqyiavg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OWNER_EMAIL=<email do proprietário para notificações de reset>
```

---

## Observações técnicas importantes

1. **`tenantId`** no store = UUID do usuário autenticado no Supabase Auth. Cada usuário autenticado é seu próprio tenant.

2. **RLS ativa** — políticas usam `auth.uid()` (JWT-based). Filtros `.eq('tenant_id', tenantId)` no cliente mantidos como redundância.

3. **`funnel_stages.order`** é palavra reservada no PostgreSQL — criado como `"order"` na migration.

4. O projeto usa **`HashRouter`** (URLs com `#`) — compatível com deploy estático.

5. O alias **`@`** mapeia para a raiz do projeto (`vite.config.ts` + `tsconfig.json`).

6. **`AuthSync`** em `App.tsx` roda fora do `ProtectedRoute`, retorna `null`, serve só para o `useEffect` de sincronização de sessão.

7. **Erro pré-existente não bloqueante:** `src/lib/supabase.ts(3,33): error TS2339: Property 'env' does not exist on type 'ImportMeta'` — não afeta runtime com Vite.

8. **`events.id`** deve ser UUID válido — usar `crypto.randomUUID()`. Campo `end_date_time` é `NOT NULL` — usar `event.endDateTime || event.startDateTime || new Date().toISOString()` como fallback.

9. **Trash entityTypes válidos:** `'institution' | 'course' | 'product' | 'productCategory' | 'class' | 'user' | 'funnel' | 'event' | 'client' | 'csAction' | 'activityType' | 'csDailyService'`

10. **`logo-top.png.png`** — nome com extensão dupla (arquivo salvo assim pelo usuário). Referenciado como `/assets/logo-top.png.png` no código. Não renomear sem atualizar Sidebar.tsx e LoginPage.tsx.

11. **`class_products.sale_limit`** — coluna adicionada manualmente no Supabase via ALTER TABLE na Sessão 6. Não consta no arquivo `001_initial_schema.sql` original. Valor padrão: `'MULTIPLO'`.

12. **`class_products.plan_name` e `class_products.lot_type`** — colunas adicionadas manualmente na Sessão 10. Ambas opcionais (nullable, sem default). `lot_type` tem CHECK constraint com 10 valores válidos.

13. **RLS — arquitetura multi-usuário (Sessão 11):** políticas usam `public.current_org_id()` e `public.is_super_admin()`. O `tenant_id` nas tabelas = `org_id` da organização (não mais `auth.uid()` individual). Adicionar colaborador = INSERT em `user_organizations(user_id, org_id)`.

14. **`addUser` removido do store (Sessão 11)** — criação de usuários passa pela Edge Function `create-user`. Estado local atualizado via `setUsers` direto em `Users.tsx`. `updateUser` persiste apenas `name`, `role`, `phone`, `status`.

15. **Edge Functions disponíveis:**
    - `supabase/functions/auto-backup/index.ts` — backup automático agendado
    - `supabase/functions/create-user/index.ts` — criação de usuário com Auth + tabela + org
    - Deploy: `supabase functions deploy <nome>`

16. **IDs — regra absoluta:** sempre `crypto.randomUUID()` para qualquer entidade que vá ao Supabase. `Date.now()` e `Math.random()` só são aceitáveis para IDs de localStorage (ex.: `trash-${Date.now()}`).

17. **Painel de Detalhes — padrão oficial (Sessões 12–13):** sem backdrop, card `rounded-[2.5rem]` flutuante, toggle no click (clicar no mesmo item fecha), `animate-in slide-in-from-right-4 duration-200`, cabeçalho com [Editar][Excluir][Fechar]. Aplicado em **todos os módulos**: FunnelConfig, Agenda, Clients, CSActions, Instituicoes, Turmas, CSDailyServices, Produtos, Eventos, Funnel. **Exceção Funnel:** painel usa `fixed right-6 top-24 bottom-6` por ser Kanban com scroll horizontal.

18. **`project_classes` (Sessão 12):** tabela nova `public.project_classes` com `project_id` FK para `classes`. CRUD no store (`addProjectClass`, `updateProjectClass`, `deleteProjectClass`) com optimistic update + rollback. Interface `ProjectClass` em `types.ts`.

19. **`channel_types` (Sessão 12):** tabela nova `public.channel_types`. CRUD no store. Interface `ChannelType` em `types.ts`. Exibida no terceiro tab do Painel de Ações.

20. **`cs_actions.cost` (Sessão 12):** coluna `numeric(12,2) DEFAULT 0` adicionada via `ALTER TABLE`. Campo `cost?: number` no interface `CSAction`. CAC calculado no painel: `cost / totalReached`.

21. **`CANAL_CONTATADO_OPTIONS` (Sessão 12):** fixo em `['API', 'CS1', 'CS2']` em `CSDailyServices.tsx`. Futuramente virá de cadastro (base `channel_types`).

22. **Etapas padrão de funil (Sessão 12):** ao criar qualquer funil (FunnelConfig ou botão "Cadastrar Funil" em Turmas), 5 etapas são auto-inseridas: Sem Contato (#94a3b8), Contatado (#f59e0b), Proposta Enviada (#3b82f6), Negociação (#8b5cf6), Fechamento (#10b981).

23. **`ActivityTimeline` (Sessão 14):** componente reutilizável em `components/ActivityTimeline.tsx`. Props: `entries: Activity[] | ProjectActivity[]`, `users?: User[]`, `onAddNote?: (text, type?) => void`, `isReadOnly?: boolean`, `maxVisible?: number`. Usado em `ClientProfileView.tsx` (histórico de clientes) e `Admin/Turmas.tsx` (notas de projetos). Tabela `project_activities` no Supabase com RLS via `current_org_id()`.

24. **`Activity.type` (Sessão 14):** tipo expandido para `'call' | 'email' | 'meeting' | 'note' | 'move' | 'sale'`. Campo `userId?: string` adicionado. Interface `ProjectActivity` criada em `types.ts`.

25. **`normalizePhone` (Sessão 14):** helper `(phone: string) => phone.replace(/\D/g, '')` definido no DataProvider (`store.tsx`) e no módulo `CSDailyServices.tsx`. Usar em **todos** os pontos de comparação de telefone para evitar divergência por formatação.

26. **Verificação cruzada atendimentos × clientes (Sessão 14):**
    - `addClient`: retroativo propaga `clientId + clientNameManual + classId` para atendimentos órfãos pelo telefone normalizado
    - `updateClient`: propaga `clientId + clientNameManual` (cliente sempre vence) e `classId` (apenas se vazio) para todos os atendimentos com mesmo telefone
    - `ServiceModal` em `CSDailyServices.tsx`: banner âmbar de divergência ao editar atendimento existente cujos dados diferem do cliente vinculado; botões "Sincronizar com cliente" / "Manter atual"

27. **Dashboard (Sessão 14):** 3 cards novos em grid de 3 colunas entre os StatCards e os gráficos: "Meta Total dos Projetos" (soma de `goalValue/goalQuantity` de todos os `classProducts`), "Custos × Faturamento" (ROI geral de `cs_actions` vs `sales`), "Campanhas" (total de `csActions` com breakdown ativas/encerradas). Independentes dos filtros de data/funil do dashboard.
