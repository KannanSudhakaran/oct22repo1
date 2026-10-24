import { useState } from 'react';

function CategoryForm({ initialCategory, onSubmit, onCancel, submitting }) {
  const isEdit = Boolean(initialCategory);

  const [name, setName] = useState(initialCategory?.name ?? '');

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ name });
  }

  return (
    <form className="task-form auth-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <div className="task-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
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

export default CategoryForm;
