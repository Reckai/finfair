import { Category } from '../types';
import { colors } from './colors';

/**
 * Fallback categories used when backend categories are not loaded yet.
 */
export const fallbackCategories: Category[] = [
  {
    id: 1,
    name: 'Продукты',
    iconName: 'cart',
    color: '#4CAF50',
    isSystem: true,
    budgetType: 'NEED',
  },
  {
    id: 2,
    name: 'Транспорт',
    iconName: 'car',
    color: '#2196F3',
    isSystem: true,
    budgetType: 'NEED',
  },
  {
    id: 3,
    name: 'Развлечения',
    iconName: 'party-popper',
    color: '#E91E63',
    isSystem: true,
    budgetType: 'WANT',
  },
  {
    id: 4,
    name: 'Шоппинг',
    iconName: 'shopping',
    color: '#9C27B0',
    isSystem: true,
    budgetType: 'WANT',
  },
  {
    id: 5,
    name: 'Здоровье',
    iconName: 'medical-bag',
    color: '#F44336',
    isSystem: true,
    budgetType: 'NEED',
  },
  {
    id: 6,
    name: 'Жилье',
    iconName: 'home',
    color: '#9C27B0',
    isSystem: true,
    budgetType: 'NEED',
  },
  {
    id: 7,
    name: 'Другое',
    iconName: 'dots-horizontal',
    color: '#607D8B',
    isSystem: true,
    budgetType: 'WANT',
  },
];

export const getCategoryById = (id: number, categories: Category[]): Category | undefined => {
  return categories.find((c) => c.id === id);
};
