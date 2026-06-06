# CRM-TOP — Contexto de Desenvolvimento

> Atualizado em: 2026-06-06 (Sessão 6)
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
│   ├── ConfirmModal.tsx            # ✅ NOVO — Modal de confirmação reutilizável (Sim/Não)
│   ├── GenericRegistry.tsx         # Tabela genérica com busca, seleção e ações CRUD
│   └── ClientProfileView.tsx       # Painel lateral de perfil do cliente
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Funnel.tsx                  # Kanban de funil de vendas
│   ├── Clients.tsx                 # Lista e perfil de clientes
│   ├── CSActions.tsx               # Ações de Customer Success
│   ├── CSDailyServices.tsx         # Atendimentos diários CS
│   ├── Agenda.tsx                  # Agenda de tarefas e eventos
│   ├── UserProfile.tsx             # Perfil do usuário logado (nome, telefone)
│   └── Admin/
│       ├── Instituicoes.tsx        # CRUD de instituições (bulk delete)
│       ├── Cursos.tsx              # CRUD de cursos
│       ├── Turmas.tsx              # CRUD de turmas (bulk delete, remoção de produto)
│       ├── Produtos.tsx            # CRUD de produtos e categorias (bulk delete)
│       ├── Eventos.tsx             # CRUD de eventos e tipos (bulk delete)
│       ├── Users.tsx               # CRUD de usuários
│       ├── FunnelConfig.tsx        # Configuração de funis e etapas (delete de stage)
│       ├── ActivityTypes.tsx       # Tipos de atividade
│       ├── Database.tsx            # Export/Import/Reset unificado (inclui Backup & Restore)
│       ├── Seguranca.tsx           # Segurança da conta (acesso via senha pelo header)
│       └── Trash.tsx               # ✅ REESCRITO — Lixeira completa (90 dias, bulk delete permanente)
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
- `AuthSync` (componente interno em `App.tsx`) sincroniza `session.user` → `currentUser` do store
- Logout em `Header.tsx` chama `useAuth().signOut()`
- `tenantId` no store = `supabase.auth.getSession().user.id` (usuário Auth = tenant)

---

## Banco de dados — Schema (`001_initial_schema.sql`)

Tabelas criadas com **`tenant_id UUID NOT NULL`** em todas (exceto junction tables).

### ⚠️ RLS — Status atual: DESATIVADA para desenvolvimento

O isolamento de dados é feito apenas pelo filtro `.eq('tenant_id', tenantId)` nas queries do cliente.
As políticas existem no schema — basta reativar quando o `set_config` estiver implementado.

---

## Padrões técnicos importantes

### IDs
- **Sempre usar `crypto.randomUUID()`** para IDs de novas entidades que vão para o Supabase.
- Nunca usar `Date.now()`, `Math.random()` ou prefixos tipo `t-${Date.now()}` — Supabase exige UUID válido nas colunas `UUID NOT NULL`.

### Soft delete (Lixeira)
- **Todo delete passa pelo `moveToTrash(entityType, ids[])`** — nunca deletar direto do store ou chamar funções de delete antigas.
- `moveToTrash` faz: Supabase DELETE + remove do estado local + push ao array `trash` no localStorage.
- `restoreFromTrash(trashId)` faz: re-insere no Supabase + volta ao estado local + remove do `trash`.
- `permanentDeleteFromTrash(trashIds[])` — remove apenas do array `trash` (sem Supabase — já foi deletado).
- `purgeExpiredTrash()` — remove itens com mais de 90 dias do array `trash`.

### Confirmação de exclusão
- **Todo delete (individual ou em massa) usa `<ConfirmModal>`** — nunca `window.confirm()`.
- Padrão: cada componente tem `const [confirmConfig, setConfirmConfig] = useState<{title, message, onConfirm}|null>(null)` e renderiza `{confirmConfig && <ConfirmModal ... />}` no final do return.

### Otimistic updates
- Estado local atualizado imediatamente; Supabase fire-and-forget.

---

## Migração store → Supabase

### Padrão adotado
- Estado inicia como `[]` (sem `localStorage`, exceto `trash` e `googleSheetUrl`)
- `useEffect` dispara fetch quando `tenantId` muda
- Mappers `mapXxxRow(row)` convertem snake_case do Supabase → camelCase TS

### ✅ Entidades migradas (Sessões 1–4 — migração COMPLETA)

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

### Melhorias de segurança e navegação (implementadas antes dos grupos A/B/C/D)

- **"Segurança" movida do sidebar para o dropdown do usuário no Header** — abre modal de confirmação de senha (`supabase.auth.signInWithPassword`) antes de navegar para `/admin/seguranca`
- **Backup & Restore unificado dentro de `Database.tsx`** — removido do sidebar
- **Limpeza de banco com dupla confirmação:** fase 1 digita `"LIMPAR"`, fase 2 confirmação final; executa export silencioso → `resetAllData()` → `supabase.functions.invoke('notify-db-reset')` → reload
- **`store.tsx`** — adicionado `resetAllData()`: deleta todas as tabelas em ordem FK-safe, limpa localStorage
- **`UserProfile.tsx`** criado — tela "Minhas Informações" acessível via dropdown do header (rota `/perfil`)

### Bug fixes (3 bugs corrigidos)

1. **Turmas** — `id: crypto.randomUUID()` em `handleSaveClass` e `handleBulkImport` (era `t-${Date.now()}`)
2. **FunnelConfig** — botão "Adicionar novo estágio" não persistia + botão deletar stage não funcionava
3. **Minhas Informações** — página e rota inexistentes, criadas (`UserProfile.tsx` + rota `/perfil`)

### Grupo C — Fix cirúrgico FunnelConfig

- `handleDeleteStage(stageId)`: filtra stage do array e chama `updateFunnel(updated)` + `setSelectedFunnel(updated)`
- Antes: botão chamava `handleUpdateStage(stage.id, {})` — não fazia nada

### Grupo A — Bulk delete (seleção múltipla + mover para lixeira)

Implementado em 5 módulos:

| Módulo | UI |
|---|---|
| `Instituicoes.tsx` | Cards com checkbox overlay (top-left) |
| `Turmas.tsx` | Tabela com coluna checkbox |
| `Produtos.tsx` | Cards (produtos) + tabela (categorias), tabs separadas |
| `Eventos.tsx` | Cards (eventos) + tabela (tipos), tabs separadas |
| `CSDailyServices.tsx` | Tabela com coluna checkbox |

**Padrão implementado em todos:**
- `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
- `toggleSelect(id)` / `toggleSelectAll()` / `handleBulkDelete()`
- Floating action bar: `fixed bottom-8 left-1/2 -translate-x-1/2 z-50`
- Delete individual migrado de `deleteXxx(id)` para `moveToTrash(entityType, [id])`

### Grupo B — Clients.tsx: delete individual + bulk delete

- Coluna checkbox na tabela de clientes
- Botão Trash2 por linha (visível no hover) com confirmação
- Bulk delete via floating bar
- `id: crypto.randomUUID()` no `addClient` (era `cli-${Date.now()}`)
- Fecha painel de perfil se o cliente deletado estava aberto

### Grupo D — Trash.tsx reescrito completamente

**Regras implementadas:**
- **Auto-expiração 90 dias** — `purgeExpiredTrash()` chamado no `useEffect` do mount
- **Badge "Pode excluir" após 30 dias** — coluna "Status" com chip vermelho
- **Botão de delete permanente desativado antes de 30 dias** — tooltip indica dias restantes
- **Confirmação de senha obrigatória** — modal com `supabase.auth.signInWithPassword` antes de qualquer exclusão permanente (individual ou em massa)
- **Bulk delete permanente** — checkbox apenas nos itens elegíveis (30+ dias), floating bar
- **Data de expiração visível** — coluna "Expira em" com countdown colorido (vermelho ≤10d, âmbar ≤30d)

**Novas funções no `store.tsx`:**
```ts
permanentDeleteFromTrash(trashIds: string[]) // remove do array trash (sem Supabase)
purgeExpiredTrash()                           // filtra itens com > 90 dias
```

Ambas expostas no `DataContextType` e no Provider value.

### ConfirmModal global (`components/ConfirmModal.tsx`)

**Criado como componente reutilizável** para substituir todos os `window.confirm()` do projeto.

Props:
```ts
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;  // default: "Confirmar"
  onConfirm: () => void;
  onCancel: () => void;
}
```

Visual: fundo rose-50, ícone AlertTriangle, botão vermelho com Trash2, botão cancelar neutro.

**Substituído em todos os arquivos:**

| Arquivo | Ocorrências substituídas |
|---|---|
| `components/ClientProfileView.tsx` | Delete de negociação/venda |
| `pages/Admin/Instituicoes.tsx` | Individual + bulk |
| `pages/Admin/Turmas.tsx` | Individual + bulk + remover produto do catálogo |
| `pages/Admin/Produtos.tsx` | Produto individual + bulk + categoria individual + bulk |
| `pages/Admin/Eventos.tsx` | Card + tabela + painel lateral + bulk eventos + bulk tipos |
| `pages/Admin/FunnelConfig.tsx` | Remover stage do funil |
| `pages/CSDailyServices.tsx` | Individual + bulk |
| `pages/Clients.tsx` | Individual + bulk |
| `pages/CSActions.tsx` | Individual + bulk |
| `pages/Funnel.tsx` | Bulk delete de negociações |

**Padrão adotado em todos os componentes:**
```tsx
const [confirmConfig, setConfirmConfig] = useState<{
  title: string; message: string; onConfirm: () => void
} | null>(null);

// Para acionar:
setConfirmConfig({ title: '...', message: '...', onConfirm: () => { /* ação */ setConfirmConfig(null); } });

// No return:
{confirmConfig && (
  <ConfirmModal
    title={confirmConfig.title}
    message={confirmConfig.message}
    confirmLabel="Sim, Mover"
    onConfirm={confirmConfig.onConfirm}
    onCancel={() => setConfirmConfig(null)}
  />
)}
```

---

## 🐛 Bugs conhecidos (pendentes para Sessão 6)

### Bug 1 — Cliente excluído e restaurado desaparece da lista
- **Descrição:** Ao excluir um cliente (via `moveToTrash`) e depois restaurá-lo (`restoreFromTrash`), o cliente não reaparece na listagem de `Clients.tsx`.
- **Hipótese:** A função `restoreFromTrash` para `client` pode não estar fazendo `setClients(p => [...p, restoredData])` corretamente, ou o re-insert no Supabase está falhando silenciosamente.
- **Arquivos a investigar:** `store.tsx` → `restoreFromTrash` case `'client'`, `pages/Clients.tsx`

### Bug 2 — Dropdown de produtos vazio no perfil do cliente
- **Descrição:** No painel lateral `ClientProfileView.tsx`, o select de produtos para registrar uma negociação/venda aparece vazio.
- **Hipótese:** O `products` do store pode não estar sendo passado corretamente para o componente, ou a lista está sendo filtrada de forma indevida.
- **Arquivo a investigar:** `components/ClientProfileView.tsx` — verificar de onde vem a lista de produtos usada no select

### Bug 3 — Importação em massa em CSDailyServices não implementada
- **Descrição:** A tela `CSDailyServices.tsx` tem botão de importar planilha mas sem `BulkImportModal` conectado.
- **Colunas da planilha (títulos):**
  - `Data (AAAA-MM-DD)` → `date`
  - `Meio de Contato` → `type` (ex: WhatsApp, Ligação, E-mail)
  - `Telefone do Contato` → `clientPhone`
  - `Nome Manual (opcional)` → `clientNameManual`
  - `Resumo` → `summary`
  - `Status` → `status` (ex: Concluído, Pendente)
  - `ID do Responsável (opcional)` → `responsibleUserId`
- **Arquivo a modificar:** `pages/CSDailyServices.tsx` — adicionar `BulkImportModal` com esses campos e handler `handleBulkImport`

---

## 🗺️ Próximos passos (Sessão 6+)

### Padronização de nomenclatura
- Revisar labels e títulos nas telas para consistência (ex: "Formandos" vs "Clientes", "Lixeira" vs "Excluídos")
- Padronizar textos dos botões de confirmação no `ConfirmModal`

### Campo Turma/Sala em Clientes
- Adicionar campo de vínculo com turma diretamente no formulário de cliente
- Exibir turma vinculada na listagem de clientes

### Tooltips de ajuda
- Adicionar `title` ou componente de tooltip em campos e ações menos óbvios
- Foco em: campos de importação, ações de lixeira, campos de funil

### Vinculação inteligente entre sessões
- Atendimento CS (`CSDailyService`) vincula automaticamente com `Client` por telefone ao criar o atendimento
- Ao cadastrar cliente com telefone já existente em `cs_daily_services`, propagar `client_id` retroativamente
- Esse vínculo já está parcialmente implementado no `addClient` do store (via `.update` no Supabase)

### Limpeza técnica pendente
- Remover a função `load()` e `STORAGE_KEY` do store (apenas `trash` e `googleSheetUrl` ainda usam)
- Remover imports de `MOCK_*` não utilizados
- Reativar RLS com suporte a `set_config('app.current_tenant_id', ...)` no cliente Supabase

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
