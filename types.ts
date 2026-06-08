
export interface BackupSettings {
  id: string;
  tenantId: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  lastBackupAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackupFile {
  name: string;
  path: string;
  sizeKb: number;
  createdAt: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  CONSULTOR = 'CONSULTOR',
  VISUALIZADOR = 'VISUALIZADOR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  password: string;
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
}

export interface Campus {
  name: string;
  city: string;
}

export interface Institution {
  id: string;
  name: string;
  campi: Campus[];
  state: string;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string; // Referência à categoria dinâmica
  createdAt: string;
}

export type SaleLimit = 'UNICO' | 'MULTIPLO';

export interface ClassProduct {
  id?: string;
  productId: string;
  customPrice: number;
  goalQuantity: number;
  goalValue: number;
  erpQuantity?: number;
  erpValue?: number;
  saleLimit: SaleLimit;
  planName?: string;
  lotType?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  institutionId: string;
  courseIds: string[];
  graduationYear: number;
  graduationMonth: number;
  timeline: TimelineEvent[];
  classProducts: ClassProduct[]; 
  createdAt: string;
  comercialExterno?: string;
  gestorProjeto?: string;
  consultorCSId?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  completed: boolean;
}

export interface ProjectClass {
  id: string;
  projectId: string; // FK → ClassRoom.id
  name: string;
  createdAt: string;
}

export interface ActivityType {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface EventActivity {
  id: string;
  userName: string;
  description: string;
  timestamp: string;
}

export interface Event {
  id: string;
  name: string;
  type: string; 
  startDateTime: string;
  endDateTime: string;
  status: 'Previsão' | 'Confirmado' | 'Realizado';
  classId?: string;
  activities: EventActivity[];
}

export interface CSActionActivity {
  id: string;
  userName: string;
  description: string;
  timestamp: string;
}

export interface DemandType {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ChannelType {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface CSAction {
  id: string;
  classId: string;
  type: string; // Tipo de Demanda (nome livre ou id referenciando DemandType)
  startDate: string;
  endDate: string;
  status: string;
  totalReached: number;
  totalResponses: number;
  volumeSold: number;
  revenueResult: number;
  channel: string;
  cost?: number;
  activities: CSActionActivity[];
  createdAt: string;
  responsibleUserId?: string;
}

export interface CSDailyService {
  id: string;
  clientId: string;          // pode ser vazio se não houver coincidência de telefone
  clientPhone: string;       // campo obrigatório para vínculo
  clientNameManual?: string; // nome caso não haja vínculo
  date: string;
  type: string;              // Canal de Atendimento: WhatsApp, Ligação, E-mail, Presencial
  summary: string;
  status: string;
  responsibleUserId: string;
  createdAt: string;
  // Campos expandidos (Sessão 9)
  classId?: string;
  canalContatado?: string;
  demandTypeId?: string;
  resolucao?: string;
  repasse?: boolean;
  repasseSetor?: string;
  obs?: string;
  valorVenda?: number;
  retorno?: string;
  remarketing?: boolean;
  objecao?: string;
}

export interface Funnel {
  id: string;
  name: string;
  stages: FunnelStage[];
  responsibleUserIds: string[];
}

export type FunnelStageType = 'NORMAL' | 'WON' | 'LOST';

export interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  type?: FunnelStageType;
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  completed: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  cpf: string;
  email: string;
  phone: string;
  institutionId: string;
  campus: string;
  courseId: string;
  classId: string;
  shift: string;
  funnelId: string;
  stageId: string;
  tags: string[];
  totalValue: number;
  purchasesCount: number;
  activities: Activity[];
  createdAt: string;
  sellerId: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'move' | 'sale';
  description: string;
  timestamp: string;
  attachments?: string[];
  userId?: string;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  description: string;
  userId?: string;
  timestamp: string;
}

export interface Sale {
  id: string;
  clientId: string;
  productId: string; 
  sellerId: string;
  value: number;
  quantity: number;
  date: string;
  classId: string;
  negotiationId?: string;
}

export type NegotiationStatus = 'ABERTO' | 'GANHO' | 'PERDIDO';

export interface ProductNegotiation {
  id: string;
  clientId: string;
  productId: string;
  value: number;
  quantity: number;
  status: NegotiationStatus;
  createdAt: string;
  closedAt?: string;
  sellerId: string;
}

export interface TrashItem {
  id: string;
  entityType: 'institution' | 'course' | 'product' | 'productCategory' | 'class' | 'user' | 'funnel' | 'event' | 'client' | 'csAction' | 'activityType' | 'csDailyService';
  data: any;
  deletedAt: string;
  originalName: string;
}
