
// Ponto de restauração: restaur_00018

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User, UserRole, Institution, Course, Product, ProductCategory, ClassRoom, Funnel, Client, Sale, Event, ProductNegotiation, NegotiationStatus, ClassProduct, CSAction, CSActionActivity, TrashItem, EventActivity, ActivityType, Task, CSDailyService, Activity, BackupSettings, BackupFile, DemandType } from './types';
import { MOCK_USERS, MOCK_INSTITUTIONS, MOCK_COURSES, MOCK_PRODUCTS, MOCK_FUNNELS, MOCK_CLASSES, MOCK_CLIENTS, MOCK_SALES, MOCK_ACTIVITY_TYPES } from './constants';
import { supabase } from './src/lib/supabase';
import * as XLSX from 'xlsx';

interface DataContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  institutions: Institution[];
  setInstitutions: React.Dispatch<React.SetStateAction<Institution[]>>;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  productCategories: ProductCategory[];
  setProductCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  classes: ClassRoom[];
  setClasses: React.Dispatch<React.SetStateAction<ClassRoom[]>>;
  funnels: Funnel[];
  setFunnels: React.Dispatch<React.SetStateAction<Funnel[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activityTypes: ActivityType[];
  setActivityTypes: React.Dispatch<React.SetStateAction<ActivityType[]>>;
  demandTypes: DemandType[];
  setDemandTypes: React.Dispatch<React.SetStateAction<DemandType[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  negotiations: ProductNegotiation[];
  setNegotiations: React.Dispatch<React.SetStateAction<ProductNegotiation[]>>;
  csActions: CSAction[];
  setCsActions: React.Dispatch<React.SetStateAction<CSAction[]>>;
  csDailyServices: CSDailyService[];
  setCsDailyServices: React.Dispatch<React.SetStateAction<CSDailyService[]>>;
  trash: TrashItem[];
  googleSheetUrl: string;
  setGoogleSheetUrl: (url: string) => void;
  syncWithGoogleSheet: () => Promise<void>;
  moveToTrash: (entityType: TrashItem['entityType'], ids: string[]) => void;
  restoreFromTrash: (trashId: string) => void;
  permanentDeleteFromTrash: (trashIds: string[]) => void;
  purgeExpiredTrash: () => void;
  updateClientStage: (clientId: string, newStageId: string) => void;
  addClientActivity: (clientId: string, activity: any) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  // ── Supabase-backed CRUD ────────────────────────────────
  addInstitution: (data: Omit<Institution, 'id' | 'createdAt'>) => Promise<void>;
  updateInstitution: (institution: Institution) => Promise<void>;
  deleteInstitution: (id: string) => Promise<void>;
  addCourse: (data: Omit<Course, 'id' | 'createdAt'>) => Promise<void>;
  updateCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addProductCategory: (data: Omit<ProductCategory, 'id' | 'createdAt'>) => Promise<void>;
  updateProductCategory: (category: ProductCategory) => Promise<void>;
  deleteProductCategory: (id: string) => Promise<void>;
  addProduct: (data: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addActivityType: (data: Omit<ActivityType, 'id' | 'createdAt'>) => Promise<void>;
  updateActivityType: (activityType: ActivityType) => Promise<void>;
  deleteActivityType: (id: string) => Promise<void>;
  addDemandType: (data: Omit<DemandType, 'id' | 'createdAt'>) => Promise<void>;
  updateDemandType: (demandType: DemandType) => Promise<void>;
  deleteDemandType: (id: string) => Promise<void>;
  addClass: (newClass: ClassRoom) => Promise<void>;
  updateClass: (updatedClass: ClassRoom) => Promise<void>;
  deleteClass: (classId: string) => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  addEventActivity: (eventId: string, activity: EventActivity) => void;
  deleteEvent: (eventId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  canDeleteEntity: (type: TrashItem['entityType'], id: string) => { can: boolean; reason?: string };
  updateFunnel: (funnel: Funnel) => void;
  addFunnel: (funnel: Funnel) => void;
  deleteFunnel: (funnelId: string) => void;
  isStageOccupied: (stageId: string) => boolean;
  addSale: (sale: Sale) => void;
  updateSale: (sale: Sale) => void;
  deleteSale: (saleId: string) => void;
  addNegotiation: (negotiation: ProductNegotiation) => void;
  deleteNegotiation: (negId: string) => void;
  updateNegotiationStatus: (id: string, status: NegotiationStatus) => void;
  addClassProduct: (classId: string, cp: ClassProduct) => void;
  updateClassProduct: (classId: string, cp: ClassProduct) => void;
  removeClassProduct: (classId: string, productId: string) => void;
  addCSAction: (action: CSAction) => void;
  updateCSAction: (action: CSAction) => void;
  addCSActionActivity: (actionId: string, activity: CSActionActivity) => void;
  deleteCSAction: (id: string) => void;
  addCSDailyService: (service: CSDailyService) => void;
  updateCSDailyService: (service: CSDailyService) => void;
  deleteCSDailyService: (id: string) => void;
  resetDatabase: () => void;
  exportDatabase: () => string;
  importDatabase: (jsonData: string) => void;
  exportAllData: () => Promise<string>;
  importAllData: (json: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  // ── Backup automático ───────────────────────────────────────────────────────
  backupSettings: BackupSettings | null;
  loadBackupSettings: () => Promise<void>;
  saveBackupSettings: (patch: { enabled?: boolean; frequency?: 'daily' | 'weekly' }) => Promise<void>;
  listBackups: () => Promise<BackupFile[]>;
  triggerManualBackup: () => Promise<{ filename: string; sizeKb: number }>;
  downloadBackupFile: (path: string, filename: string) => Promise<void>;
}

const STORAGE_KEY = 'crm_top_formaturas_v1_prod_v3';

// ── Mapper: linha do Supabase → ClassRoom ──────────────────────────────────
function mapClassRow(row: any): ClassRoom {
  return {
    id: row.id,
    name: row.name,
    institutionId: row.institution_id,
    courseIds: (row.class_courses ?? []).map((cc: any) => cc.course_id),
    graduationYear: row.graduation_year,
    graduationMonth: row.graduation_month,
    comercialExterno: row.comercial_externo ?? '',
    gestorProjeto: row.gestor_projeto ?? '',
    consultorCSId: row.consultor_cs_id ?? '',
    createdAt: row.created_at?.split('T')[0] ?? '',
    classProducts: (row.class_products ?? []).map((cp: any) => ({
      id: cp.id,
      productId: cp.product_id,
      customPrice: cp.custom_price,
      goalQuantity: cp.goal_quantity,
      goalValue: cp.goal_value,
      erpQuantity: cp.erp_quantity ?? undefined,
      erpValue: cp.erp_value ?? undefined,
      saleLimit: (cp.sale_limit as 'UNICO' | 'MULTIPLO') ?? 'MULTIPLO',
    })),
    timeline: (row.class_timeline_events ?? []).map((te: any) => ({
      id: te.id,
      title: te.title,
      date: te.date,
      description: te.description ?? '',
      completed: te.completed ?? false,
    })),
  };
}

// ── Mapper: linha do Supabase → Client ────────────────────────────────────
function mapClientRow(row: any): Client {
  return {
    id:             row.id,
    name:           row.name ?? '',
    birthDate:      row.birth_date ?? '',
    gender:         row.gender ?? '',
    cpf:            row.cpf ?? '',
    email:          row.email ?? '',
    phone:          row.phone ?? '',
    institutionId:  row.institution_id ?? '',
    campus:         row.campus ?? '',
    courseId:       row.course_id ?? '',
    classId:        row.class_id ?? '',
    shift:          row.shift ?? '',
    funnelId:       row.funnel_id ?? '',
    stageId:        row.stage_id ?? '',
    tags:           row.tags ?? [],
    totalValue:     row.total_value ?? 0,
    purchasesCount: row.purchases_count ?? 0,
    sellerId:       row.seller_id ?? '',
    createdAt:      row.created_at?.split('T')[0] ?? '',
    activities:     (row.client_activities ?? []).map((a: any) => ({
      id:          a.id,
      type:        a.type,
      description: a.description ?? '',
      timestamp:   a.timestamp ?? '',
      attachments: a.attachments ?? [],
    })),
  };
}

// ── Mapper: linha do Supabase → Funnel ────────────────────────────────────
function mapFunnelRow(row: any): Funnel {
  return {
    id:   row.id,
    name: row.name ?? '',
    stages: (row.funnel_stages ?? [])
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((s: any) => ({
        id:    s.id,
        name:  s.name ?? '',
        order: s.order ?? 0,
        color: s.color ?? undefined,
        type:  s.type ?? 'NORMAL',
      })),
    responsibleUserIds: (row.funnel_responsible_users ?? []).map((r: any) => r.user_id),
  };
}

// ── Mapper: linha do Supabase → Event ────────────────────────────────────
function mapEventRow(row: any): Event {
  return {
    id:            row.id,
    name:          row.name ?? '',
    type:          row.type ?? '',
    startDateTime: row.start_date_time ?? '',
    endDateTime:   row.end_date_time ?? '',
    status:        row.status ?? 'Previsão',
    classId:       row.class_id ?? undefined,
    activities:    (row.event_activities ?? []).map((a: any) => ({
      id:          a.id,
      userName:    a.user_name ?? '',
      description: a.description ?? '',
      timestamp:   a.timestamp ?? '',
    })),
  };
}

// ── Mapper: linha do Supabase → CSAction ─────────────────────────────────
function mapCSActionRow(row: any): CSAction {
  return {
    id:               row.id,
    classId:          row.class_id ?? '',
    type:             row.type ?? '',
    startDate:        row.start_date ?? '',
    endDate:          row.end_date ?? '',
    status:           row.status ?? '',
    totalReached:     row.total_reached ?? 0,
    totalResponses:   row.total_responses ?? 0,
    volumeSold:       row.volume_sold ?? 0,
    revenueResult:    row.revenue_result ?? 0,
    channel:          row.channel ?? '',
    responsibleUserId: row.responsible_user_id ?? undefined,
    createdAt:        row.created_at?.split('T')[0] ?? '',
    activities:       (row.cs_action_activities ?? []).map((a: any) => ({
      id:          a.id,
      userName:    a.user_name ?? '',
      description: a.description ?? '',
      timestamp:   a.timestamp ?? '',
    })),
  };
}

// ── Mapper: linha do Supabase → Sale ─────────────────────────────────────
function mapSaleRow(row: any): Sale {
  return {
    id:            row.id,
    clientId:      row.client_id  ?? '',
    productId:     row.product_id ?? '',
    sellerId:      row.seller_id  ?? '',
    value:         row.value      ?? 0,
    quantity:      row.quantity   ?? 1,
    date:          row.date       ?? '',
    classId:       row.class_id   ?? '',
    negotiationId: row.negotiation_id ?? undefined,
  };
}

// ── Mapper: linha do Supabase → ProductNegotiation ────────────────────────
function mapNegotiationRow(row: any): ProductNegotiation {
  return {
    id:        row.id,
    clientId:  row.client_id  ?? '',
    productId: row.product_id ?? '',
    sellerId:  row.seller_id  ?? '',
    value:     row.value      ?? 0,
    quantity:  row.quantity   ?? 1,
    status:    (row.status    ?? 'ABERTO') as NegotiationStatus,
    createdAt: row.created_at?.split('T')[0] ?? '',
    closedAt:  row.closed_at  ? row.closed_at.split('T')[0] : undefined,
  };
}

// ── Mapper: linha do Supabase → Task ──────────────────────────────────────
function mapTaskRow(row: any): Task {
  return {
    id:          row.id,
    clientId:    row.client_id   ?? '',
    title:       row.title       ?? '',
    date:        row.date        ?? '',
    time:        row.time        ?? '',
    description: row.description ?? undefined,
    completed:   row.completed   ?? false,
    createdAt:   row.created_at?.split('T')[0] ?? '',
  };
}

// ── Mapper: linha do Supabase → CSDailyService ───────────────────────────
function mapCSDailyServiceRow(row: any): CSDailyService {
  return {
    id:                row.id,
    clientId:          row.client_id ?? '',
    clientPhone:       row.client_phone ?? '',
    clientNameManual:  row.client_name_manual ?? undefined,
    date:              row.date ?? '',
    type:              row.type ?? '',
    summary:           row.summary ?? '',
    status:            row.status ?? '',
    responsibleUserId: row.responsible_user_id ?? '',
    createdAt:         row.created_at ?? '',
    // Campos expandidos
    classId:        row.class_id        ?? undefined,
    canalContatado: row.canal_contatado ?? undefined,
    demandTypeId:   row.demand_type_id  ?? undefined,
    resolucao:      row.resolucao       ?? undefined,
    repasse:        row.repasse         ?? undefined,
    repasseSetor:   row.repasse_setor   ?? undefined,
    obs:            row.obs             ?? undefined,
    valorVenda:     row.valor_venda     ?? undefined,
    retorno:        row.retorno         ?? undefined,
    remarketing:    row.remarketing     ?? undefined,
    objecao:        row.objecao         ?? undefined,
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const today = new Date().toISOString().split('T')[0];
  const isInitialized = useRef(false);

  const load = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      if (saved === null) return defaultValue;
      return JSON.parse(saved);
    } catch (e) {
      return defaultValue;
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Rastreia o tenant_id a partir da sessão Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setTenantId(data.session?.user.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setTenantId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Entidades migradas para Supabase (sem localStorage) ──────────────────
  const [users, setUsers]               = useState<User[]>([]);
  const [clients, setClients]           = useState<Client[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courses, setCourses]           = useState<Course[]>([]);
  const [classes, setClasses]           = useState<ClassRoom[]>([]);
  const [funnels, setFunnels]           = useState<Funnel[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts]         = useState<Product[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [demandTypes, setDemandTypes]     = useState<DemandType[]>([]);

  // Fetch: institutions
  useEffect(() => {
    if (!tenantId) { setInstitutions([]); return; }
    supabase
      .from('institutions')
      .select('id, name, state, campi, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('institutions fetch:', error.message); return; }
        setInstitutions((data ?? []).map(r => ({
          id: r.id,
          name: r.name,
          state: r.state ?? '',
          campi: r.campi ?? [],
          createdAt: r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  // Fetch: courses
  useEffect(() => {
    if (!tenantId) { setCourses([]); return; }
    supabase
      .from('courses')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('courses fetch:', error.message); return; }
        setCourses((data ?? []).map(r => ({
          id: r.id,
          name: r.name,
          createdAt: r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  // Fetch: classes (com sub-tabelas)
  useEffect(() => {
    if (!tenantId) { setClasses([]); return; }
    supabase
      .from('classes')
      .select(`
        id, name, institution_id, graduation_year, graduation_month,
        comercial_externo, gestor_projeto, consultor_cs_id, created_at,
        class_courses(course_id),
        class_products(id, product_id, custom_price, goal_quantity, goal_value, erp_quantity, erp_value, sale_limit),
        class_timeline_events(id, title, date, description, completed)
      `)
      .eq('tenant_id', tenantId)
      .order('graduation_year')
      .then(({ data, error }) => {
        if (error) { console.error('classes fetch:', error.message); return; }
        setClasses((data ?? []).map(mapClassRow));
      });
  }, [tenantId]);

  // Fetch: clients (com atividades)
  useEffect(() => {
    if (!tenantId) { setClients([]); return; }
    supabase
      .from('clients')
      .select(`
        id, name, birth_date, gender, cpf, email, phone,
        institution_id, campus, course_id, class_id, shift,
        funnel_id, stage_id, tags, total_value, purchases_count,
        seller_id, created_at,
        client_activities(id, type, description, timestamp, attachments)
      `)
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('clients fetch:', error.message); return; }
        setClients((data ?? []).map(mapClientRow));
      });
  }, [tenantId]);

  // Fetch: funnels (com etapas e responsáveis)
  useEffect(() => {
    if (!tenantId) { setFunnels([]); return; }
    supabase
      .from('funnels')
      .select(`
        id, name,
        funnel_stages(id, name, order, color, type),
        funnel_responsible_users(user_id)
      `)
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('funnels fetch:', error.message); return; }
        setFunnels((data ?? []).map(mapFunnelRow));
      });
  }, [tenantId]);

  // Fetch: users
  useEffect(() => {
    if (!tenantId) { setUsers([]); return; }
    supabase
      .from('users')
      .select('id, name, email, role, phone, password, status, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('users fetch:', error.message); return; }
        setUsers((data ?? []).map(r => ({
          id:        r.id,
          name:      r.name,
          email:     r.email,
          role:      r.role as UserRole,
          phone:     r.phone ?? '',
          password:  r.password ?? '',
          status:    r.status as 'ATIVO' | 'INATIVO',
          createdAt: r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  // Fetch: productCategories
  useEffect(() => {
    if (!tenantId) { setProductCategories([]); return; }
    supabase
      .from('product_categories')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('productCategories fetch:', error.message); return; }
        setProductCategories((data ?? []).map(r => ({
          id:        r.id,
          name:      r.name,
          createdAt: r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  // Fetch: products
  useEffect(() => {
    if (!tenantId) { setProducts([]); return; }
    supabase
      .from('products')
      .select('id, name, category_id, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('products fetch:', error.message); return; }
        setProducts((data ?? []).map(r => ({
          id:         r.id,
          name:       r.name,
          categoryId: r.category_id,
          createdAt:  r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  // Fetch: activityTypes
  useEffect(() => {
    if (!tenantId) { setActivityTypes([]); return; }
    supabase
      .from('activity_types')
      .select('id, name, color, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('activityTypes fetch:', error.message); return; }
        setActivityTypes((data ?? []).map(r => ({
          id:        r.id,
          name:      r.name,
          color:     r.color ?? undefined,
          createdAt: r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  // Fetch: demandTypes
  useEffect(() => {
    if (!tenantId) { setDemandTypes([]); return; }
    supabase
      .from('demand_types')
      .select('id, name, color, created_at')
      .eq('tenant_id', tenantId)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('demandTypes fetch:', error.message); return; }
        setDemandTypes((data ?? []).map(r => ({
          id:        r.id,
          name:      r.name,
          color:     r.color ?? '#94a3b8',
          createdAt: r.created_at?.split('T')[0] ?? today,
        })));
      });
  }, [tenantId]);

  const [events, setEvents] = useState<Event[]>([]);
  const [csActions, setCsActions] = useState<CSAction[]>([]);
  const [csDailyServices, setCsDailyServices] = useState<CSDailyService[]>([]);

  // Fetch: events (com atividades)
  useEffect(() => {
    if (!tenantId) { setEvents([]); return; }
    supabase
      .from('events')
      .select(`
        id, name, type, start_date_time, end_date_time, status, class_id,
        event_activities(id, user_name, description, timestamp)
      `)
      .eq('tenant_id', tenantId)
      .order('start_date_time', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('events fetch:', error.message); return; }
        setEvents((data ?? []).map(mapEventRow));
      });
  }, [tenantId]);

  // Fetch: csActions (com atividades)
  useEffect(() => {
    if (!tenantId) { setCsActions([]); return; }
    supabase
      .from('cs_actions')
      .select(`
        id, class_id, type, start_date, end_date, status,
        total_reached, total_responses, volume_sold, revenue_result,
        channel, responsible_user_id, created_at,
        cs_action_activities(id, user_name, description, timestamp)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('csActions fetch:', error.message); return; }
        setCsActions((data ?? []).map(mapCSActionRow));
      });
  }, [tenantId]);

  // Fetch: csDailyServices
  useEffect(() => {
    if (!tenantId) { setCsDailyServices([]); return; }
    supabase
      .from('cs_daily_services')
      .select('id, client_id, client_phone, client_name_manual, date, type, summary, status, responsible_user_id, created_at, class_id, canal_contatado, demand_type_id, resolucao, repasse, repasse_setor, obs, valor_venda, retorno, remarketing, objecao')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('csDailyServices fetch:', error.message); return; }
        setCsDailyServices((data ?? []).map(mapCSDailyServiceRow));
      });
  }, [tenantId]);

  // ── Bloco 3: entidades financeiras migradas para Supabase ────────────────
  const [sales, setSales]               = useState<Sale[]>([]);
  const [negotiations, setNegotiations] = useState<ProductNegotiation[]>([]);
  const [tasks, setTasks]               = useState<Task[]>([]);

  // Fetch: sales
  useEffect(() => {
    if (!tenantId) { setSales([]); return; }
    supabase
      .from('sales')
      .select('id, client_id, product_id, seller_id, value, quantity, date, class_id, negotiation_id')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('sales fetch:', error.message); return; }
        setSales((data ?? []).map(mapSaleRow));
      });
  }, [tenantId]);

  // Fetch: negotiations
  useEffect(() => {
    if (!tenantId) { setNegotiations([]); return; }
    supabase
      .from('product_negotiations')
      .select('id, client_id, product_id, seller_id, value, quantity, status, created_at, closed_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('negotiations fetch:', error.message); return; }
        setNegotiations((data ?? []).map(mapNegotiationRow));
      });
  }, [tenantId]);

  // Fetch: tasks
  useEffect(() => {
    if (!tenantId) { setTasks([]); return; }
    supabase
      .from('client_tasks')
      .select('id, client_id, title, date, time, description, completed, created_at')
      .eq('tenant_id', tenantId)
      .order('date')
      .then(({ data, error }) => {
        if (error) { console.error('tasks fetch:', error.message); return; }
        setTasks((data ?? []).map(mapTaskRow));
      });
  }, [tenantId]);

  const [trash, setTrash] = useState<TrashItem[]>(() => load('trash', []));
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => load('googleSheetUrl', ''));

  useEffect(() => {
    if (!isInitialized.current) {
        isInitialized.current = true;
        if (googleSheetUrl) syncWithGoogleSheet();
        return;
    }

    // Todas as entidades de dados são persistidas no Supabase.
    // Apenas trash (frontend-only) e googleSheetUrl ficam em localStorage.
    const dataMap = { trash, googleSheetUrl };
    Object.entries(dataMap).forEach(([key, value]) => {
      localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
    });
  }, [trash, googleSheetUrl]);

  const syncWithGoogleSheet = async () => {
    if (!googleSheetUrl) return;
    try {
        let fetchUrl = googleSheetUrl;
        if (googleSheetUrl.includes('docs.google.com/spreadsheets')) {
            const idMatch = googleSheetUrl.match(/\/d\/(.+?)\//);
            if (idMatch) {
                fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/gviz/tq?tqx=out:csv`;
            }
        }
        const response = await fetch(fetchUrl);
        const csvText = await response.text();
        const workbook = XLSX.read(csvText, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const data: any = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data && data.length > 0 && data[0].backup_json) {
            importDatabase(data[0].backup_json);
        }
    } catch (e) {
        console.error('Falha ao sincronizar com Google Sheets:', e);
    }
  };

  const exportDatabase = () => {
    const fullData = {
        version: '1.6',
        timestamp: new Date().toISOString(),
        data: {
            users, clients, classes, institutions, courses, productCategories,
            products, funnels, events, tasks, activityTypes, sales, negotiations, csActions, csDailyServices, trash
        }
    };
    return JSON.stringify(fullData, null, 2);
  };

  const importDatabase = (jsonData: string) => {
    try {
        const parsed = JSON.parse(jsonData);
        const d = parsed.data || (parsed.backup_json ? JSON.parse(parsed.backup_json).data : null);
        if (!d) throw new Error('Formato inválido');
        
        if (d.users) setUsers(d.users);
        if (d.clients) setClients(d.clients);
        if (d.classes) setClasses(d.classes);
        if (d.institutions) setInstitutions(d.institutions);
        if (d.courses) setCourses(d.courses);
        if (d.productCategories) setProductCategories(d.productCategories);
        if (d.products) setProducts(d.products);
        if (d.funnels) setFunnels(d.funnels);
        if (d.events) setEvents(d.events);
        if (d.tasks) setTasks(d.tasks);
        if (d.activityTypes) setActivityTypes(d.activityTypes);
        if (d.sales) setSales(d.sales);
        if (d.negotiations) setNegotiations(d.negotiations);
        if (d.csActions) setCsActions(d.csActions);
        if (d.csDailyServices) setCsDailyServices(d.csDailyServices);
        if (d.trash) setTrash(d.trash);
    } catch (e) {
        console.error('Erro na importação:', e);
    }
  };

  const addTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
    if (tenantId) {
      supabase.from('client_tasks').insert({
        id:          task.id,
        tenant_id:   tenantId,
        client_id:   task.clientId,
        title:       task.title,
        date:        task.date        || null,
        time:        task.time        || null,
        description: task.description || null,
        completed:   task.completed   ?? false,
      }).then(({ error }) => { if (error) console.error('addTask:', error.message); });
    }
  };

  const updateTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    if (tenantId) {
      supabase.from('client_tasks').update({
        title:       task.title,
        date:        task.date        || null,
        time:        task.time        || null,
        description: task.description || null,
        completed:   task.completed   ?? false,
      }).eq('id', task.id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateTask:', error.message); });
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, completed: !t.completed };
      if (tenantId) {
        supabase.from('client_tasks').update({ completed: updated.completed })
          .eq('id', taskId).eq('tenant_id', tenantId)
          .then(({ error }) => { if (error) console.error('toggleTask:', error.message); });
      }
      return updated;
    }));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (tenantId) {
      supabase.from('client_tasks').delete()
        .eq('id', taskId).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('deleteTask:', error.message); });
    }
  };

  const moveToTrash = (entityType: TrashItem['entityType'], ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const deletedAt = new Date().toISOString();
    const newTrashItems: TrashItem[] = [];

    const handleRemoval = (state: any[], setter: (val: any) => void, nameField: string) => {
        const itemsToMove = state.filter(i => ids.includes(i.id));
        itemsToMove.forEach(item => {
            newTrashItems.push({
                id: `trash-${Date.now()}-${Math.random()}`,
                entityType,
                data: item,
                deletedAt,
                originalName: item[nameField] || item.type || item.summary || 'Sem Nome'
            });
        });
        setter(state.filter(i => !ids.includes(i.id)));
    };

    switch (entityType) {
        case 'institution':
          // Supabase delete — sem await para não bloquear a UI
          if (tenantId) ids.forEach(id => supabase.from('institutions').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(institutions, setInstitutions, 'name');
          break;
        case 'course':
          if (tenantId) ids.forEach(id => supabase.from('courses').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(courses, setCourses, 'name');
          break;
        case 'class':
          if (tenantId) ids.forEach(id => supabase.from('classes').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(classes, setClasses, 'name');
          break;
        case 'funnel':
          if (tenantId) ids.forEach(id => supabase.from('funnels').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(funnels, setFunnels, 'name');
          break;
        case 'client':
          if (tenantId) ids.forEach(id => supabase.from('clients').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(clients, setClients, 'name');
          break;
        case 'product':
          if (tenantId) ids.forEach(id => supabase.from('products').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(products, setProducts, 'name');
          break;
        case 'productCategory':
          if (tenantId) ids.forEach(id => supabase.from('product_categories').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(productCategories, setProductCategories, 'name');
          break;
        case 'user':
          if (tenantId) ids.forEach(id => supabase.from('users').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(users, setUsers, 'name');
          break;
        case 'event':
          if (tenantId) ids.forEach(id => supabase.from('events').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(events, setEvents, 'name');
          break;
        case 'activityType':
          if (tenantId) ids.forEach(id => supabase.from('activity_types').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(activityTypes, setActivityTypes, 'name');
          break;
        case 'csAction':
          if (tenantId) ids.forEach(id => supabase.from('cs_actions').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(csActions, setCsActions, 'type');
          break;
        case 'csDailyService':
          if (tenantId) ids.forEach(id => supabase.from('cs_daily_services').delete().eq('id', id).eq('tenant_id', tenantId).then());
          handleRemoval(csDailyServices, setCsDailyServices, 'summary');
          break;
    }

    if (newTrashItems.length > 0) {
        setTrash(prev => [...newTrashItems, ...prev]);
    }
  };

  const restoreFromTrash = (trashId: string) => {
    const item = trash.find(t => t.id === trashId);
    if (!item) return;

    const restoredData = item.data;
    switch (item.entityType) {
        case 'institution':
          if (tenantId) {
            supabase.from('institutions').insert({
              id: restoredData.id, tenant_id: tenantId, name: restoredData.name,
              state: restoredData.state, campi: restoredData.campi ?? [],
            }).then(({ error }) => { if (error) console.error('restore institution:', error.message); });
          }
          setInstitutions(p => [...p, restoredData]);
          break;
        case 'course':
          if (tenantId) {
            supabase.from('courses').insert({
              id: restoredData.id, tenant_id: tenantId, name: restoredData.name,
            }).then(({ error }) => { if (error) console.error('restore course:', error.message); });
          }
          setCourses(p => [...p, restoredData]);
          break;
        case 'class':
          if (tenantId) {
            supabase.from('classes').insert({
              id: restoredData.id, tenant_id: tenantId, name: restoredData.name,
              institution_id: restoredData.institutionId,
              graduation_year: restoredData.graduationYear,
              graduation_month: restoredData.graduationMonth,
              comercial_externo: restoredData.comercialExterno || null,
              gestor_projeto: restoredData.gestorProjeto || null,
              consultor_cs_id: restoredData.consultorCSId || null,
            }).then(async ({ error }) => {
              if (error) { console.error('restore class:', error.message); return; }
              if (restoredData.courseIds?.length) {
                await supabase.from('class_courses').insert(
                  restoredData.courseIds.map((cid: string) => ({ class_id: restoredData.id, course_id: cid }))
                );
              }
            });
          }
          setClasses(p => [...p, restoredData]);
          break;
        case 'funnel':
          if (tenantId) {
            supabase.from('funnels')
              .insert({ id: restoredData.id, tenant_id: tenantId, name: restoredData.name })
              .then(async ({ error }) => {
                if (error) { console.error('restore funnel:', error.message); return; }
                await persistFunnelRelations(restoredData as Funnel, tenantId);
              });
          }
          setFunnels(p => [...p, restoredData]);
          break;
        case 'client':
          if (tenantId) {
            // upsert em vez de insert: contorna UNIQUE (tenant_id, email) e garante idempotência
            supabase.from('clients')
              .upsert(clientPayload(restoredData as Client, tenantId), { onConflict: 'id' })
              .then(async ({ error }) => {
                if (error) { console.error('restore client:', error.message); return; }
                // Re-inserir atividades (deletadas em cascade no Supabase)
                const activities = (restoredData as Client).activities ?? [];
                if (activities.length > 0 && tenantId) {
                  await supabase.from('client_activities').upsert(
                    activities.map((a: any) => ({
                      id:          a.id,
                      tenant_id:   tenantId,
                      client_id:   (restoredData as Client).id,
                      type:        a.type,
                      description: a.description ?? '',
                      timestamp:   a.timestamp ?? new Date().toISOString(),
                      attachments: a.attachments ?? [],
                    })),
                    { onConflict: 'id' }
                  ).then(({ error: e }) => { if (e) console.error('restore client_activities:', e.message); });
                }
              });
          }
          setClients(p => [...p, restoredData]);
          break;
        case 'product':
          if (tenantId) {
            supabase.from('products').insert({ id: restoredData.id, tenant_id: tenantId, name: restoredData.name, category_id: restoredData.categoryId })
              .then(({ error }) => { if (error) console.error('restore product:', error.message); });
          }
          setProducts(p => [...p, restoredData]);
          break;
        case 'productCategory':
          if (tenantId) {
            supabase.from('product_categories').insert({ id: restoredData.id, tenant_id: tenantId, name: restoredData.name })
              .then(({ error }) => { if (error) console.error('restore productCategory:', error.message); });
          }
          setProductCategories(p => [...p, restoredData]);
          break;
        case 'user':
          if (tenantId) {
            supabase.from('users').insert({ id: restoredData.id, tenant_id: tenantId, name: restoredData.name, email: restoredData.email, role: restoredData.role, phone: restoredData.phone ?? '', password: restoredData.password ?? '', status: restoredData.status ?? 'ATIVO' })
              .then(({ error }) => { if (error) console.error('restore user:', error.message); });
          }
          setUsers(p => [...p, restoredData]);
          break;
        case 'event':
          if (tenantId) {
            supabase.from('events').insert({
              id:              restoredData.id,
              tenant_id:       tenantId,
              name:            restoredData.name,
              type:            restoredData.type,
              start_date_time: restoredData.startDateTime || new Date().toISOString(),
              end_date_time:   restoredData.endDateTime   || restoredData.startDateTime || new Date().toISOString(),
              status:          restoredData.status,
              class_id:        restoredData.classId        || null,
            }).then(({ error }) => { if (error) console.error('restore event:', error.message); });
          }
          setEvents(p => [...p, restoredData]);
          break;
        case 'activityType':
          if (tenantId) {
            supabase.from('activity_types').insert({ id: restoredData.id, tenant_id: tenantId, name: restoredData.name, color: restoredData.color ?? null })
              .then(({ error }) => { if (error) console.error('restore activityType:', error.message); });
          }
          setActivityTypes(p => [...p, restoredData]);
          break;
        case 'csAction':
          if (tenantId) {
            supabase.from('cs_actions').insert({
              id:                  restoredData.id,
              tenant_id:           tenantId,
              class_id:            restoredData.classId,
              type:                restoredData.type,
              start_date:          restoredData.startDate          || null,
              end_date:            restoredData.endDate            || null,
              status:              restoredData.status,
              total_reached:       restoredData.totalReached       ?? 0,
              total_responses:     restoredData.totalResponses     ?? 0,
              volume_sold:         restoredData.volumeSold         ?? 0,
              revenue_result:      restoredData.revenueResult      ?? 0,
              channel:             restoredData.channel            || null,
              responsible_user_id: restoredData.responsibleUserId  || null,
            }).then(({ error }) => { if (error) console.error('restore csAction:', error.message); });
          }
          setCsActions(p => [...p, restoredData]);
          break;
        case 'csDailyService':
          if (tenantId) {
            supabase.from('cs_daily_services').insert({
              id:                  restoredData.id,
              tenant_id:           tenantId,
              client_id:           restoredData.clientId          || null,
              client_phone:        restoredData.clientPhone,
              client_name_manual:  restoredData.clientNameManual  || null,
              date:                restoredData.date,
              type:                restoredData.type,
              summary:             restoredData.summary,
              status:              restoredData.status,
              responsible_user_id: restoredData.responsibleUserId || null,
            }).then(({ error }) => { if (error) console.error('restore csDailyService:', error.message); });
          }
          setCsDailyServices(p => [...p, restoredData]);
          break;
    }

    setTrash(p => p.filter(t => t.id !== trashId));
  };

  const permanentDeleteFromTrash = (trashIds: string[]) => {
    setTrash(p => p.filter(t => !trashIds.includes(t.id)));
  };

  const purgeExpiredTrash = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    setTrash(p => p.filter(t => new Date(t.deletedAt) >= cutoff));
  };

  const canDeleteEntity = (type: TrashItem['entityType'], id: string) => {
    if (currentUser?.role === UserRole.ADMIN) return { can: true };
    switch (type) {
      case 'institution':
        if (classes.some(c => c.institutionId === id)) return { can: false, reason: 'A instituição possui turmas ativas.' };
        break;
      case 'course':
        if (classes.some(c => c.courseIds.includes(id))) return { can: false, reason: 'O curso está vinculado a turmas.' };
        break;
      case 'productCategory':
        if (products.some(p => p.categoryId === id)) return { can: false, reason: 'A categoria possui produtos vinculados.' };
        break;
    }
    return { can: true };
  };

  const updateClientStage = (clientId: string, newStageId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, stageId: newStageId } : c));
    if (tenantId) {
      supabase.from('clients')
        .update({ stage_id: newStageId })
        .eq('id', clientId).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateClientStage:', error.message); });
    }
  };

  const addClientActivity = (clientId: string, activity: any) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, activities: [activity, ...c.activities] } : c));
    if (tenantId) {
      supabase.from('client_activities').insert({
        id:          activity.id || `act-${Date.now()}`,
        tenant_id:   tenantId,
        client_id:   clientId,
        type:        activity.type,
        description: activity.description ?? '',
        timestamp:   new Date().toISOString(),
        attachments: activity.attachments ?? [],
      }).then(({ error }) => { if (error) console.error('addClientActivity:', error.message); });
    }
  };

  // Helper interno: monta o payload de insert/update de clients para o Supabase
  const clientPayload = (c: Client, tid: string) => ({
    id:              c.id,
    tenant_id:       tid,
    name:            c.name,
    birth_date:      c.birthDate   || null,
    gender:          c.gender      || null,
    cpf:             c.cpf         || null,
    email:           c.email       || null,
    phone:           c.phone       || null,
    institution_id:  c.institutionId || null,
    campus:          c.campus      || null,
    course_id:       c.courseId    || null,
    class_id:        c.classId     || null,
    shift:           c.shift       || null,
    funnel_id:       c.funnelId    || null,
    stage_id:        c.stageId     || null,
    tags:            c.tags        ?? [],
    total_value:     c.totalValue  ?? 0,
    purchases_count: c.purchasesCount ?? 0,
    seller_id:       c.sellerId    || null,
  });

  const addClient = (client: Client) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newClient = { ...client, createdAt: client.createdAt || todayStr };

    // Varredura retroativa por atendimentos diários CS órfãos (apenas com telefone)
    const orphans = csDailyServices.filter(s => s.clientPhone === client.phone && !s.clientId);
    const orphanActivities: Activity[] = orphans.map(o => ({
        id: `act-retro-${o.id}`,
        type: o.type === 'Ligação' ? 'call' : o.type === 'E-mail' ? 'email' : 'note',
        description: `ATENDIMENTO CS (Vínculo Retroativo): ${o.summary}`,
        timestamp: new Date(o.createdAt).toLocaleString('pt-BR')
    }));

    if (orphans.length > 0) {
        newClient.activities = [...orphanActivities, ...newClient.activities];
        setCsDailyServices(prev => prev.map(s => s.clientPhone === client.phone ? { ...s, clientId: newClient.id } : s));
        if (tenantId) {
          supabase.from('cs_daily_services')
            .update({ client_id: newClient.id })
            .eq('client_phone', client.phone)
            .eq('tenant_id', tenantId)
            .then(({ error }) => { if (error) console.error('retroactive csDs link:', error.message); });
        }
    }

    setClients(prev => [newClient, ...prev]);

    // Persiste no Supabase (fire-and-forget)
    if (tenantId) {
      supabase.from('clients').insert(clientPayload(newClient, tenantId))
        .then(({ error }) => { if (error) console.error('addClient:', error.message); });

      if (newClient.activities?.length) {
        supabase.from('client_activities').insert(
          newClient.activities.map(a => ({
            id:          a.id,
            tenant_id:   tenantId,
            client_id:   newClient.id,
            type:        a.type,
            description: a.description ?? '',
            timestamp:   new Date().toISOString(),
            attachments: a.attachments ?? [],
          }))
        ).then(({ error }) => { if (error) console.error('addClient activities:', error.message); });
      }
    }
  };

  const updateClient = (client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    if (tenantId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenant_id: _tid, ...payload } = clientPayload(client, tenantId) as any;
      supabase.from('clients').update(payload)
        .eq('id', client.id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateClient:', error.message); });
    }
  };
  
  // ── institutions ────────────────────────────────────────────────────────────

  const addInstitution = async (data: Omit<Institution, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('institutions')
      .insert({ tenant_id: tenantId, name: data.name, state: data.state, campi: data.campi ?? [] })
      .select('id, name, state, campi, created_at')
      .single();
    if (error) { console.error('addInstitution:', error.message); return; }
    setInstitutions(prev => [...prev, {
      id: row.id, name: row.name, state: row.state ?? '',
      campi: row.campi ?? [], createdAt: row.created_at?.split('T')[0] ?? today,
    }]);
  };

  const updateInstitution = async (institution: Institution) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('institutions')
      .update({ name: institution.name, state: institution.state, campi: institution.campi ?? [] })
      .eq('id', institution.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateInstitution:', error.message); return; }
    setInstitutions(prev => prev.map(i => i.id === institution.id ? institution : i));
  };

  const deleteInstitution = async (id: string) => {
    if (!tenantId) return;
    const item = institutions.find(i => i.id === id);
    if (!item) return;
    const { error } = await supabase
      .from('institutions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('deleteInstitution:', error.message); return; }
    setInstitutions(prev => prev.filter(i => i.id !== id));
    setTrash(prev => [{
      id: `trash-${Date.now()}-${Math.random()}`,
      entityType: 'institution',
      data: item,
      deletedAt: new Date().toISOString(),
      originalName: item.name,
    }, ...prev]);
  };

  // ── courses ─────────────────────────────────────────────────────────────────

  const addCourse = async (data: Omit<Course, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('courses')
      .insert({ tenant_id: tenantId, name: data.name })
      .select('id, name, created_at')
      .single();
    if (error) { console.error('addCourse:', error.message); return; }
    setCourses(prev => [...prev, { id: row.id, name: row.name, createdAt: row.created_at?.split('T')[0] ?? today }]);
  };

  const updateCourse = async (course: Course) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('courses')
      .update({ name: course.name })
      .eq('id', course.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateCourse:', error.message); return; }
    setCourses(prev => prev.map(c => c.id === course.id ? course : c));
  };

  const deleteCourse = async (id: string) => {
    if (!tenantId) return;
    const item = courses.find(c => c.id === id);
    if (!item) return;
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('deleteCourse:', error.message); return; }
    setCourses(prev => prev.filter(c => c.id !== id));
    setTrash(prev => [{
      id: `trash-${Date.now()}-${Math.random()}`,
      entityType: 'course',
      data: item,
      deletedAt: new Date().toISOString(),
      originalName: item.name,
    }, ...prev]);
  };

  // ── users ───────────────────────────────────────────────────────────────────

  const addUser = async (data: Omit<User, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('users')
      .insert({ tenant_id: tenantId, name: data.name, email: data.email, role: data.role, phone: data.phone ?? '', password: data.password ?? '', status: data.status ?? 'ATIVO' })
      .select('id, name, email, role, phone, password, status, created_at')
      .single();
    if (error) { console.error('addUser:', error.message); return; }
    setUsers(prev => [...prev, { id: row.id, name: row.name, email: row.email, role: row.role as UserRole, phone: row.phone ?? '', password: row.password ?? '', status: row.status as 'ATIVO' | 'INATIVO', createdAt: row.created_at?.split('T')[0] ?? today }]);
  };

  const updateUser = async (user: User) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('users')
      .update({ name: user.name, email: user.email, role: user.role, phone: user.phone ?? '', password: user.password ?? '', status: user.status })
      .eq('id', user.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateUser:', error.message); return; }
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  };

  const deleteUser = async (id: string) => {
    if (!tenantId) return;
    const item = users.find(u => u.id === id);
    if (!item) return;
    const { error } = await supabase.from('users').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) { console.error('deleteUser:', error.message); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
    setTrash(prev => [{ id: `trash-${Date.now()}-${Math.random()}`, entityType: 'user', data: item, deletedAt: new Date().toISOString(), originalName: item.name }, ...prev]);
  };

  // ── productCategories ────────────────────────────────────────────────────────

  const addProductCategory = async (data: Omit<ProductCategory, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('product_categories')
      .insert({ tenant_id: tenantId, name: data.name })
      .select('id, name, created_at')
      .single();
    if (error) { console.error('addProductCategory:', error.message); return; }
    setProductCategories(prev => [...prev, { id: row.id, name: row.name, createdAt: row.created_at?.split('T')[0] ?? today }]);
  };

  const updateProductCategory = async (category: ProductCategory) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('product_categories')
      .update({ name: category.name })
      .eq('id', category.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateProductCategory:', error.message); return; }
    setProductCategories(prev => prev.map(c => c.id === category.id ? category : c));
  };

  const deleteProductCategory = async (id: string) => {
    if (!tenantId) return;
    const item = productCategories.find(c => c.id === id);
    if (!item) return;
    const { error } = await supabase.from('product_categories').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) { console.error('deleteProductCategory:', error.message); return; }
    setProductCategories(prev => prev.filter(c => c.id !== id));
    setTrash(prev => [{ id: `trash-${Date.now()}-${Math.random()}`, entityType: 'productCategory', data: item, deletedAt: new Date().toISOString(), originalName: item.name }, ...prev]);
  };

  // ── products ─────────────────────────────────────────────────────────────────

  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('products')
      .insert({ tenant_id: tenantId, name: data.name, category_id: data.categoryId })
      .select('id, name, category_id, created_at')
      .single();
    if (error) { console.error('addProduct:', error.message); return; }
    setProducts(prev => [...prev, { id: row.id, name: row.name, categoryId: row.category_id, createdAt: row.created_at?.split('T')[0] ?? today }]);
  };

  const updateProduct = async (product: Product) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('products')
      .update({ name: product.name, category_id: product.categoryId })
      .eq('id', product.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateProduct:', error.message); return; }
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const deleteProduct = async (id: string) => {
    if (!tenantId) return;
    const item = products.find(p => p.id === id);
    if (!item) return;
    const { error } = await supabase.from('products').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) { console.error('deleteProduct:', error.message); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
    setTrash(prev => [{ id: `trash-${Date.now()}-${Math.random()}`, entityType: 'product', data: item, deletedAt: new Date().toISOString(), originalName: item.name }, ...prev]);
  };

  // ── activityTypes ────────────────────────────────────────────────────────────

  const addActivityType = async (data: Omit<ActivityType, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('activity_types')
      .insert({ tenant_id: tenantId, name: data.name, color: data.color ?? null })
      .select('id, name, color, created_at')
      .single();
    if (error) { console.error('addActivityType:', error.message); return; }
    setActivityTypes(prev => [...prev, { id: row.id, name: row.name, color: row.color ?? undefined, createdAt: row.created_at?.split('T')[0] ?? today }]);
  };

  const updateActivityType = async (activityType: ActivityType) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('activity_types')
      .update({ name: activityType.name, color: activityType.color ?? null })
      .eq('id', activityType.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateActivityType:', error.message); return; }
    setActivityTypes(prev => prev.map(a => a.id === activityType.id ? activityType : a));
  };

  const deleteActivityType = async (id: string) => {
    if (!tenantId) return;
    const item = activityTypes.find(a => a.id === id);
    if (!item) return;
    const { error } = await supabase.from('activity_types').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) { console.error('deleteActivityType:', error.message); return; }
    setActivityTypes(prev => prev.filter(a => a.id !== id));
    setTrash(prev => [{ id: `trash-${Date.now()}-${Math.random()}`, entityType: 'activityType', data: item, deletedAt: new Date().toISOString(), originalName: item.name }, ...prev]);
  };

  // ── demandTypes ──────────────────────────────────────────────────────────────

  const addDemandType = async (data: Omit<DemandType, 'id' | 'createdAt'>) => {
    if (!tenantId) return;
    const { data: row, error } = await supabase
      .from('demand_types')
      .insert({ tenant_id: tenantId, name: data.name, color: data.color ?? '#94a3b8' })
      .select('id, name, color, created_at')
      .single();
    if (error) { console.error('addDemandType:', error.message); return; }
    setDemandTypes(prev => [...prev, { id: row.id, name: row.name, color: row.color ?? '#94a3b8', createdAt: row.created_at?.split('T')[0] ?? today }]);
  };

  const updateDemandType = async (demandType: DemandType) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('demand_types')
      .update({ name: demandType.name, color: demandType.color })
      .eq('id', demandType.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateDemandType:', error.message); return; }
    setDemandTypes(prev => prev.map(d => d.id === demandType.id ? demandType : d));
  };

  const deleteDemandType = async (id: string) => {
    if (!tenantId) return;
    const { error } = await supabase.from('demand_types').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) { console.error('deleteDemandType:', error.message); return; }
    setDemandTypes(prev => prev.filter(d => d.id !== id));
  };

  // ── classes ─────────────────────────────────────────────────────────────────

  const addClass = async (newClass: ClassRoom) => {
    if (!tenantId) return;
    const classId = newClass.id || crypto.randomUUID();
    const { data: row, error } = await supabase
      .from('classes')
      .insert({
        id: classId,
        tenant_id: tenantId,
        name: newClass.name,
        institution_id: newClass.institutionId,
        graduation_year: newClass.graduationYear,
        graduation_month: newClass.graduationMonth,
        comercial_externo: newClass.comercialExterno || null,
        gestor_projeto: newClass.gestorProjeto || null,
        consultor_cs_id: newClass.consultorCSId || null,
      })
      .select('id, created_at')
      .single();
    if (error) { console.error('addClass:', error.message); return; }

    if (newClass.courseIds?.length) {
      await supabase.from('class_courses').insert(
        newClass.courseIds.map(courseId => ({ class_id: row.id, course_id: courseId }))
      );
    }

    setClasses(prev => [...prev, {
      ...newClass,
      id: row.id,
      createdAt: row.created_at?.split('T')[0] ?? today,
      classProducts: newClass.classProducts || [],
      timeline: newClass.timeline || [],
    }]);
  };

  const updateClass = async (updatedClass: ClassRoom) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from('classes')
      .update({
        name: updatedClass.name,
        institution_id: updatedClass.institutionId,
        graduation_year: updatedClass.graduationYear,
        graduation_month: updatedClass.graduationMonth,
        comercial_externo: updatedClass.comercialExterno || null,
        gestor_projeto: updatedClass.gestorProjeto || null,
        consultor_cs_id: updatedClass.consultorCSId || null,
      })
      .eq('id', updatedClass.id)
      .eq('tenant_id', tenantId);
    if (error) { console.error('updateClass:', error.message); return; }

    // Recoloca os course links: delete + insert
    await supabase.from('class_courses').delete().eq('class_id', updatedClass.id);
    if (updatedClass.courseIds?.length) {
      await supabase.from('class_courses').insert(
        updatedClass.courseIds.map(courseId => ({ class_id: updatedClass.id, course_id: courseId }))
      );
    }

    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
  };

  const deleteClass = (id: string) => moveToTrash('class', [id]);

  const addEvent = (event: Event) => {
    setEvents(prev => [event, ...prev]);
    if (tenantId) {
      supabase.from('events').insert({
        id:              event.id,
        tenant_id:       tenantId,
        name:            event.name,
        type:            event.type,
        start_date_time: event.startDateTime || new Date().toISOString(),
        end_date_time:   event.endDateTime   || event.startDateTime || new Date().toISOString(),
        status:          event.status,
        class_id:        event.classId        || null,
      }).then(({ error }) => { if (error) console.error('addEvent:', error.message); });
    }
  };

  const updateEvent = (event: Event) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    if (tenantId) {
      supabase.from('events').update({
        name:            event.name,
        type:            event.type,
        start_date_time: event.startDateTime || new Date().toISOString(),
        end_date_time:   event.endDateTime   || event.startDateTime || new Date().toISOString(),
        status:          event.status,
        class_id:        event.classId        || null,
      }).eq('id', event.id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateEvent:', error.message); });
    }
  };

  const deleteEvent = (id: string) => moveToTrash('event', [id]);

  const addEventActivity = (eventId: string, activity: EventActivity) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, activities: [activity, ...(e.activities || [])] } : e));
    if (tenantId) {
      supabase.from('event_activities').insert({
        id:          activity.id,
        tenant_id:   tenantId,
        event_id:    eventId,
        user_name:   activity.userName,
        description: activity.description ?? '',
        timestamp:   activity.timestamp || new Date().toISOString(),
      }).then(({ error }) => { if (error) console.error('addEventActivity:', error.message); });
    }
  };

  // Helper: insere stages + responsáveis no Supabase para um funil
  const persistFunnelRelations = async (funnel: Funnel, tid: string) => {
    if (funnel.stages?.length) {
      await supabase.from('funnel_stages').insert(
        funnel.stages.map(s => ({
          id:        s.id,
          tenant_id: tid,
          funnel_id: funnel.id,
          name:      s.name,
          order:     s.order,
          color:     s.color ?? null,
          type:      s.type ?? 'NORMAL',
        }))
      );
    }
    if (funnel.responsibleUserIds?.length) {
      await supabase.from('funnel_responsible_users').insert(
        funnel.responsibleUserIds.map(uid => ({ funnel_id: funnel.id, user_id: uid }))
      );
    }
  };

  const addFunnel = (funnel: Funnel) => {
    setFunnels(prev => [...prev, funnel]);
    if (tenantId) {
      supabase.from('funnels')
        .insert({ id: funnel.id, tenant_id: tenantId, name: funnel.name })
        .then(async ({ error }) => {
          if (error) { console.error('addFunnel:', error.message); return; }
          await persistFunnelRelations(funnel, tenantId);
        });
    }
  };

  const updateFunnel = (funnel: Funnel) => {
    setFunnels(prev => prev.map(f => f.id === funnel.id ? funnel : f));
    if (tenantId) {
      supabase.from('funnels')
        .update({ name: funnel.name })
        .eq('id', funnel.id).eq('tenant_id', tenantId)
        .then(async ({ error }) => {
          if (error) { console.error('updateFunnel:', error.message); return; }
          // Re-sincroniza estágios e responsáveis (delete + re-insert)
          await supabase.from('funnel_stages').delete().eq('funnel_id', funnel.id);
          await supabase.from('funnel_responsible_users').delete().eq('funnel_id', funnel.id);
          await persistFunnelRelations(funnel, tenantId);
        });
    }
  };

  const deleteFunnel = (id: string) => moveToTrash('funnel', [id]);
  const isStageOccupied = (stageId: string) => clients.some(c => c.stageId === stageId);

  // Helper: sincroniza total_value e purchases_count do cliente no Supabase
  const syncClientTotals = (clientId: string, newTotal: number, newCount: number) => {
    if (!tenantId) return;
    supabase.from('clients')
      .update({ total_value: newTotal, purchases_count: newCount })
      .eq('id', clientId).eq('tenant_id', tenantId)
      .then(({ error }) => { if (error) console.error('syncClientTotals:', error.message); });
  };

  const addSale = (sale: Sale) => {
    setSales(prev => [...prev, sale]);
    setClients(prev => prev.map(c => {
      if (c.id !== sale.clientId) return c;
      const newTotal = (c.totalValue || 0) + (sale.value * (sale.quantity || 1));
      const newCount = (c.purchasesCount || 0) + (sale.quantity || 1);
      syncClientTotals(c.id, newTotal, newCount);
      return { ...c, totalValue: newTotal, purchasesCount: newCount };
    }));
    if (tenantId) {
      supabase.from('sales').insert({
        id:             sale.id,
        tenant_id:      tenantId,
        client_id:      sale.clientId,
        product_id:     sale.productId,
        seller_id:      sale.sellerId,
        value:          sale.value,
        quantity:       sale.quantity  ?? 1,
        date:           sale.date      || today,
        class_id:       sale.classId,
        negotiation_id: sale.negotiationId || null,
      }).then(({ error }) => { if (error) console.error('addSale:', error.message); });
    }
  };

  const updateSale = (updatedSale: Sale) => {
    const oldSale = sales.find(s => s.id === updatedSale.id);
    if (!oldSale) return;
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    if (oldSale.value !== updatedSale.value || oldSale.quantity !== updatedSale.quantity) {
      setClients(prev => prev.map(c => {
        if (c.id !== updatedSale.clientId) return c;
        const diffValue = (updatedSale.value * updatedSale.quantity) - (oldSale.value * oldSale.quantity);
        const diffQty   = updatedSale.quantity - oldSale.quantity;
        const newTotal  = Math.max(0, (c.totalValue || 0) + diffValue);
        const newCount  = Math.max(0, (c.purchasesCount || 0) + diffQty);
        syncClientTotals(c.id, newTotal, newCount);
        return { ...c, totalValue: newTotal, purchasesCount: newCount };
      }));
    }
    if (tenantId) {
      supabase.from('sales').update({
        product_id:     updatedSale.productId,
        seller_id:      updatedSale.sellerId,
        value:          updatedSale.value,
        quantity:       updatedSale.quantity  ?? 1,
        date:           updatedSale.date      || today,
        class_id:       updatedSale.classId,
        negotiation_id: updatedSale.negotiationId || null,
      }).eq('id', updatedSale.id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateSale:', error.message); });
    }
  };

  const deleteSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    setSales(prev => prev.filter(s => s.id !== saleId));
    setClients(prev => prev.map(c => {
      if (c.id !== sale.clientId) return c;
      const newTotal = Math.max(0, (c.totalValue || 0) - (sale.value * sale.quantity));
      const newCount = Math.max(0, (c.purchasesCount || 0) - sale.quantity);
      syncClientTotals(c.id, newTotal, newCount);
      return { ...c, totalValue: newTotal, purchasesCount: newCount };
    }));
    if (sale.negotiationId) {
      setNegotiations(prev => prev.map(n => n.id === sale.negotiationId ? { ...n, status: 'ABERTO' as NegotiationStatus } : n));
      if (tenantId) {
        supabase.from('product_negotiations').update({ status: 'ABERTO' })
          .eq('id', sale.negotiationId).eq('tenant_id', tenantId)
          .then(({ error }) => { if (error) console.error('deleteSale reopen neg:', error.message); });
      }
    }
    if (tenantId) {
      supabase.from('sales').delete()
        .eq('id', saleId).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('deleteSale:', error.message); });
    }
  };

  const addNegotiation = (neg: ProductNegotiation) => {
    setNegotiations(prev => [neg, ...prev]);
    if (tenantId) {
      supabase.from('product_negotiations').insert({
        id:         neg.id,
        tenant_id:  tenantId,
        client_id:  neg.clientId,
        product_id: neg.productId,
        seller_id:  neg.sellerId,
        value:      neg.value    ?? 0,
        quantity:   neg.quantity ?? 1,
        status:     neg.status   ?? 'ABERTO',
        closed_at:  neg.closedAt || null,
      }).then(({ error }) => { if (error) console.error('addNegotiation:', error.message); });
    }
  };

  const deleteNegotiation = (negId: string) => {
    const neg = negotiations.find(n => n.id === negId);
    if (!neg) return;
    if (neg.status === 'GANHO') {
      const associatedSale = sales.find(s => s.negotiationId === neg.id);
      if (associatedSale) deleteSale(associatedSale.id);
    }
    setNegotiations(prev => prev.filter(n => n.id !== negId));
    if (tenantId) {
      supabase.from('product_negotiations').delete()
        .eq('id', negId).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('deleteNegotiation:', error.message); });
    }
  };

  const updateNegotiationStatus = (id: string, status: NegotiationStatus) => {
    const closedAt = status !== 'ABERTO' ? new Date().toISOString().split('T')[0] : undefined;
    setNegotiations(prev => prev.map(n => n.id === id ? { ...n, status, closedAt: closedAt || n.closedAt } : n));
    if (tenantId) {
      supabase.from('product_negotiations').update({
        status,
        closed_at: closedAt || null,
      }).eq('id', id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateNegotiationStatus:', error.message); });
    }
  };

  const addClassProduct = async (classId: string, cp: ClassProduct) => {
    const cpWithId = { ...cp, id: cp.id || `cp-${Date.now()}-${Math.random()}` };
    if (tenantId) {
      const { error } = await supabase.from('class_products').insert({
        id: cpWithId.id,
        tenant_id: tenantId,
        class_id: classId,
        product_id: cp.productId,
        custom_price: cp.customPrice,
        goal_quantity: cp.goalQuantity,
        goal_value: cp.goalValue,
        erp_quantity: cp.erpQuantity ?? null,
        erp_value: cp.erpValue ?? null,
        sale_limit: cp.saleLimit ?? 'MULTIPLO',
      });
      if (error) console.error('addClassProduct:', error.message);
    }
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, classProducts: [...(c.classProducts || []), cpWithId] } : c));
  };

  const updateClassProduct = async (classId: string, cp: ClassProduct) => {
    if (tenantId && cp.id) {
      const { error } = await supabase.from('class_products').update({
        custom_price: cp.customPrice,
        goal_quantity: cp.goalQuantity,
        goal_value: cp.goalValue,
        erp_quantity: cp.erpQuantity ?? null,
        erp_value: cp.erpValue ?? null,
        sale_limit: cp.saleLimit ?? 'MULTIPLO',
      }).eq('id', cp.id).eq('tenant_id', tenantId);
      if (error) console.error('updateClassProduct:', error.message);
    }
    setClasses(prev => prev.map(c => c.id === classId ? {
      ...c,
      classProducts: (c.classProducts || []).map(p => {
        if (cp.id && p.id) return p.id === cp.id ? cp : p;
        return p.productId === cp.productId ? cp : p;
      })
    } : c));
  };

  const removeClassProduct = async (classId: string, identifier: string) => {
    if (tenantId) {
      // identifier pode ser o id do class_product ou o productId
      const { error } = await supabase.from('class_products')
        .delete()
        .or(`id.eq.${identifier},product_id.eq.${identifier}`)
        .eq('class_id', classId)
        .eq('tenant_id', tenantId);
      if (error) console.error('removeClassProduct:', error.message);
    }
    setClasses(prev => prev.map(c => c.id === classId ? {
      ...c,
      classProducts: (c.classProducts || []).filter(p => {
        if (p.id) return p.id !== identifier;
        return p.productId !== identifier;
      })
    } : c));
  };

  const addCSAction = (action: CSAction) => {
    setCsActions(prev => [action, ...prev]);
    if (tenantId) {
      supabase.from('cs_actions').insert({
        id:                  action.id,
        tenant_id:           tenantId,
        class_id:            action.classId,
        type:                action.type,
        start_date:          action.startDate        || null,
        end_date:            action.endDate          || null,
        status:              action.status,
        total_reached:       action.totalReached     ?? 0,
        total_responses:     action.totalResponses   ?? 0,
        volume_sold:         action.volumeSold       ?? 0,
        revenue_result:      action.revenueResult    ?? 0,
        channel:             action.channel          || null,
        responsible_user_id: action.responsibleUserId || null,
      }).then(({ error }) => { if (error) console.error('addCSAction:', error.message); });
    }
  };

  const updateCSAction = (action: CSAction) => {
    setCsActions(prev => prev.map(a => a.id === action.id ? action : a));
    if (tenantId) {
      supabase.from('cs_actions').update({
        class_id:            action.classId,
        type:                action.type,
        start_date:          action.startDate        || null,
        end_date:            action.endDate          || null,
        status:              action.status,
        total_reached:       action.totalReached     ?? 0,
        total_responses:     action.totalResponses   ?? 0,
        volume_sold:         action.volumeSold       ?? 0,
        revenue_result:      action.revenueResult    ?? 0,
        channel:             action.channel          || null,
        responsible_user_id: action.responsibleUserId || null,
      }).eq('id', action.id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateCSAction:', error.message); });
    }
  };

  const addCSActionActivity = (actionId: string, activity: CSActionActivity) => {
    setCsActions(prev => prev.map(a => a.id === actionId ? { ...a, activities: [activity, ...a.activities] } : a));
    if (tenantId) {
      supabase.from('cs_action_activities').insert({
        id:          activity.id,
        tenant_id:   tenantId,
        cs_action_id: actionId,
        user_name:   activity.userName,
        description: activity.description ?? '',
        timestamp:   activity.timestamp || new Date().toISOString(),
      }).then(({ error }) => { if (error) console.error('addCSActionActivity:', error.message); });
    }
  };

  const deleteCSAction = (id: string) => moveToTrash('csAction', [id]);

  const addCSDailyService = (service: CSDailyService) => {
    setCsDailyServices(prev => [service, ...prev]);
    if (tenantId) {
      supabase.from('cs_daily_services').insert({
        id:                  service.id,
        tenant_id:           tenantId,
        client_id:           service.clientId          || null,
        client_phone:        service.clientPhone,
        client_name_manual:  service.clientNameManual  || null,
        date:                service.date,
        type:                service.type,
        summary:             service.summary,
        status:              service.status,
        responsible_user_id: service.responsibleUserId || null,
        class_id:            service.classId           || null,
        canal_contatado:     service.canalContatado     || null,
        demand_type_id:      service.demandTypeId       || null,
        resolucao:           service.resolucao          || null,
        repasse:             service.repasse            ?? null,
        repasse_setor:       service.repasseSetor       || null,
        obs:                 service.obs                || null,
        valor_venda:         service.valorVenda         ?? null,
        retorno:             service.retorno            || null,
        remarketing:         service.remarketing        ?? null,
        objecao:             service.objecao            || null,
      }).then(({ error }) => { if (error) console.error('addCSDailyService:', error.message); });
    }
    if (service.clientId) {
      addClientActivity(service.clientId, {
        id:          `act-cs-${Date.now()}`,
        type:        service.type === 'Ligação' ? 'call' : service.type === 'E-mail' ? 'email' : 'note',
        description: `ATENDIMENTO CS: ${service.summary}`,
        timestamp:   new Date().toLocaleString('pt-BR'),
      });
    }
  };

  const updateCSDailyService = (service: CSDailyService) => {
    setCsDailyServices(prev => prev.map(s => s.id === service.id ? service : s));
    if (tenantId) {
      supabase.from('cs_daily_services').update({
        client_id:           service.clientId          || null,
        client_phone:        service.clientPhone,
        client_name_manual:  service.clientNameManual  || null,
        date:                service.date,
        type:                service.type,
        summary:             service.summary,
        status:              service.status,
        responsible_user_id: service.responsibleUserId || null,
        class_id:            service.classId           || null,
        canal_contatado:     service.canalContatado     || null,
        demand_type_id:      service.demandTypeId       || null,
        resolucao:           service.resolucao          || null,
        repasse:             service.repasse            ?? null,
        repasse_setor:       service.repasseSetor       || null,
        obs:                 service.obs                || null,
        valor_venda:         service.valorVenda         ?? null,
        retorno:             service.retorno            || null,
        remarketing:         service.remarketing        ?? null,
        objecao:             service.objecao            || null,
      }).eq('id', service.id).eq('tenant_id', tenantId)
        .then(({ error }) => { if (error) console.error('updateCSDailyService:', error.message); });
    }
  };

  const deleteCSDailyService = (id: string) => moveToTrash('csDailyService', [id]);

  // ── Backup/Restore completo via Supabase ─────────────────────────────────────

  /** Busca todas as tabelas do tenant no Supabase e retorna um JSON pronto para download. */
  const exportAllData = async (): Promise<string> => {
    if (!tenantId) throw new Error('Usuário não autenticado.');

    const byTenant = (table: string) =>
      supabase.from(table).select('*').eq('tenant_id', tenantId).limit(10000).then(r => {
        if (r.error) throw new Error(`Erro ao ler ${table}: ${r.error.message}`);
        return r.data ?? [];
      });

    // Junction tables sem tenant_id — buscamos pelo FK do pai
    const byIds = (table: string, col: string, ids: string[]) => {
      if (!ids.length) return Promise.resolve([]);
      return supabase.from(table).select('*').in(col, ids).limit(10000).then(r => {
        if (r.error) throw new Error(`Erro ao ler ${table}: ${r.error.message}`);
        return r.data ?? [];
      });
    };

    const [
      institutions, courses, product_categories, users, activity_types,
      funnels, products, classes,
      clients, events, cs_actions, cs_daily_services,
      product_negotiations, sales, client_tasks,
      class_products, class_timeline_events, client_activities,
      event_activities, cs_action_activities,
    ] = await Promise.all([
      byTenant('institutions'), byTenant('courses'), byTenant('product_categories'),
      byTenant('users'), byTenant('activity_types'),
      byTenant('funnels'), byTenant('products'), byTenant('classes'),
      byTenant('clients'), byTenant('events'), byTenant('cs_actions'),
      byTenant('cs_daily_services'), byTenant('product_negotiations'),
      byTenant('sales'), byTenant('client_tasks'),
      byTenant('class_products'), byTenant('class_timeline_events'),
      byTenant('client_activities'), byTenant('event_activities'),
      byTenant('cs_action_activities'),
    ]);

    // Junction tables sem tenant_id
    const [funnel_stages, funnel_responsible_users, class_courses] = await Promise.all([
      byIds('funnel_stages',            'funnel_id', funnels.map((f: any) => f.id)),
      byIds('funnel_responsible_users', 'funnel_id', funnels.map((f: any) => f.id)),
      byIds('class_courses',            'class_id',  classes.map((c: any) => c.id)),
    ]);

    return JSON.stringify({
      version:    '2.0',
      exportedAt: new Date().toISOString(),
      tenantId,
      tables: {
        institutions, courses, product_categories, users, activity_types,
        funnels, funnel_stages, funnel_responsible_users,
        products, classes, class_courses, class_products, class_timeline_events,
        clients, client_activities,
        events, event_activities,
        cs_actions, cs_action_activities, cs_daily_services,
        product_negotiations, sales, client_tasks,
      },
    }, null, 2);
  };

  /** Recebe um JSON exportado por exportAllData, apaga os dados do tenant e reinsere tudo. */
  const importAllData = async (json: string): Promise<void> => {
    if (!tenantId) throw new Error('Usuário não autenticado.');

    const parsed = JSON.parse(json);
    if (parsed.version !== '2.0' || !parsed.tables) {
      throw new Error('Formato de backup inválido. Use um arquivo gerado por esta ferramenta.');
    }

    const t = parsed.tables;
    const tid = tenantId;

    // Helper: apaga todos os registros do tenant em uma tabela (com tenant_id)
    const wipe = (table: string) =>
      supabase.from(table).delete().eq('tenant_id', tid).then(r => {
        if (r.error) console.error(`wipe ${table}:`, r.error.message);
      });

    // Helper: insere em lotes (máx 200 por requisição)
    const insertChunked = async (table: string, rows: any[]) => {
      if (!rows.length) return;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from(table).insert(chunk);
        if (error) throw new Error(`Erro ao inserir em ${table}: ${error.message}`);
      }
    };

    // Helper: substitui tenant_id de cada row pelo tenant atual
    const withTid = (rows: any[]) =>
      rows.map((r: any) => ({ ...r, tenant_id: tid }));

    // ── 1. Apagar na ordem correta (filhos antes dos pais) ──────────────────
    // Etapa 1: tabelas que referenciam outras (sem cascata automática suficiente)
    await wipe('sales');
    await wipe('product_negotiations');
    await wipe('client_tasks');
    await wipe('cs_daily_services');
    await wipe('cs_action_activities');
    await wipe('cs_actions');
    await wipe('event_activities');
    await wipe('events');
    await wipe('client_activities');
    await wipe('clients');
    // class_products, class_timeline_events têm tenant_id, melhor apagar explicitamente
    await wipe('class_timeline_events');
    await wipe('class_products');
    // class_courses (junction sem tenant_id) — cascateia quando classes for deletada
    await wipe('classes');
    // funnel_stages tem tenant_id
    await wipe('funnel_stages');
    // funnels cascateia funnel_responsible_users
    await wipe('funnels');
    await wipe('activity_types');
    await wipe('users');
    await wipe('products');
    await wipe('product_categories');
    await wipe('courses');
    await wipe('institutions');

    // ── 2. Inserir na ordem correta (pais antes dos filhos) ─────────────────
    await insertChunked('institutions',            withTid(t.institutions            ?? []));
    await insertChunked('courses',                 withTid(t.courses                 ?? []));
    await insertChunked('product_categories',      withTid(t.product_categories      ?? []));
    await insertChunked('users',                   withTid(t.users                   ?? []));
    await insertChunked('activity_types',          withTid(t.activity_types          ?? []));
    await insertChunked('products',                withTid(t.products                ?? []));
    await insertChunked('funnels',                 withTid(t.funnels                 ?? []));
    await insertChunked('funnel_stages',           withTid(t.funnel_stages           ?? []));
    // funnel_responsible_users: sem tenant_id, inserir como está
    await insertChunked('funnel_responsible_users',        t.funnel_responsible_users ?? []);
    await insertChunked('classes',                 withTid(t.classes                 ?? []));
    // class_courses: sem tenant_id
    await insertChunked('class_courses',                   t.class_courses           ?? []);
    await insertChunked('class_products',          withTid(t.class_products          ?? []));
    await insertChunked('class_timeline_events',   withTid(t.class_timeline_events   ?? []));
    await insertChunked('clients',                 withTid(t.clients                 ?? []));
    await insertChunked('client_activities',       withTid(t.client_activities       ?? []));
    await insertChunked('events',                  withTid(t.events                  ?? []));
    await insertChunked('event_activities',        withTid(t.event_activities        ?? []));
    await insertChunked('cs_actions',              withTid(t.cs_actions              ?? []));
    await insertChunked('cs_action_activities',    withTid(t.cs_action_activities    ?? []));
    await insertChunked('cs_daily_services',       withTid(t.cs_daily_services       ?? []));
    await insertChunked('product_negotiations',    withTid(t.product_negotiations    ?? []));
    await insertChunked('sales',                   withTid(t.sales                   ?? []));
    await insertChunked('client_tasks',            withTid(t.client_tasks            ?? []));
  };

  const resetDatabase = () => {
    if (confirm("ATENÇÃO: Você perderá TODOS os dados atuais. Deseja continuar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // ── resetAllData: apaga TUDO do Supabase (ordem FK-safe) + localStorage ─────
  const resetAllData = async (): Promise<void> => {
    if (!tenantId) return;
    const tid = tenantId;
    const del = (table: string) =>
      supabase.from(table).delete().eq('tenant_id', tid)
        .then(({ error }) => { if (error) console.error(`resetAllData ${table}:`, error.message); });

    // Folhas primeiro, raízes por último
    await del('sales');
    await del('product_negotiations');
    await del('client_tasks');
    await del('cs_daily_services');
    await del('cs_action_activities');
    await del('cs_actions');
    await del('event_activities');
    await del('events');
    await del('client_activities');
    await del('clients');
    await del('class_timeline_events');
    await del('class_products');
    // class_courses não tem tenant_id — apaga via classes (cascade ou manualmente)
    const classIds = classes.map(c => c.id);
    if (classIds.length) {
      await supabase.from('class_courses').delete().in('class_id', classIds)
        .then(({ error }) => { if (error) console.error('resetAllData class_courses:', error.message); });
    }
    await del('classes');
    // funnel_stages / funnel_responsible_users
    const funnelIds = funnels.map(f => f.id);
    if (funnelIds.length) {
      await supabase.from('funnel_stages').delete().in('funnel_id', funnelIds)
        .then(({ error }) => { if (error) console.error('resetAllData funnel_stages:', error.message); });
      await supabase.from('funnel_responsible_users').delete().in('funnel_id', funnelIds)
        .then(({ error }) => { if (error) console.error('resetAllData funnel_responsible_users:', error.message); });
    }
    await del('funnels');
    await del('activity_types');
    await del('users');
    await del('products');
    await del('product_categories');
    await del('courses');
    await del('institutions');

    localStorage.clear();
  };

  // ── Backup automático ─────────────────────────────────────────────────────────

  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);

  const loadBackupSettings = async (): Promise<void> => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('backup_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (data) {
      setBackupSettings({
        id: data.id,
        tenantId: data.tenant_id,
        enabled: data.enabled,
        frequency: data.frequency,
        lastBackupAt: data.last_backup_at ?? null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    }
  };

  const saveBackupSettings = async (patch: { enabled?: boolean; frequency?: 'daily' | 'weekly' }): Promise<void> => {
    if (!tenantId) return;
    const payload: Record<string, any> = { tenant_id: tenantId, ...patch };
    const { data, error } = await supabase
      .from('backup_settings')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();
    if (error) throw new Error(`Erro ao salvar configurações de backup: ${error.message}`);
    setBackupSettings({
      id: data.id,
      tenantId: data.tenant_id,
      enabled: data.enabled,
      frequency: data.frequency,
      lastBackupAt: data.last_backup_at ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  };

  const listBackups = async (): Promise<BackupFile[]> => {
    if (!tenantId) return [];
    const { data, error } = await supabase.storage
      .from('backups')
      .list(tenantId, { sortBy: { column: 'created_at', order: 'desc' }, limit: 50 });
    if (error) throw new Error(`Erro ao listar backups: ${error.message}`);
    return (data ?? []).map((f: any) => ({
      name: f.name,
      path: `${tenantId}/${f.name}`,
      sizeKb: Math.round((f.metadata?.size ?? 0) / 1024),
      createdAt: f.created_at ?? '',
    }));
  };

  const triggerManualBackup = async (): Promise<{ filename: string; sizeKb: number }> => {
    if (!tenantId) throw new Error('Usuário não autenticado.');
    const { data, error } = await supabase.functions.invoke('auto-backup', {
      body: { tenantId },
    });
    if (error) throw new Error(`Erro ao acionar backup: ${error.message}`);
    if (data?.error) throw new Error(data.error);
    // Atualiza last_backup_at local
    setBackupSettings(prev => prev
      ? { ...prev, lastBackupAt: data.exportedAt ?? new Date().toISOString() }
      : prev
    );
    return { filename: data.filename, sizeKb: data.sizeKb };
  };

  const downloadBackupFile = async (path: string, filename: string): Promise<void> => {
    const { data, error } = await supabase.storage.from('backups').download(path);
    if (error) throw new Error(`Erro ao baixar backup: ${error.message}`);
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DataContext.Provider value={{
      currentUser, setCurrentUser, sidebarCollapsed, setSidebarCollapsed,
      users, setUsers, institutions, setInstitutions, courses, setCourses,
      productCategories, setProductCategories,
      products, setProducts, classes, setClasses, funnels, setFunnels,
      clients, setClients, events, setEvents, tasks, setTasks, activityTypes, setActivityTypes, demandTypes, setDemandTypes, sales, setSales,
      negotiations, setNegotiations, csActions, setCsActions, csDailyServices, setCsDailyServices, trash,
      googleSheetUrl, setGoogleSheetUrl, syncWithGoogleSheet,
      moveToTrash, restoreFromTrash, permanentDeleteFromTrash, purgeExpiredTrash,
      updateClientStage, addClientActivity, addClient, updateClient,
      addInstitution, updateInstitution, deleteInstitution,
      addCourse, updateCourse, deleteCourse,
      addUser, updateUser, deleteUser,
      addProductCategory, updateProductCategory, deleteProductCategory,
      addProduct, updateProduct, deleteProduct,
      addActivityType, updateActivityType, deleteActivityType,
      addDemandType, updateDemandType, deleteDemandType,
      addClass, updateClass, deleteClass, addEvent, updateEvent, addEventActivity, deleteEvent,
      addTask, updateTask, toggleTask, deleteTask,
      canDeleteEntity, updateFunnel, addFunnel, deleteFunnel, isStageOccupied,
      addSale, updateSale, deleteSale, addNegotiation, deleteNegotiation, updateNegotiationStatus,
      addClassProduct, updateClassProduct, removeClassProduct,
      addCSAction, updateCSAction, addCSActionActivity, deleteCSAction,
      addCSDailyService, updateCSDailyService, deleteCSDailyService,
      resetDatabase, exportDatabase, importDatabase,
      exportAllData, importAllData, resetAllData,
      backupSettings, loadBackupSettings, saveBackupSettings,
      listBackups, triggerManualBackup, downloadBackupFile,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData deve ser usado dentro de um DataProvider');
  return context;
};
