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

// Center Admin
export const getCenterProfile = () => api.get('/center');
export const updateCenterProfile = (data) => api.patch('/center', data);
export const uploadCenterPhoto = (formData) =>
  api.post('/center/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Adopter browsing (Phase 4)
export const getBrowseAnimals = (params, signal) => api.get('/animals', { params, signal });
export const getBrowseAnimal = (id) => api.get(`/animals/${id}`);

// Center Admin (Phase 3)
export const getCenterAnimals = (status) =>
  api.get(status ? `/center/animals?status=${status}` : '/center/animals');

export const updateMyLocation = (data) => api.patch('/me/location', data);

export const createAnimal = (formData) =>
  api.post('/center/animals', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateAnimal = (id, data) => api.patch(`/center/animals/${id}`, data);
export const removeAnimal = (id) => api.delete(`/center/animals/${id}`);
export const updateAnimalStatus = (id, status) =>
  api.patch(`/center/animals/${id}/status`, { status });
export const replaceAnimalPhoto = (id, formData) =>
  api.post(`/center/animals/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export default api;

