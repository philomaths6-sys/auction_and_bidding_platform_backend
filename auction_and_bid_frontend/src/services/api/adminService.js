import axiosClient from './axiosClient';

export const adminService = {
  getAllUsers: async () => {
    const { data } = await axiosClient.get('/admin/users');
    return data;
  },

  getReports: async (status = 'open') => {
    const { data } = await axiosClient.get(`/admin/reports?status=${status}`);
    return data;
  },

  updateReportStatus: async (reportId, status) => {
    const { data } = await axiosClient.patch(`/admin/reports/${reportId}?status=${status}`);
    return data;
  },

  getFraudFlags: async () => {
    const { data } = await axiosClient.get('/admin/fraud-flags');
    return data;
  },

  getLogs: async () => {
    const { data } = await axiosClient.get('/admin/logs');
    return data;
  },

  banUser: async (userId) => {
    const { data } = await axiosClient.delete(`/admin/users/${userId}`);
    return data;
  },

  promoteAdmin: async (userId) => {
    const { data } = await axiosClient.post('/admin/promote-admin', { user_id: userId });
    return data;
  }
};
