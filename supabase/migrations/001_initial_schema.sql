-- =============================================================
-- CRM-TOP | Migration 001 - Initial Schema
-- Supabase / PostgreSQL
-- Multi-tenancy via tenant_id uuid em todas as tabelas
-- =============================================================

-- Habilita extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE user_role         AS ENUM ('ADMIN', 'CONSULTOR', 'VISUALIZADOR');
CREATE TYPE user_status       AS ENUM ('ATIVO', 'INATIVO');
CREATE TYPE event_status      AS ENUM ('Previsão', 'Confirmado', 'Realizado');
CREATE TYPE funnel_stage_type AS ENUM ('NORMAL', 'WON', 'LOST');
CREATE TYPE negotiation_status AS ENUM ('ABERTO', 'GANHO', 'PERDIDO');

-- =============================================================
-- TABELA: users
-- =============================================================

CREATE TABLE users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  role         user_role   NOT NULL DEFAULT 'CONSULTOR',
  phone        TEXT,
  password     TEXT        NOT NULL,
  status       user_status NOT NULL DEFAULT 'ATIVO',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users (tenant_id);

-- =============================================================
-- TABELA: institutions
-- =============================================================

CREATE TABLE institutions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,
  state      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_institutions_tenant ON institutions (tenant_id);

-- Campi são um array de objetos {name, city} — armazenados como JSONB
-- para evitar uma tabela satélite desnecessária dado o volume de dados.
ALTER TABLE institutions ADD COLUMN campi JSONB NOT NULL DEFAULT '[]';

-- =============================================================
-- TABELA: courses
-- =============================================================

CREATE TABLE courses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_tenant ON courses (tenant_id);

-- =============================================================
-- TABELA: product_categories
-- =============================================================

CREATE TABLE product_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_categories_tenant ON product_categories (tenant_id);

-- =============================================================
-- TABELA: products
-- =============================================================

CREATE TABLE products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  name        TEXT        NOT NULL,
  category_id UUID        NOT NULL REFERENCES product_categories (id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_tenant      ON products (tenant_id);
CREATE INDEX idx_products_category    ON products (category_id);

-- =============================================================
-- TABELA: classes  (Turmas)
-- =============================================================

CREATE TABLE classes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL,
  name              TEXT        NOT NULL,
  institution_id    UUID        NOT NULL REFERENCES institutions (id) ON DELETE RESTRICT,
  graduation_year   INT,
  graduation_month  INT         CHECK (graduation_month BETWEEN 1 AND 12),
  comercial_externo TEXT,
  gestor_projeto    TEXT,
  consultor_cs_id   UUID        REFERENCES users (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_tenant      ON classes (tenant_id);
CREATE INDEX idx_classes_institution ON classes (institution_id);

-- Relação N:N classes <-> courses
CREATE TABLE class_courses (
  class_id  UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, course_id)
);

-- Produtos configurados por turma (ClassProduct)
CREATE TABLE class_products (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID    NOT NULL,
  class_id      UUID    NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  product_id    UUID    NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  custom_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  goal_quantity INT           NOT NULL DEFAULT 0,
  goal_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  erp_quantity  INT,
  erp_value     NUMERIC(12,2),
  UNIQUE (class_id, product_id)
);

CREATE INDEX idx_class_products_tenant   ON class_products (tenant_id);
CREATE INDEX idx_class_products_class    ON class_products (class_id);

-- Timeline de eventos por turma (TimelineEvent)
CREATE TABLE class_timeline_events (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL,
  class_id    UUID    NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  date        DATE    NOT NULL,
  description TEXT,
  completed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_class_timeline_tenant ON class_timeline_events (tenant_id);
CREATE INDEX idx_class_timeline_class  ON class_timeline_events (class_id);

-- =============================================================
-- TABELA: funnels
-- =============================================================

CREATE TABLE funnels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funnels_tenant ON funnels (tenant_id);

-- Usuários responsáveis pelo funil (N:N)
CREATE TABLE funnel_responsible_users (
  funnel_id UUID NOT NULL REFERENCES funnels (id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
  PRIMARY KEY (funnel_id, user_id)
);

-- =============================================================
-- TABELA: funnel_stages
-- =============================================================

CREATE TABLE funnel_stages (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID              NOT NULL,
  funnel_id  UUID              NOT NULL REFERENCES funnels (id) ON DELETE CASCADE,
  name       TEXT              NOT NULL,
  "order"    INT               NOT NULL DEFAULT 0,
  color      TEXT,
  type       funnel_stage_type NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funnel_stages_tenant ON funnel_stages (tenant_id);
CREATE INDEX idx_funnel_stages_funnel ON funnel_stages (funnel_id);

-- =============================================================
-- TABELA: clients
-- =============================================================

CREATE TABLE clients (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL,
  name           TEXT        NOT NULL,
  birth_date     DATE,
  gender         TEXT,
  cpf            TEXT,
  email          TEXT,
  phone          TEXT,
  institution_id UUID        REFERENCES institutions (id) ON DELETE SET NULL,
  campus         TEXT,
  course_id      UUID        REFERENCES courses (id) ON DELETE SET NULL,
  class_id       UUID        REFERENCES classes (id)  ON DELETE SET NULL,
  shift          TEXT,
  funnel_id      UUID        REFERENCES funnels (id)       ON DELETE SET NULL,
  stage_id       UUID        REFERENCES funnel_stages (id) ON DELETE SET NULL,
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  total_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchases_count INT         NOT NULL DEFAULT 0,
  seller_id      UUID        REFERENCES users (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_tenant      ON clients (tenant_id);
CREATE INDEX idx_clients_funnel      ON clients (funnel_id, stage_id);
CREATE INDEX idx_clients_institution ON clients (institution_id);
CREATE INDEX idx_clients_class       ON clients (class_id);
CREATE INDEX idx_clients_seller      ON clients (seller_id);
CREATE INDEX idx_clients_cpf         ON clients (tenant_id, cpf);
CREATE INDEX idx_clients_phone       ON clients (tenant_id, phone);

-- Atividades do cliente (histórico de interações)
CREATE TABLE client_activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  client_id   UUID        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('call','email','meeting','note')),
  description TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attachments TEXT[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_client_activities_tenant ON client_activities (tenant_id);
CREATE INDEX idx_client_activities_client ON client_activities (client_id);

-- Tasks do cliente
CREATE TABLE client_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  client_id   UUID        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  date        DATE,
  time        TIME,
  description TEXT,
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_tasks_tenant ON client_tasks (tenant_id);
CREATE INDEX idx_client_tasks_client ON client_tasks (client_id);

-- =============================================================
-- TABELA: activity_types  (tipos de atividade configuráveis)
-- =============================================================

CREATE TABLE activity_types (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL,
  name       TEXT        NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_types_tenant ON activity_types (tenant_id);

-- =============================================================
-- TABELA: events
-- =============================================================

CREATE TABLE events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL,
  name            TEXT         NOT NULL,
  type            TEXT         NOT NULL,
  start_date_time TIMESTAMPTZ  NOT NULL,
  end_date_time   TIMESTAMPTZ  NOT NULL,
  status          event_status NOT NULL DEFAULT 'Previsão',
  class_id        UUID         REFERENCES classes (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_tenant ON events (tenant_id);
CREATE INDEX idx_events_class  ON events (class_id);
CREATE INDEX idx_events_status ON events (tenant_id, status);

-- Log de atividades do evento (EventActivity)
CREATE TABLE event_activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  event_id    UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_name   TEXT        NOT NULL,
  description TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_activities_tenant ON event_activities (tenant_id);
CREATE INDEX idx_event_activities_event  ON event_activities (event_id);

-- =============================================================
-- TABELA: cs_actions
-- =============================================================

CREATE TABLE cs_actions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL,
  class_id            UUID        NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
  type                TEXT        NOT NULL,
  start_date          DATE        NOT NULL,
  end_date            DATE        NOT NULL,
  status              TEXT        NOT NULL,
  total_reached       INT         NOT NULL DEFAULT 0,
  total_responses     INT         NOT NULL DEFAULT 0,
  volume_sold         INT         NOT NULL DEFAULT 0,
  revenue_result      NUMERIC(12,2) NOT NULL DEFAULT 0,
  channel             TEXT        NOT NULL,
  responsible_user_id UUID        REFERENCES users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_actions_tenant ON cs_actions (tenant_id);
CREATE INDEX idx_cs_actions_class  ON cs_actions (class_id);

-- Log de atividades da ação CS (CSActionActivity)
CREATE TABLE cs_action_activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  cs_action_id UUID       NOT NULL REFERENCES cs_actions (id) ON DELETE CASCADE,
  user_name   TEXT        NOT NULL,
  description TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_action_activities_tenant    ON cs_action_activities (tenant_id);
CREATE INDEX idx_cs_action_activities_cs_action ON cs_action_activities (cs_action_id);

-- =============================================================
-- TABELA: cs_daily_services
-- =============================================================

CREATE TABLE cs_daily_services (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL,
  client_id          UUID        REFERENCES clients (id) ON DELETE SET NULL,
  client_phone       TEXT        NOT NULL,
  client_name_manual TEXT,
  date               DATE        NOT NULL,
  type               TEXT        NOT NULL,  -- WhatsApp, Ligação, E-mail, Presencial
  summary            TEXT,
  status             TEXT        NOT NULL,
  responsible_user_id UUID       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_daily_services_tenant  ON cs_daily_services (tenant_id);
CREATE INDEX idx_cs_daily_services_client  ON cs_daily_services (client_id);
CREATE INDEX idx_cs_daily_services_date    ON cs_daily_services (tenant_id, date);
CREATE INDEX idx_cs_daily_services_phone   ON cs_daily_services (tenant_id, client_phone);

-- =============================================================
-- TABELA: sales
-- =============================================================

CREATE TABLE sales (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  client_id       UUID        NOT NULL REFERENCES clients  (id) ON DELETE RESTRICT,
  product_id      UUID        NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  seller_id       UUID        NOT NULL REFERENCES users    (id) ON DELETE RESTRICT,
  class_id        UUID        NOT NULL REFERENCES classes  (id) ON DELETE RESTRICT,
  negotiation_id  UUID,  -- FK adicionada após criação de product_negotiations
  value           NUMERIC(12,2) NOT NULL,
  quantity        INT           NOT NULL DEFAULT 1,
  date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_tenant    ON sales (tenant_id);
CREATE INDEX idx_sales_client    ON sales (client_id);
CREATE INDEX idx_sales_seller    ON sales (seller_id);
CREATE INDEX idx_sales_class     ON sales (class_id);
CREATE INDEX idx_sales_date      ON sales (tenant_id, date);

-- =============================================================
-- TABELA: product_negotiations
-- =============================================================

CREATE TABLE product_negotiations (
  id         UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID               NOT NULL,
  client_id  UUID               NOT NULL REFERENCES clients  (id) ON DELETE RESTRICT,
  product_id UUID               NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  seller_id  UUID               NOT NULL REFERENCES users    (id) ON DELETE RESTRICT,
  value      NUMERIC(12,2)      NOT NULL,
  quantity   INT                NOT NULL DEFAULT 1,
  status     negotiation_status NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  closed_at  TIMESTAMPTZ
);

CREATE INDEX idx_product_negotiations_tenant ON product_negotiations (tenant_id);
CREATE INDEX idx_product_negotiations_client ON product_negotiations (client_id);
CREATE INDEX idx_product_negotiations_status ON product_negotiations (tenant_id, status);

-- Adiciona FK de sales -> product_negotiations após criação da tabela
ALTER TABLE sales
  ADD CONSTRAINT fk_sales_negotiation
  FOREIGN KEY (negotiation_id)
  REFERENCES product_negotiations (id)
  ON DELETE SET NULL;

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada tabela recebe sua própria política.
-- • Tabelas com tenant_id direto  → comparação direta.
-- • Tabelas de junção sem tenant_id → EXISTS + JOIN na tabela pai.
-- Requer que app.current_tenant_id esteja definido na sessão
-- (ex.: SET LOCAL app.current_tenant_id = '<uuid>').
-- =============================================================

-- Helper: alias legível para o tenant corrente da sessão
-- (evita repetição do cast em cada política)

-- ── Tabelas com tenant_id direto ────────────────────────────

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_actions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_action_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_daily_services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON institutions
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON courses
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON product_categories
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON products
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON classes
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON class_products
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON class_timeline_events
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON funnels
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON funnel_stages
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON clients
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON client_activities
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON client_tasks
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON activity_types
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON events
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON event_activities
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON cs_actions
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON cs_action_activities
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON cs_daily_services
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON sales
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY tenant_isolation ON product_negotiations
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ── Tabelas de junção sem tenant_id → JOIN na tabela pai ────

ALTER TABLE class_courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_responsible_users ENABLE ROW LEVEL SECURITY;

-- class_courses: verifica tenant via tabela classes
CREATE POLICY tenant_isolation ON class_courses
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id        = class_courses.class_id
        AND classes.tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  );

-- funnel_responsible_users: verifica tenant via tabela funnels
CREATE POLICY tenant_isolation ON funnel_responsible_users
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id        = funnel_responsible_users.funnel_id
        AND funnels.tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  );

-- =============================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================================

COMMENT ON TABLE users                  IS 'Usuários do sistema (consultores, admins, visualizadores)';
COMMENT ON TABLE institutions           IS 'Instituições de ensino cadastradas';
COMMENT ON TABLE courses                IS 'Cursos disponíveis';
COMMENT ON TABLE product_categories     IS 'Categorias de produtos';
COMMENT ON TABLE products               IS 'Produtos comercializados (ex: anel, colação, foto)';
COMMENT ON TABLE classes                IS 'Turmas de formandos';
COMMENT ON TABLE class_courses          IS 'Cursos vinculados a uma turma (N:N)';
COMMENT ON TABLE class_products         IS 'Produtos configurados por turma com metas e preços';
COMMENT ON TABLE class_timeline_events  IS 'Timeline de marcos de cada turma';
COMMENT ON TABLE funnels                IS 'Funis de vendas configuráveis';
COMMENT ON TABLE funnel_responsible_users IS 'Usuários responsáveis por cada funil (N:N)';
COMMENT ON TABLE funnel_stages          IS 'Etapas de um funil';
COMMENT ON TABLE clients                IS 'Clientes / formandos';
COMMENT ON TABLE client_activities      IS 'Histórico de interações com o cliente';
COMMENT ON TABLE client_tasks           IS 'Tarefas agendadas para um cliente';
COMMENT ON TABLE activity_types         IS 'Tipos de atividade configuráveis';
COMMENT ON TABLE events                 IS 'Eventos (calouradas, formaturas, etc.)';
COMMENT ON TABLE event_activities       IS 'Log de atividades de um evento';
COMMENT ON TABLE cs_actions             IS 'Ações de Customer Success por turma';
COMMENT ON TABLE cs_action_activities   IS 'Log de atividades de uma ação CS';
COMMENT ON TABLE cs_daily_services      IS 'Atendimentos diários do CS';
COMMENT ON TABLE sales                  IS 'Vendas realizadas';
COMMENT ON TABLE product_negotiations   IS 'Negociações de produtos (pipeline de vendas)';
