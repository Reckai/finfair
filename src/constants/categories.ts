import { Category } from '../types';
import { colors } from './colors';

/**
 * Icon mapping from backend iconName (MaterialCommunityIcons)
 * to frontend Ionicons name.
 */
export const iconMap: Record<string, string> = {
  food: 'restaurant',
  cart: 'cart',
  car: 'car',
  home: 'home',
  'medical-bag': 'medical',
  'gamepad-variant': 'game-controller',
  shopping: 'cart',
  'dots-horizontal': 'ellipsis-horizontal',
  receipt: 'receipt',
};

/**
 * Resolve an Ionicons-compatible icon name from a backend iconName.
 */
export function resolveIconName(backendIconName: string): string {
  return iconMap[backendIconName] || backendIconName;
}

/**
 * Fallback categories used when backend categories are not loaded yet.
 */
export const fallbackCategories: Category[] = [
  { id: 1, name: 'Еда', iconName: 'food', color: colors.categoryFood, isSystem: true },
  { id: 2, name: 'Транспорт', iconName: 'car', color: colors.categoryTransport, isSystem: true },
  { id: 3, name: 'Развлечения', iconName: 'gamepad-variant', color: colors.categoryEntertainment, isSystem: true },
  { id: 4, name: 'Покупки', iconName: 'cart', color: colors.categoryShopping, isSystem: true },
  { id: 5, name: 'Здоровье', iconName: 'medical-bag', color: colors.categoryHealth, isSystem: true },
  { id: 6, name: 'Счета', iconName: 'receipt', color: colors.categoryBills, isSystem: true },
  { id: 7, name: 'Другое', iconName: 'dots-horizontal', color: colors.categoryOther, isSystem: true },
];

export const getCategoryById = (id: number, categories: Category[]): Category | undefined => {
  return categories.find((c) => c.id === id);
};
