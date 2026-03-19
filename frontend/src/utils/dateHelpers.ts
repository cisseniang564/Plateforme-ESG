import { format, parseISO, subDays, subMonths, subYears, isAfter, isBefore } from 'date-fns';

export const formatDate = (date: string | Date, formatStr = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
};

export const formatRelativeDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

export const getPeriodRange = (period: 'day' | 'week' | 'month' | 'year'): { start: Date; end: Date } => {
  const end = new Date();
  let start: Date;
  
  switch (period) {
    case 'day':
      start = subDays(end, 1);
      break;
    case 'week':
      start = subDays(end, 7);
      break;
    case 'month':
      start = subMonths(end, 1);
      break;
    case 'year':
      start = subYears(end, 1);
      break;
  }
  
  return { start, end };
};

export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return isAfter(date, start) && isBefore(date, end);
};
