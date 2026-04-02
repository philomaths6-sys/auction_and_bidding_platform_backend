import axiosClient from './axiosClient';

export const bidService = {
  placeBid: async (auctionId, bidAmount) => {
    const { data } = await axiosClient.post(`/auctions/${auctionId}/bid`, { bid_amount: bidAmount });
    return data;
  },

  getBidsForAuction: async (auctionId) => {
    const { data } = await axiosClient.get(`/auctions/${auctionId}/bids`);
    return data;
  },
  
  getBidHistory: async (auctionId) => {
    const { data } = await axiosClient.get(`/auctions/${auctionId}/bid-history`);
    return data;
  },

  getMyBids: async () => {
    const { data } = await axiosClient.get('/auctions/my-bids');
    return data;
  },

  getMyWins: async () => {
    const { data } = await axiosClient.get('/auctions/my-wins');
    return data;
  }
};
