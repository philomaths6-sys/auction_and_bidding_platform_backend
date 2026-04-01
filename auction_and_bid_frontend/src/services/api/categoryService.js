import axiosClient from './axiosClient';

export const categoryService = {
  getCategories: async () => {
    const { data } = await axiosClient.get('/categories/');
    return data;
  },

  createCategory: async (payload) => {
    // payload = { name: string, description: string }
    const { data } = await axiosClient.post('/categories/', payload);
    return data;
  }
};
