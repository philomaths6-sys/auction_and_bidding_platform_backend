import axiosClient from './axiosClient';

export const notificationService = {
  getNotifications: async () => {
    const { data } = await axiosClient.get('/notifications/');
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await axiosClient.get('/notifications/unread-count');
    return data.unread;
  },

  markAsRead: async (notifId) => {
    const { data } = await axiosClient.put(`/notifications/${notifId}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await axiosClient.put('/notifications/read-all');
    return data;
  }
};
