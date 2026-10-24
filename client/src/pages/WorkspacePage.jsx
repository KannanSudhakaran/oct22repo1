import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { listTasks, listCategories, createTask, updateTask, deleteTask } from '../api/tasks';

function WorkspacePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, categoriesRes] = await Promise.all([listTasks(), listCategories()]);
        setTasks(tasksRes.tasks);
        setCategories(categoriesRes.categories);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openCreateForm() {
    setEditingTask(null);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(task) {
    setEditingTask(task);
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    setError(null);
    try {
      if (editingTask) {
        const { task } = await updateTask(editingTask.id, payload);
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      } else {
        const { task } = await createTask(payload);
        setTasks((prev) => [task, ...prev]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(taskId) {
    if (!window.confirm('Delete this task?')) return;
    setError(null);
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="app-shell">
      <NavBar />
      <div className="workspace-page">
        <h1>Welcome, {user?.email}</h1>

        {error && <div className="auth-error">{error}</div>}

        <div className="task-toolbar">
          <h2>Your Tasks</h2>
          {!editingTask && (
            <button type="button" onClick={showForm ? closeForm : openCreateForm}>
              {showForm ? 'Cancel' : 'New Task'}
            </button>
          )}
        </div>

        {showForm && (
          <TaskForm
            categories={categories}
            initialTask={editingTask}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={submitting}
          />
        )}

        {loading ? (
          <p>Loading…</p>
        ) : (
          <TaskList tasks={tasks} categories={categories} onEdit={openEditForm} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}

export default WorkspacePage;
