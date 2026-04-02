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

  deleteReport: async (reportId) => {
    await axiosClient.delete(`/admin/reports/${reportId}`);
  },

  cancelAuctionFromReport: async (reportId) => {
    const { data } = await axiosClient.post(`/admin/reports/${reportId}/cancel-auction`);
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
  },

  getFeaturedAuctions: async () => {
    const { data } = await axiosClient.get('/admin/featured-auctions');
    return data;
  },

  setFeaturedAuctions: async (auctionIds) => {
    const { data } = await axiosClient.put('/admin/featured-auctions', { auction_ids: auctionIds });
    return data;
  }
};
