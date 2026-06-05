# CRM-TOP — Contexto de Desenvolvimento

> Gerado em: 2026-06-05  
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
│
├── src/
│   ├── lib/supabase.ts             # Cliente Supabase (createClient com variáveis de ambiente)
│   ├── hooks/useAuth.ts            # AuthProvider + useAuth (session, signIn, signOut)
│   └── components/Auth/
│       └── LoginPage.tsx           # Tela de login (email + senha, visual dark slate/amber)
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
│       ├── Database.tsx            # Export/import/reset do banco
│       └── Trash.tsx               # Lixeira (restore de itens deletados)
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Schema completo com RLS por tenant_id
```

---

## Autenticação (concluída)

- **Supabase Auth** via `src/hooks/useAuth.ts` (`AuthProvider` + `useAuth`)
- `AuthProvider` envolve toda a árvore em `App.tsx`
- `ProtectedRoute` exibe spinner → `LoginPage` → app conforme estado de sessão
- `AuthSync` (componente interno em `App.tsx`) sincroniza `session.user` → `currentUser` do store:
  - Busca por e-mail no array `users` do store
  - Fallback: cria perfil mínimo com `role: 'ADMIN'` (padrão até gerenciamento de papéis via DB)
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

**RLS:** ativa em todas as tabelas.  
- Tabelas com `tenant_id` direto: `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`  
- Tabelas junction (`class_courses`, `funnel_responsible_users`): `EXISTS (SELECT 1 FROM parent_table WHERE ... tenant_id = ...)`

---

## Migração store → Supabase

### ✅ Entidades já migradas

| Entidade | Tabelas Supabase | CRUD no store |
|---|---|---|
| `institutions` | `institutions` | `addInstitution`, `updateInstitution`, `deleteInstitution` |
| `courses` | `courses` | `addCourse`, `updateCourse`, `deleteCourse` |
| `classes` | `classes` + `class_courses` + `class_products` + `class_timeline_events` | `addClass`, `updateClass`, `deleteClass`, `addClassProduct`, `updateClassProduct`, `removeClassProduct` |
| `clients` | `clients` + `client_activities` | `addClient`, `updateClient`, `updateClientStage`, `addClientActivity` |
| `funnels` | `funnels` + `funnel_stages` + `funnel_responsible_users` | `addFunnel`, `updateFunnel`, `deleteFunnel` |

**Padrão de migração adotado:**
- Estado inicia como `[]` (sem `localStorage`)
- `useEffect` dispara fetch quando `tenantId` muda
- Funções CRUD: **atualização otimista do estado local** + **fire-and-forget no Supabase**
- `moveToTrash`: deleta do Supabase antes de mover para lixo local
- `restoreFromTrash`: re-insere no Supabase ao restaurar
- Interface do Context **inalterada** (nenhuma página precisou ser modificada, exceto Instituições e Cursos que chamavam `setInstitutions`/`setCourses` diretamente)

### ❌ Entidades ainda no localStorage

| Entidade | Estado no store | Observações |
|---|---|---|
| `users` | `useState(() => load('users', MOCK_USERS))` | Tabela `users` existe no DB; aguarda migração |
| `productCategories` | `useState(() => load(...))` | Tabela `product_categories` existe |
| `products` | `useState(() => load(...))` | Tabela `products` existe |
| `events` | `useState(() => load(...))` | Tabela `events` + `event_activities` existem |
| `activityTypes` | `useState(() => load(...))` | Tabela `activity_types` existe |
| `tasks` | `useState(() => load(...))` | Tabela `client_tasks` existe |
| `sales` | `useState(() => load(...))` | Tabela `sales` existe |
| `negotiations` | `useState(() => load(...))` | Tabela `product_negotiations` existe |
| `csActions` | `useState(() => load(...))` | Tabela `cs_actions` + `cs_action_activities` existem |
| `csDailyServices` | `useState(() => load(...))` | Tabela `cs_daily_services` existe |
| `trash` | `useState(() => load(...))` | Frontend-only (sem tabela no DB) |

---

## Arquivos-chave modificados nesta sessão

```
store.tsx                       # Principal — context com migração progressiva
App.tsx                         # AuthProvider, AuthSync, ProtectedRoute, fallback role ADMIN
components/Header.tsx           # signOut via useAuth (removido setCurrentUser)
pages/Admin/Instituicoes.tsx    # Usa addInstitution / updateInstitution / deleteInstitution
pages/Admin/Cursos.tsx          # Usa addCourse / updateCourse / deleteCourse
src/lib/supabase.ts             # Cliente Supabase
src/hooks/useAuth.ts            # AuthProvider + useAuth
src/components/Auth/LoginPage.tsx  # Tela de login
supabase/migrations/001_initial_schema.sql  # Schema completo
```

---

## Próxima tarefa sugerida

**Continuar a migração das entidades restantes**, seguindo a mesma ordem de dependência:

### Bloco 1 — Cadastro base (sem dependências externas)
- `users` → tabela `users` (atenção: role vem do DB, não de user_metadata)
- `productCategories` → tabela `product_categories`
- `products` → tabela `products` (depende de `product_categories`)
- `activityTypes` → tabela `activity_types`

### Bloco 2 — Operacional
- `events` → tabelas `events` + `event_activities`
- `csActions` → tabelas `cs_actions` + `cs_action_activities`
- `csDailyServices` → tabela `cs_daily_services`

### Bloco 3 — Financeiro
- `sales` → tabela `sales`
- `negotiations` → tabela `product_negotiations`
- `tasks` → tabela `client_tasks`

### Após migração completa
- Remover a função `load()` e o `STORAGE_KEY` do store (localStorage deixa de ser usado)
- Remover imports de constantes mock (`MOCK_*`) que não forem mais necessários
- Implementar gerenciamento de papéis (`role`) via tabela `users` no Supabase (hoje o fallback é sempre `ADMIN`)
- Avaliar implementação de RLS com `set_config('app.current_tenant_id', ...)` no cliente

---

## Variáveis de ambiente (`.env.local`)

```
VITE_SUPABASE_URL=https://uramvivojfqrkbqyiavg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Observações importantes

1. **`tenantId`** no store = UUID do usuário autenticado no Supabase Auth. Cada usuário é seu próprio tenant por enquanto.
2. **RLS no Supabase** está ativada mas requer `set_config('app.current_tenant_id', uuid, true)` na sessão para funcionar. Isso **ainda não foi implementado** no cliente — as queries passam diretamente sem o config, portanto a RLS pode bloquear operações dependendo da configuração do projeto Supabase. Verificar nas configurações do projeto se RLS está sendo aplicado ou se a anon key tem bypass.
3. **`funnel_stages.order`** é palavra reservada no PostgreSQL — na migration foi criado como `"order"`. O Supabase JS client trata isso automaticamente.
4. O projeto usa **`HashRouter`** (URLs com `#`) — compatível com deploy estático.
5. O alias **`@`** mapeia para a raiz do projeto (configurado em `vite.config.ts` e `tsconfig.json`).
