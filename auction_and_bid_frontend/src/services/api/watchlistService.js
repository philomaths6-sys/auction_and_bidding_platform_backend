import axiosClient from './axiosClient';

export const watchlistService = {
  getWatchlist: async () => {
    const { data } = await axiosClient.get('/watchlist/');
    return data;
  },

  addToWatchlist: async (auctionId) => {
    const { data } = await axiosClient.post(`/watchlist/${auctionId}`);
    return data;
  },

  removeFromWatchlist: async (auctionId) => {
    const { data } = await axiosClient.delete(`/watchlist/${auctionId}`);
    return data;
  }
};
