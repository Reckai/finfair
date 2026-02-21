import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Format amount as currency
 */
export const formatCurrency = (amount: number, currency = '₴'): string => {
  return `${amount.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${currency}`;
};

/**
 * Format date as readable string
 */
export const formatDate = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'd MMMM yyyy', { locale: ru });
};

/**
 * Format date as short string
 */
export const formatDateShort = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'd MMM', { locale: ru });
};

/**
 * Format date as relative time
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: ru });
};

/**
 * Format time
 */
export const formatTime = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'HH:mm', { locale: ru });
};
