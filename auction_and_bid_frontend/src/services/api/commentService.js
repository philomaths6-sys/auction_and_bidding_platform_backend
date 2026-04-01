import axiosClient from './axiosClient';

export const commentService = {
  getComments: async (auctionId) => {
    const { data } = await axiosClient.get(`/auctions/${auctionId}/comments`);
    return data;
  },

  postComment: async (auctionId, commentData) => {
    // commentData = { comment_text: str, parent_comment_id: int | null }
    const { data } = await axiosClient.post(`/auctions/${auctionId}/comments`, commentData);
    return data;
  },

  deleteComment: async (auctionId, commentId) => {
    const { data } = await axiosClient.delete(`/auctions/${auctionId}/comments/${commentId}`);
    return data;
  }
};
