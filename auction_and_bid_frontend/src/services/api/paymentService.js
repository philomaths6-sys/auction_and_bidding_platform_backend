import axiosClient from './axiosClient';

export const paymentService = {
  createPayment: async (paymentData) => {
    // paymentData = { auction_id: int, payment_method: string }
    const { data } = await axiosClient.post('/payments/', paymentData);
    return data;
  },

  getPayments: async () => {
    const { data } = await axiosClient.get('/payments/');
    return data;
  },

  getPayment: async (paymentId) => {
    const { data } = await axiosClient.get(`/payments/${paymentId}`);
    return data;
  }
};
