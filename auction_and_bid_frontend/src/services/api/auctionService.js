import axiosClient from './axiosClient';

export const auctionService = {
  getHomeFeed: async (featuredLimit = 3, latestLimit = 8) => {
    const { data } = await axiosClient.get(`/auctions/home-feed?featured_limit=${featuredLimit}&latest_limit=${latestLimit}`);
    return data;
  },

  getAuctions: async (skip = 0, limit = 100, filters = {}) => {
    const params = new URLSearchParams({ skip, limit });
    if (filters.status) params.append('status', filters.status);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.category_ids) {
      // If multiple category IDs are provided, send them as comma-separated
      params.append('category_ids', filters.category_ids.join(','));
    }
    if (filters.min_price) params.append('min_price', filters.min_price);
    if (filters.max_price) params.append('max_price', filters.max_price);
    const { data } = await axiosClient.get(`/auctions/?${params.toString()}`);
    return data;
  },
  
  getAuction: async (id) => {
    const { data } = await axiosClient.get(`/auctions/${id}`);
    return data;
  },
  
  searchAuctions: async (query, skip = 0, limit = 20) => {
    const { data } = await axiosClient.get(`/auctions/search?q=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`);
    return data;
  },
  
  getMyAuctions: async () => {
    const { data } = await axiosClient.get('/auctions/my');
    return data;
  },

  createAuction: async (auctionData) => {
    const { data } = await axiosClient.post('/auctions/', auctionData);
    return data;
  },

  updateAuction: async (id, updateData) => {
    const { data } = await axiosClient.patch(`/auctions/${id}`, updateData);
    return data;
  },

  deleteAuction: async (id) => {
    await axiosClient.delete(`/auctions/${id}`);
  },

  changeStatus: async (id, statusData) => {
    const { data } = await axiosClient.patch(`/auctions/${id}/status`, statusData);
    return data;
  },

  getWinner: async (id) => {
    const { data } = await axiosClient.get(`/auctions/${id}/winner`);
    return data;
  },

  reportAuction: async (id, reason) => {
    const { data } = await axiosClient.post(`/auctions/${id}/report?reason=${encodeURIComponent(reason)}`);
    return data;
  },

  addImage: async (id, payload) => {
    const { data } = await axiosClient.post(`/auctions/${id}/images`, payload);
    return data;
  },

  deleteImage: async (auctionId, imageId) => {
    await axiosClient.delete(`/auctions/${auctionId}/images/${imageId}`);
  },

  addAttribute: async (auctionId, payload) => {
    // payload = { attribute_name: string, attribute_value: string }
    const { data } = await axiosClient.post(`/auctions/${auctionId}/attributes`, payload);
    return data;
  },

  deleteAttribute: async (auctionId, attributeId) => {
    await axiosClient.delete(`/auctions/${auctionId}/attributes/${attributeId}`);
  }
};

