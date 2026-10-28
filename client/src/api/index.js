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

// Owner Panel
export const getOwnerCenters = (status = 'pending') =>
  api.get(`/owner/centers?status=${status}`);
export const approveCenter = (id) => api.patch(`/owner/centers/${id}/approve`);
export const rejectCenter = (id, reason) =>
  api.patch(`/owner/centers/${id}/reject`, { reason });
export const suspendCenter = (id) => api.patch(`/owner/centers/${id}/suspend`);
export const reinstateCenter = (id) => api.patch(`/owner/centers/${id}/reinstate`);
export const getCenterDocument = (id) => api.get(`/owner/centers/${id}/document`);

export default api;
