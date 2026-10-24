import { apiFetch } from './client';

function listTasks() { return apiFetch('/tasks', { method: 'GET' }); }
function getTask(id) { return apiFetch(`/tasks/${id}`, { method: 'GET' }); }
function createTask(payload) { return apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) }); }
function updateTask(id, payload) { return apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); }
function deleteTask(id) { return apiFetch(`/tasks/${id}`, { method: 'DELETE' }); }
function listCategories() { return apiFetch('/categories', { method: 'GET' }); }

export { listTasks, getTask, createTask, updateTask, deleteTask, listCategories };
