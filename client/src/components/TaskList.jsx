const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done' };

function TaskList({ tasks, categories, onEdit, onDelete }) {
  if (tasks.length === 0) {
    return <p className="task-list__empty">No tasks yet. Create your first task to get started.</p>;
  }

  function categoryName(categoryId) {
    return categories.find((category) => category.id === categoryId)?.name ?? 'Unknown';
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id} className="task-card">
          <div className="task-card__main">
            <h3>{task.title}</h3>
            {task.description && <p className="task-card__description">{task.description}</p>}
            <div className="task-card__meta">
              <span className="task-card__category">{categoryName(task.categoryId)}</span>
              <span className={`badge badge--priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
              <span className={`badge badge--status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
              {task.dueDate && <span className="task-card__due">Due {task.dueDate}</span>}
            </div>
          </div>
          <div className="task-card__actions">
            <button type="button" onClick={() => onEdit(task)}>Edit</button>
            <button type="button" className="task-card__delete" onClick={() => onDelete(task.id)}>Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default TaskList;
