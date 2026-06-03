
import { User, UserRole, Institution, Course, Product, ClassRoom, Funnel, Client, Sale, Event, ActivityType } from './types';

const today = new Date().toISOString().split('T')[0];

export const MOCK_USERS: User[] = [
  { id: 'u-1', name: 'Administrador TOP', email: 'admin@top.com', role: UserRole.ADMIN, phone: '(11) 99999-0000', password: 'admin', status: 'ATIVO', createdAt: today },
];

export const MOCK_INSTITUTIONS: Institution[] = [];
export const MOCK_COURSES: Course[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_CLASSES: ClassRoom[] = [];
export const MOCK_ACTIVITY_TYPES: ActivityType[] = [
  { id: 'at-1', name: 'CFF', createdAt: today },
  { id: 'at-2', name: 'Contratação', createdAt: today },
  { id: 'at-3', name: 'AÇÃO COMERCIAL', createdAt: today },
  { id: 'at-4', name: 'REVISÃO DE PROJETO', createdAt: today },
];

export const MOCK_EVENTS: Event[] = [];
export const MOCK_CLIENTS: Client[] = [];
export const MOCK_SALES: Sale[] = [];

export const MOCK_FUNNELS: Funnel[] = [
  {
    id: 'f-vendas',
    name: 'Funil Comercial Padrão',
    responsibleUserIds: ['u-1'],
    stages: [
      { id: 's1', name: 'Lead Recebido', order: 0, color: '#94a3b8', type: 'NORMAL' },
      { id: 's2', name: 'Em Qualificação', order: 1, color: '#60a5fa', type: 'NORMAL' },
      { id: 's3', name: 'Apresentação Agendada', order: 2, color: '#a855f7', type: 'NORMAL' },
      { id: 's4', name: 'Proposta em Análise', order: 3, color: '#f59e0b', type: 'NORMAL' },
      { id: 's5', name: 'Fechamento/Contrato', order: 4, color: '#10b981', type: 'WON' },
      { id: 's-lost', name: 'Perdido/Desistência', order: 5, color: '#f43f5e', type: 'LOST' },
    ]
  }
];
