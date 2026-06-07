# CRM-TOP — Contexto de Desenvolvimento

> Atualizado em: 2026-06-06 (Sessão 7 — em andamento)
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

## 🗺️ Próximos passos (Sessão 8+)

### 1. Hardening de segurança (pré-lançamento)
- Reativar RLS no Supabase com `set_config('app.current_tenant_id', ...)` no cliente
- Auditar todas as queries para garantir `tenant_id` em todos os filtros
- Remover dados de dev/seed do banco antes do go-live

### 3. Hardening de segurança (pré-lançamento)
- Reativar RLS no Supabase com `set_config('app.current_tenant_id', ...)` no cliente
- Auditar todas as queries para garantir `tenant_id` em todos os filtros
- Remover dados de dev/seed do banco antes do go-live

### 4. Integração WhatsApp + Agente ARES
- Webhook para receber mensagens do WhatsApp e criar `CSDailyService` automaticamente
- Agente ARES: assistente IA para triagem e resposta automática de leads
- Vínculo automático entre número de telefone e `client_id`

### 5. App mobile para diretoria
- Dashboard executivo (KPIs, conversão, faturamento) em React Native ou PWA
- Notificações push para ações críticas (leads novos, metas atingidas)

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

2. **RLS desativada** — isolamento feito apenas por `.eq('tenant_id', tenantId)` nas queries.

3. **`funnel_stages.order`** é palavra reservada no PostgreSQL — criado como `"order"` na migration.

4. O projeto usa **`HashRouter`** (URLs com `#`) — compatível com deploy estático.

5. O alias **`@`** mapeia para a raiz do projeto (`vite.config.ts` + `tsconfig.json`).

6. **`AuthSync`** em `App.tsx` roda fora do `ProtectedRoute`, retorna `null`, serve só para o `useEffect` de sincronização de sessão.

7. **Erro pré-existente não bloqueante:** `src/lib/supabase.ts(3,33): error TS2339: Property 'env' does not exist on type 'ImportMeta'` — não afeta runtime com Vite.

8. **`events.id`** deve ser UUID válido — usar `crypto.randomUUID()`. Campo `end_date_time` é `NOT NULL` — usar `event.endDateTime || event.startDateTime || new Date().toISOString()` como fallback.

9. **Trash entityTypes válidos:** `'institution' | 'course' | 'product' | 'productCategory' | 'class' | 'user' | 'funnel' | 'event' | 'client' | 'csAction' | 'activityType' | 'csDailyService'`

10. **`logo-top.png.png`** — nome com extensão dupla (arquivo salvo assim pelo usuário). Referenciado como `/assets/logo-top.png.png` no código. Não renomear sem atualizar Sidebar.tsx e LoginPage.tsx.

11. **`class_products.sale_limit`** — coluna adicionada manualmente no Supabase via ALTER TABLE na Sessão 6. Não consta no arquivo `001_initial_schema.sql` original. Valor padrão: `'MULTIPLO'`.
