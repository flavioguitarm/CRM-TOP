# CRM-TOP — Contexto de Desenvolvimento

> Atualizado em: 2026-06-06 (Sessão 5)
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
├── src/
│   ├── lib/supabase.ts             # Cliente Supabase (createClient com variáveis de ambiente)
│   ├── hooks/useAuth.ts            # AuthProvider + useAuth (session, signIn, signOut)
│   └── components/Auth/
│       ├── LoginPage.tsx           # Tela de login (email + senha, visual dark slate/amber)
│       ├── ForgotPasswordPage.tsx  # Tela "esqueci minha senha" (envia email via Supabase Auth)
│       └── ResetPasswordPage.tsx   # Tela de redefinição de senha (supabase.auth.updateUser)
│
├── components/
│   ├── Header.tsx                  # Barra superior (notificações, menu do usuário, logout)
│   ├── Sidebar.tsx                 # Menu lateral (Operação + Cadastro Geral para ADMIN)
│   ├── BulkImportModal.tsx         # Modal de importação em massa via planilha
│   └── GenericRegistry.tsx         # Tabela genérica com busca, seleção e ações CRUD
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Funnel.tsx                  # Kanban de funil de vendas
│   ├── Clients.tsx                 # Lista e perfil de clientes
│   ├── CSActions.tsx               # Ações de Customer Success
│   ├── CSDailyServices.tsx         # Atendimentos diários CS
│   ├── Agenda.tsx                  # Agenda de tarefas e eventos
│   └── Admin/
│       ├── Instituicoes.tsx        # CRUD de instituições
│       ├── Cursos.tsx              # CRUD de cursos
│       ├── Turmas.tsx              # CRUD de turmas (com produtos e timeline)
│       ├── Produtos.tsx            # CRUD de produtos e categorias
│       ├── Eventos.tsx             # CRUD de eventos
│       ├── Users.tsx               # CRUD de usuários
│       ├── FunnelConfig.tsx        # Configuração de funis e etapas
│       ├── ActivityTypes.tsx       # Tipos de atividade
│       ├── Database.tsx            # Export/import/reset do banco (legacy)
│       ├── Backup.tsx              # Backup & Restore completo (exportAllData / importAllData)
│       └── Trash.tsx               # Lixeira (restore de itens deletados)
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Schema completo (RLS desativada para dev — ver abaixo)
```

---

## Autenticação (concluída)

- **Supabase Auth** via `src/hooks/useAuth.ts` (`AuthProvider` + `useAuth`)
- `AuthProvider` envolve toda a árvore em `App.tsx`
- `ProtectedRoute` gerencia três views: `'login'` → `LoginPage`, `'forgot'` → `ForgotPasswordPage`, `'reset'` → `ResetPasswordPage`
- Listener `onAuthStateChange` detecta `PASSWORD_RECOVERY` e ativa view `'reset'` automaticamente
- `AuthSync` (componente interno em `App.tsx`) sincroniza `session.user` → `currentUser` do store:
  - Busca o usuário por e-mail no array `users` do store
  - Fallback: cria perfil mínimo com `role: 'ADMIN'` (padrão enquanto tabela `users` não for fonte de verdade)
- Logout em `Header.tsx` chama `useAuth().signOut()`
- `tenantId` no store = `supabase.auth.getSession().user.id` (usuário Auth = tenant)

---

## Banco de dados — Schema (`001_initial_schema.sql`)

Tabelas criadas com **`tenant_id UUID NOT NULL`** em todas:

| Tabela | Descrição |
|---|---|
| `users` | Usuários do sistema |
| `institutions` | Instituições de ensino |
| `courses` | Cursos acadêmicos |
| `product_categories` | Categorias de produtos |
| `products` | Produtos comercializados |
| `classes` | Turmas de formandos |
| `class_courses` | N:N turmas ↔ cursos (junction, sem tenant_id direto) |
| `class_products` | Produtos por turma com metas |
| `class_timeline_events` | Timeline de marcos da turma |
| `funnels` | Funis de vendas |
| `funnel_stages` | Etapas de funil |
| `funnel_responsible_users` | N:N funis ↔ usuários (junction, sem tenant_id direto) |
| `clients` | Clientes / formandos |
| `client_activities` | Histórico de interações com cliente |
| `client_tasks` | Tarefas agendadas por cliente |
| `activity_types` | Tipos de atividade configuráveis |
| `events` | Eventos (formaturas, calouradas etc.) |
| `event_activities` | Log de atividades de evento |
| `cs_actions` | Ações de Customer Success |
| `cs_action_activities` | Log de atividades CS |
| `cs_daily_services` | Atendimentos diários CS |
| `sales` | Vendas realizadas |
| `product_negotiations` | Negociações em pipeline |

### ⚠️ RLS — Status atual: DESATIVADA para desenvolvimento

A RLS foi **desativada em todas as tabelas** via SQL executado direto no Supabase Dashboard:

```sql
ALTER TABLE users                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions            DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories      DISABLE ROW LEVEL SECURITY;
ALTER TABLE products                DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_courses           DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_products          DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_timeline_events   DISABLE ROW LEVEL SECURITY;
ALTER TABLE funnels                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages           DISABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_responsible_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities       DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks            DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types          DISABLE ROW LEVEL SECURITY;
ALTER TABLE events                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_activities        DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_actions              DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_action_activities    DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs_daily_services       DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_negotiations    DISABLE ROW LEVEL SECURITY;
```

**Motivo:** A política criada no schema exige `set_config('app.current_tenant_id', uuid, true)` na sessão antes de cada query, o que ainda não foi implementado no cliente Supabase. Com RLS ativa sem esse config, todas as queries retornavam zero resultados.

**Para reativar no futuro:** implementar um wrapper no `supabase.ts` que chame `rpc('set_tenant', { tid: tenantId })` antes das queries, ou usar `supabase.rpc` com uma função PostgreSQL que faça o `set_config`. As políticas já estão criadas no schema — basta reativar.

---

## Migração store → Supabase

### Padrão adotado em todas as entidades migradas

- Estado inicia como `[]` (sem `localStorage`)
- `useEffect` dispara fetch quando `tenantId` muda
- Funções CRUD: **atualização otimista do estado local** + **fire-and-forget no Supabase**
- `moveToTrash`: deleta do Supabase antes de mover para lixo local
- `restoreFromTrash`: re-insere no Supabase ao restaurar
- Interface do Context **inalterada** para os consumidores (páginas não precisam mudar)
- Mappers `mapXxxRow(row)` puros fora do Provider — convertem snake_case do Supabase → camelCase TS

---

### ✅ Entidades migradas (Sessões 1–4 — migração COMPLETA)

| Entidade | Tabelas Supabase | Funções CRUD no store | Sessão |
|---|---|---|---|
| `institutions` | `institutions` | `addInstitution`, `updateInstitution`, `deleteInstitution` | 1 |
| `courses` | `courses` | `addCourse`, `updateCourse`, `deleteCourse` | 1 |
| `classes` | `classes` + `class_courses` + `class_products` + `class_timeline_events` | `addClass`, `updateClass`, `deleteClass`, `addClassProduct`, `updateClassProduct`, `removeClassProduct` | 1 |
| `clients` | `clients` + `client_activities` | `addClient`, `updateClient`, `updateClientStage`, `addClientActivity` | 1 |
| `funnels` | `funnels` + `funnel_stages` + `funnel_responsible_users` | `addFunnel`, `updateFunnel`, `deleteFunnel` | 1 |
| `users` | `users` | `addUser`, `updateUser`, `deleteUser` | 2 |
| `productCategories` | `product_categories` | `addProductCategory`, `updateProductCategory`, `deleteProductCategory` | 2 |
| `products` | `products` | `addProduct`, `updateProduct`, `deleteProduct` | 2 |
| `activityTypes` | `activity_types` | `addActivityType`, `updateActivityType`, `deleteActivityType` | 2 |
| `events` | `events` + `event_activities` | `addEvent`, `updateEvent`, `deleteEvent`, `addEventActivity` | 2 |
| `csActions` | `cs_actions` + `cs_action_activities` | `addCSAction`, `updateCSAction`, `deleteCSAction`, `addCSActionActivity` | 2 |
| `csDailyServices` | `cs_daily_services` | `addCSDailyService`, `updateCSDailyService`, `deleteCSDailyService` | 2 |
| `sales` | `sales` | `addSale`, `updateSale`, `deleteSale` | 4 |
| `negotiations` | `product_negotiations` | `addNegotiation`, `deleteNegotiation`, `updateNegotiationStatus` | 4 |
| `tasks` | `client_tasks` | `addTask`, `updateTask`, `toggleTask`, `deleteTask` | 4 |

> **Nota sobre vínculo retroativo CS:** `addClient` propaga `client_id` para `cs_daily_services` no Supabase (`.update({ client_id })` via `client_phone`) além de atualizar o estado local.

> **Nota sobre totais do cliente:** `addSale` e `deleteSale` atualizam `total_value` e `purchases_count` na tabela `clients` no Supabase via fire-and-forget, além de atualizar o estado local.

---

### ❌ Ainda no localStorage (apenas utilitários)

| Entidade | Estado no store | Observação |
|---|---|---|
| `trash` | `useState(() => load(...))` | Frontend-only — sem tabela no DB, permanece em localStorage |
| `googleSheetUrl` | `useState(() => load(...))` | Configuração de integração — permanece em localStorage |

---

## ✅ Migração completa — limpeza e próximas melhorias

Toda a migração store → Supabase está concluída. Apenas `trash` e `googleSheetUrl` permanecem em localStorage (intencionalmente — são dados frontend-only).

### Limpeza técnica pendente
- Remover a função `load()` e a constante `STORAGE_KEY` do store (apenas `trash` e `googleSheetUrl` ainda usam)
- Remover imports de `MOCK_*` que não são mais usados (`MOCK_SALES`, `MOCK_CLIENTS`, etc.)
- Reativar RLS com suporte a `set_config('app.current_tenant_id', ...)` no cliente Supabase
- Implementar gerenciamento real de papéis via tabela `users` (hoje fallback é `ADMIN`)

---

---

## ✅ Sessão 5 — Recuperação de Senha + Backup & Restore (2026-06-06)

### Recuperação de Senha

**Arquivos criados/modificados:**

- `src/components/Auth/LoginPage.tsx` — adicionado prop `onForgotPassword?: () => void` e link "Esqueci minha senha" abaixo do campo de senha
- `src/components/Auth/ForgotPasswordPage.tsx` (**NOVO**) — formulário para envio de e-mail de recuperação via `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] })`; mostra estado de sucesso após envio
- `src/components/Auth/ResetPasswordPage.tsx` (**NOVO**) — formulário para definir nova senha; valida mínimo 6 chars e confirmação; chama `supabase.auth.updateUser({ password })`; indicador visual de senhas coincidentes; redireciona para login após 2s
- `App.tsx` — `ProtectedRoute` usa `type AuthView = 'login' | 'forgot' | 'reset'`; listener `onAuthStateChange` detecta `PASSWORD_RECOVERY` e muda para view `reset`

**Notas técnicas:**
- `redirectTo` = `window.location.href.split('#')[0]` (URL base sem fragment, evita conflito com HashRouter)
- supabase-js v2 detecta `#access_token=...&type=recovery` no fragment automaticamente ao carregar
- View `reset` exibida mesmo com sessão ativa (Supabase cria sessão temporária durante recovery)

### Backup & Restore

**Arquivos criados/modificados:**

- `store.tsx` — `exportAllData()` e `importAllData(json)` adicionadas ao `DataContextType` e ao `DataProvider`
- `pages/Admin/Backup.tsx` (**NOVO**) — página com cards Export e Import, fases, preview, confirmação inline
- `App.tsx` — rota `/admin/backup` adicionada
- `components/Sidebar.tsx` — item "Backup & Restore" com ícone `HardDriveDownload`

**`exportAllData()`:** busca 23 tabelas em paralelo (`Promise.all`), gera `{ version: '2.0', exportedAt, tenantId, tables }`

**`importAllData(json)`:** valida v2.0, deleta em ordem FK (folhas → raízes), reinsere com `tenant_id` atual em chunks de 200 linhas

**Ordem de deleção (FK-safe):**
`sales → product_negotiations → client_tasks → cs_daily_services → cs_action_activities → cs_actions → event_activities → events → client_activities → clients → class_timeline_events → class_products → classes → funnel_stages → funnels → activity_types → users → products → product_categories → courses → institutions`

---

## Próximos passos

### Etapa 3 — Backups automáticos
- Agendamento periódico (diário/semanal) via cron ou Supabase Edge Function
- Armazenamento no Supabase Storage
- Histórico com download individual e notificação por e-mail

### Etapa 4 — Edição/exclusão em massa
- Seleção múltipla nas listagens principais
- Ações em lote: excluir, mover para lixeira, editar campo
- Import via planilha com detecção de duplicatas e opção de merge

## Variáveis de ambiente (`.env.local`)

```
VITE_SUPABASE_URL=https://uramvivojfqrkbqyiavg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Observações técnicas importantes

1. **`tenantId`** no store = UUID do usuário autenticado no Supabase Auth. Cada usuário autenticado é seu próprio tenant até que multi-tenancy real seja implementado.

2. **RLS desativada** — todas as tabelas estão com `DISABLE ROW LEVEL SECURITY` no Supabase. As políticas existem no schema mas não estão sendo aplicadas. O isolamento de dados é feito apenas pelo filtro `.eq('tenant_id', tenantId)` nas queries do cliente.

3. **`funnel_stages.order`** é palavra reservada no PostgreSQL — na migration foi criado como `"order"`. O Supabase JS client trata automaticamente ao fazer select com `order` (sem aspas).

4. O projeto usa **`HashRouter`** (URLs com `#`) — compatível com deploy estático sem configuração de servidor.

5. O alias **`@`** mapeia para a raiz do projeto (configurado em `vite.config.ts` e `tsconfig.json`).

6. **`AuthSync`** em `App.tsx` roda fora do `ProtectedRoute` mas dentro do `Router` e do `DataProvider` — ele é um componente que retorna `null` e serve só para executar o `useEffect` de sincronização.

7. **Importações cruzadas:** `src/hooks/useAuth.ts` importa de `@/src/lib/supabase`. `components/Header.tsx` importa de `../src/hooks/useAuth`. Isso funciona porque o alias `@` aponta para a raiz.
8. **`events.id`** deve ser UUID válido — usar `crypto.randomUUID()` (não `evt-${Date.now()}`). O campo `end_date_time` é `NOT NULL` — usar `event.endDateTime || event.startDateTime || new Date().toISOString()` como fallback.

9. **Erro pré-existente não bloqueante:** `src/lib/supabase.ts(3,33): error TS2339: Property 'env' does not exist on type 'ImportMeta'` — presente antes da Sessão 5, não afeta o funcionamento em runtime com Vite.
