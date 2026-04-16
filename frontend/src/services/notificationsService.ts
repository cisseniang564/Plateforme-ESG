import api from './api';

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  body: string;
  time: string;
  read: boolean;
  link: string;
  created_at: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  unread_count: number;
  total: number;
}

export const notificationsService = {
  async list(): Promise<NotificationsResponse> {
    const r = await api.get<NotificationsResponse>('/notifications');
    return r.data;
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },

  async markOneRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },
};
