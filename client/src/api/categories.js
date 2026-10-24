import { apiFetch } from './client';

function listCategories() { return apiFetch('/categories', { method: 'GET' }); }
function createCategory(payload) { return apiFetch('/categories', { method: 'POST', body: JSON.stringify(payload) }); }
function updateCategory(id, payload) { return apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); }
function deleteCategory(id) { return apiFetch(`/categories/${id}`, { method: 'DELETE' }); }

export { listCategories, createCategory, updateCategory, deleteCategory };
