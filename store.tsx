
// Ponto de restauração: restaur_00018

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User, UserRole, Institution, Course, Product, ProductCategory, ClassRoom, Funnel, Client, Sale, Event, ProductNegotiation, NegotiationStatus, ClassProduct, CSAction, CSActionActivity, TrashItem, EventActivity, ActivityType, Task, CSDailyService, Activity } from './types';
import { MOCK_USERS, MOCK_INSTITUTIONS, MOCK_COURSES, MOCK_PRODUCTS, MOCK_FUNNELS, MOCK_CLASSES, MOCK_CLIENTS, MOCK_SALES, MOCK_EVENTS, MOCK_ACTIVITY_TYPES } from './constants';
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

  const [users, setUsers] = useState<User[]>(() => load('users', MOCK_USERS));
  const [clients, setClients] = useState<Client[]>(() => load('clients', MOCK_CLIENTS));

  // ── Entidades migradas para Supabase (sem localStorage) ──────────────────
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);

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
        class_products(id, product_id, custom_price, goal_quantity, goal_value, erp_quantity, erp_value),
        class_timeline_events(id, title, date, description, completed)
      `)
      .eq('tenant_id', tenantId)
      .order('graduation_year')
      .then(({ data, error }) => {
        if (error) { console.error('classes fetch:', error.message); return; }
        setClasses((data ?? []).map(mapClassRow));
      });
  }, [tenantId]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(() => load('productCategories', [
    { id: 'cat-1', name: 'Adesão', createdAt: today },
    { id: 'cat-2', name: 'Convite Extra', createdAt: today },
    { id: 'cat-3', name: 'Mesa Extra', createdAt: today }
  ]));
  const [products, setProducts] = useState<Product[]>(() => load('products', MOCK_PRODUCTS));
  const [funnels, setFunnels] = useState<Funnel[]>(() => load('funnels', MOCK_FUNNELS));
  const [events, setEvents] = useState<Event[]>(() => load('events', MOCK_EVENTS));
  const [tasks, setTasks] = useState<Task[]>(() => load('tasks', []));
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(() => load('activityTypes', MOCK_ACTIVITY_TYPES));
  const [sales, setSales] = useState<Sale[]>(() => load('sales', MOCK_SALES));
  const [negotiations, setNegotiations] = useState<ProductNegotiation[]>(() => load('negotiations', []));
  const [csActions, setCsActions] = useState<CSAction[]>(() => load('csActions', []));
  const [csDailyServices, setCsDailyServices] = useState<CSDailyService[]>(() => load('csDailyServices', []));
  const [trash, setTrash] = useState<TrashItem[]>(() => load('trash', []));
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => load('googleSheetUrl', ''));

  useEffect(() => {
    if (!isInitialized.current) {
        isInitialized.current = true;
        if (googleSheetUrl) syncWithGoogleSheet();
        return;
    }

    // institutions, courses e classes são agora persistidas no Supabase — não gravar em localStorage
    const dataMap = {
      users, clients, productCategories,
      products, funnels, events, tasks, activityTypes, sales, negotiations, csActions, csDailyServices, trash, googleSheetUrl
    };

    Object.entries(dataMap).forEach(([key, value]) => {
      localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
    });
  }, [users, clients, productCategories, products, funnels, events, tasks, activityTypes, sales, negotiations, csActions, csDailyServices, trash, googleSheetUrl]);

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

  const addTask = (task: Task) => setTasks(prev => [...prev, task]);
  const updateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const toggleTask = (taskId: string) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  const deleteTask = (taskId: string) => setTasks(prev => prev.filter(t => t.id !== taskId));

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
        case 'product': handleRemoval(products, setProducts, 'name'); break;
        case 'productCategory': handleRemoval(productCategories, setProductCategories, 'name'); break;
        case 'user': handleRemoval(users, setUsers, 'name'); break;
        case 'funnel': handleRemoval(funnels, setFunnels, 'name'); break;
        case 'event': handleRemoval(events, setEvents, 'name'); break;
        case 'activityType': handleRemoval(activityTypes, setActivityTypes, 'name'); break;
        case 'client': handleRemoval(clients, setClients, 'name'); break;
        case 'csAction': handleRemoval(csActions, setCsActions, 'type'); break;
        case 'csDailyService': handleRemoval(csDailyServices, setCsDailyServices, 'summary'); break;
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
        case 'product': setProducts(p => [...p, restoredData]); break;
        case 'productCategory': setProductCategories(p => [...p, restoredData]); break;
        case 'user': setUsers(p => [...p, restoredData]); break;
        case 'funnel': setFunnels(p => [...p, restoredData]); break;
        case 'event': setEvents(p => [...p, restoredData]); break;
        case 'activityType': setActivityTypes(p => [...p, restoredData]); break;
        case 'client': setClients(p => [...p, restoredData]); break;
        case 'csAction': setCsActions(p => [...p, restoredData]); break;
        case 'csDailyService': setCsDailyServices(p => [...p, restoredData]); break;
    }

    setTrash(p => p.filter(t => t.id !== trashId));
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
  };

  const addClientActivity = (clientId: string, activity: any) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, activities: [activity, ...c.activities] } : c));
  };

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

    // Se encontrou órfãos, vincula-os ao novo cliente e adiciona ao histórico dele
    if (orphans.length > 0) {
        newClient.activities = [...orphanActivities, ...newClient.activities];
        setCsDailyServices(prev => prev.map(s => s.clientPhone === client.phone ? { ...s, clientId: newClient.id } : s));
    }

    setClients(prev => [newClient, ...prev]);
  };

  const updateClient = (client: Client) => setClients(prev => prev.map(c => c.id === client.id ? client : c));
  
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

  // ── classes ─────────────────────────────────────────────────────────────────

  const addClass = async (newClass: ClassRoom) => {
    if (!tenantId) return;
    const classId = newClass.id || `t-${Date.now()}`;
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

  const addEvent = (event: Event) => setEvents(prev => [event, ...prev]);
  const updateEvent = (event: Event) => setEvents(prev => prev.map(e => e.id === event.id ? event : e));
  const deleteEvent = (id: string) => moveToTrash('event', [id]);
  const addEventActivity = (eventId: string, activity: EventActivity) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, activities: [activity, ...(e.activities || [])] } : e));
  };

  const updateFunnel = (funnel: Funnel) => setFunnels(prev => prev.map(f => f.id === funnel.id ? funnel : f));
  const addFunnel = (funnel: Funnel) => setFunnels(prev => [...prev, funnel]);
  const deleteFunnel = (id: string) => moveToTrash('funnel', [id]);
  const isStageOccupied = (stageId: string) => clients.some(c => c.stageId === stageId);

  const addSale = (sale: Sale) => {
    setSales(prev => [...prev, sale]);
    setClients(prev => prev.map(c => c.id === sale.clientId ? { 
      ...c, 
      totalValue: (c.totalValue || 0) + (sale.value * (sale.quantity || 1)), 
      purchasesCount: (c.purchasesCount || 0) + (sale.quantity || 1) 
    } : c));
  };

  const updateSale = (updatedSale: Sale) => {
    const oldSale = sales.find(s => s.id === updatedSale.id);
    if (!oldSale) return;
    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    if (oldSale.value !== updatedSale.value || oldSale.quantity !== updatedSale.quantity) {
        setClients(prev => prev.map(c => {
            if (c.id === updatedSale.clientId) {
                const diffValue = (updatedSale.value * updatedSale.quantity) - (oldSale.value * oldSale.quantity);
                const diffQty = updatedSale.quantity - oldSale.quantity;
                return {
                    ...c,
                    totalValue: Math.max(0, (c.totalValue || 0) + diffValue),
                    purchasesCount: Math.max(0, (c.purchasesCount || 0) + diffQty)
                };
            }
            return c;
        }));
    }
  };

  const deleteSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    setSales(prev => prev.filter(s => s.id !== saleId));
    setClients(prev => prev.map(c => {
        if (c.id === sale.clientId) {
            return {
                ...c,
                totalValue: Math.max(0, (c.totalValue || 0) - (sale.value * sale.quantity)),
                purchasesCount: Math.max(0, (c.purchasesCount || 0) - sale.quantity)
            };
        }
        return c;
    }));
    if (sale.negotiationId) {
        setNegotiations(prev => prev.map(n => n.id === sale.negotiationId ? { ...n, status: 'ABERTO' as NegotiationStatus } : n));
    }
  };

  const addNegotiation = (neg: ProductNegotiation) => setNegotiations(prev => [neg, ...prev]);
  const deleteNegotiation = (negId: string) => {
      const neg = negotiations.find(n => n.id === negId);
      if (!neg) return;
      if (neg.status === 'GANHO') {
          const associatedSale = sales.find(s => s.negotiationId === neg.id);
          if (associatedSale) deleteSale(associatedSale.id);
      }
      setNegotiations(prev => prev.filter(n => n.id !== negId));
  };

  const updateNegotiationStatus = (id: string, status: NegotiationStatus) => {
    const closedAt = status !== 'ABERTO' ? new Date().toISOString().split('T')[0] : undefined;
    setNegotiations(prev => prev.map(n => n.id === id ? { ...n, status, closedAt: closedAt || n.closedAt } : n));
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

  const addCSAction = (action: CSAction) => setCsActions(prev => [action, ...prev]);
  const updateCSAction = (action: CSAction) => setCsActions(prev => prev.map(a => a.id === action.id ? action : a));
  const addCSActionActivity = (actionId: string, activity: CSActionActivity) => {
    setCsActions(prev => prev.map(a => a.id === actionId ? { ...a, activities: [activity, ...a.activities] } : a));
  };
  const deleteCSAction = (id: string) => moveToTrash('csAction', [id]);

  const addCSDailyService = (service: CSDailyService) => {
      setCsDailyServices(prev => [service, ...prev]);
      // Se houver cliente vinculado, adiciona ao histórico dele
      if (service.clientId) {
          addClientActivity(service.clientId, {
            id: `act-cs-${Date.now()}`,
            type: service.type === 'Ligação' ? 'call' : service.type === 'E-mail' ? 'email' : 'note',
            description: `ATENDIMENTO CS: ${service.summary}`,
            timestamp: new Date().toLocaleString('pt-BR'),
          });
      }
  };

  const updateCSDailyService = (service: CSDailyService) => setCsDailyServices(prev => prev.map(s => s.id === service.id ? service : s));
  const deleteCSDailyService = (id: string) => moveToTrash('csDailyService', [id]);

  const resetDatabase = () => {
    if (confirm("ATENÇÃO: Você perderá TODOS os dados atuais. Deseja continuar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <DataContext.Provider value={{
      currentUser, setCurrentUser, sidebarCollapsed, setSidebarCollapsed,
      users, setUsers, institutions, setInstitutions, courses, setCourses,
      productCategories, setProductCategories,
      products, setProducts, classes, setClasses, funnels, setFunnels,
      clients, setClients, events, setEvents, tasks, setTasks, activityTypes, setActivityTypes, sales, setSales,
      negotiations, setNegotiations, csActions, setCsActions, csDailyServices, setCsDailyServices, trash,
      googleSheetUrl, setGoogleSheetUrl, syncWithGoogleSheet,
      moveToTrash, restoreFromTrash,
      updateClientStage, addClientActivity, addClient, updateClient,
      addInstitution, updateInstitution, deleteInstitution,
      addCourse, updateCourse, deleteCourse,
      addClass, updateClass, deleteClass, addEvent, updateEvent, addEventActivity, deleteEvent,
      addTask, updateTask, toggleTask, deleteTask,
      canDeleteEntity, updateFunnel, addFunnel, deleteFunnel, isStageOccupied,
      addSale, updateSale, deleteSale, addNegotiation, deleteNegotiation, updateNegotiationStatus,
      addClassProduct, updateClassProduct, removeClassProduct,
      addCSAction, updateCSAction, addCSActionActivity, deleteCSAction,
      addCSDailyService, updateCSDailyService, deleteCSDailyService,
      resetDatabase, exportDatabase, importDatabase
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
