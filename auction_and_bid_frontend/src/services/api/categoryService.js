import axiosClient from './axiosClient';

export const categoryService = {
  getCategories: async () => {
    const { data } = await axiosClient.get('/categories/');
    return data;
  },

  getAllCategoriesForAdmin: async () => {
    const { data } = await axiosClient.get('/categories/admin/all');
    return data;
  },

  createCategory: async (payload) => {
    // payload = { name: string, description: string, parent_category_id?: number }
    const { data } = await axiosClient.post('/categories/', payload);
    return data;
  },

  deleteCategory: async (categoryId) => {
    // Permanently delete category from database
    const { data } = await axiosClient.delete(`/categories/${categoryId}`);
    return data;
  },

  deactivateCategory: async (categoryId) => {
    // Soft delete category (make inactive)
    const { data } = await axiosClient.post(`/categories/${categoryId}/deactivate`);
    return data;
  }
};
