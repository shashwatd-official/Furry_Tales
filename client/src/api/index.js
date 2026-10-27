import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send cookies with every request
});

// Auth
export const signupAdopter = (data) => api.post('/auth/signup/adopter', data);
export const signupCenter = (formData) =>
  api.post('/auth/signup/center', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

export default api;
