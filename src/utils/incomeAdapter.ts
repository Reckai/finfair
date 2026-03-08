import { ApiIncome, CreateIncomePayload } from '../types/api';
import { Income, IncomeCategory } from '../types';

function apiIncomeCategoryToCategory(
  apiCat: ApiIncome['category'],
): IncomeCategory | undefined {
  if (!apiCat) return undefined;
  return {
    id: apiCat.id,
    name: apiCat.name,
    iconName: apiCat.iconName,
    sortOrder: apiCat.sortOrder,
    color: apiCat.color,
    isSystem: apiCat.isSystem,
  };
}

export function apiToIncome(raw: ApiIncome): Income {
  return {
    id: raw.id,
    amount: parseFloat(raw.amount),
    incomeCategoryId: raw.incomeCategoryId,
    description: raw.description ?? undefined,
    source: raw.source,
    userId: raw.userId,
    createdAt: raw.createdAt,
    category: apiIncomeCategoryToCategory(raw.category),
  };
}

export function incomeToCreatePayload(input: {
  amount: number;
  incomeCategoryId: number;
  description?: string;
}): CreateIncomePayload {
  const payload: CreateIncomePayload = {
    amount: input.amount,
    incomeCategoryId: input.incomeCategoryId,
  };
  if (input.description) payload.description = input.description;
  return payload;
}
