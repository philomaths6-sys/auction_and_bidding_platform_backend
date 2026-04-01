import axiosClient from './axiosClient';

export const userService = {
  getPublicProfile: async (userId) => {
    const { data } = await axiosClient.get(`/users/${userId}`);
    return data;
  },

  updateProfile: async (profileData) => {
    // profileData = { bio, avatar_url, phone_number, etc }
    const { data } = await axiosClient.put('/users/me/profile', profileData);
    return data;
  }
};
