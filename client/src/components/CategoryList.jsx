function CategoryList({ categories, onEdit, onDelete }) {
  if (categories.length === 0) {
    return <p className="task-list__empty">No categories yet. Create your first category to get started.</p>;
  }

  return (
    <ul className="task-list">
      {categories.map((category) => (
        <li key={category.id} className="task-card">
          <div className="task-card__main">
            <h3>{category.name}</h3>
          </div>
          <div className="task-card__actions">
            <button type="button" onClick={() => onEdit(category)}>Edit</button>
            <button type="button" className="task-card__delete" onClick={() => onDelete(category.id)}>Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default CategoryList;
