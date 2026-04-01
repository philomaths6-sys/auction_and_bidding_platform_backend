import axiosClient from './axiosClient';

export const ratingService = {
  getSellerRatings: async (sellerId) => {
    const { data } = await axiosClient.get(`/ratings/seller/${sellerId}`);
    return data;
  },

  postRating: async (ratingData) => {
    // ratingData = { auction_id, seller_id, rating, review }
    const { data } = await axiosClient.post('/ratings/', ratingData);
    return data;
  }
};
