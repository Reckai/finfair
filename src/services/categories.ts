import { ApiCategory, Category } from '../types';
import { api } from './api';

export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    const response = await api.get<{ categories: ApiCategory[] }>('/categories');
    if (response.success && response.data) {
      return response.data.categories.map((category) => ({
        id: category.id,
        name: category.name,
        isSystem: category.isSystem,
        color: category.color,
        iconName: category.iconName,
      }));
    }
    return [];
  },
};
