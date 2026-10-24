import { useState } from 'react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

function TaskForm({ categories, initialTask, onSubmit, onCancel, submitting }) {
  const isEdit = Boolean(initialTask);

  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [categoryId, setCategoryId] = useState(initialTask?.categoryId ?? categories[0]?.id ?? '');
  const [priority, setPriority] = useState(initialTask?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? '');
  const [status, setStatus] = useState(initialTask?.status ?? 'todo');

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      title,
      description,
      categoryId: Number(categoryId),
      priority,
      dueDate: dueDate || null,
      status,
    });
  }

  return (
    <form className="task-form auth-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Description
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Category
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Priority
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Due Date
        <input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <div className="task-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
        {isEdit && (
          <button type="button" className="task-form__cancel" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default TaskForm;
