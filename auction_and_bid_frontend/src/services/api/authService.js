import axiosClient from './axiosClient';

export const authService = {
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI OAuth2 inherently strictly targets 'username' form-field, but our backend uses it for email lookup
    formData.append('password', password);
    const { data } = await axiosClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return data;
  },
  
  register: async (userData) => {
    const { data } = await axiosClient.post('/auth/register', userData);
    return data;
  },

  getCurrentUser: async () => {
    const { data } = await axiosClient.get('/users/me');
    return data;
  }
};
