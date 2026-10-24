function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateCredentials(email, password) {
  if (!isNonEmpty(email) || !isNonEmpty(password)) {
    return 'Email and password are required.';
  }
  return null;
}

const TASK_PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const CATEGORY_NAME_MAX_LENGTH = 100;

function isValidPriority(value) {
  return TASK_PRIORITIES.includes(value);
}

function isValidStatus(value) {
  return TASK_STATUSES.includes(value);
}

function isValidDueDate(value) {
  if (value === null || value === undefined || value === '') return true; // optional
  return !Number.isNaN(new Date(value).getTime());
}

function validateTaskPayload({ title, description, categoryId, priority, dueDate, status }) {
  if (!isNonEmpty(title)) return 'Title is required.';
  if (title.trim().length > TITLE_MAX_LENGTH) return `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  if (description != null && String(description).length > DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  if (categoryId === undefined || categoryId === null || !Number.isInteger(Number(categoryId))) {
    return 'Category is required.';
  }
  if (!isNonEmpty(status) || !isValidStatus(status)) {
    return 'Status must be one of: todo, in_progress, blocked, done.';
  }
  if (priority && !isValidPriority(priority)) {
    return 'Priority must be one of: low, medium, high.';
  }
  if (!isValidDueDate(dueDate)) {
    return 'Due date must be a valid date.';
  }
  return null;
}

function validateCategoryPayload({ name }) {
  if (!isNonEmpty(name)) return 'Name is required.';
  if (name.trim().length > CATEGORY_NAME_MAX_LENGTH) {
    return `Name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

module.exports = {
  normalizeEmail, isNonEmpty, validateCredentials,
  TASK_PRIORITIES, TASK_STATUSES, isValidPriority, isValidStatus, isValidDueDate, validateTaskPayload,
  CATEGORY_NAME_MAX_LENGTH, validateCategoryPayload,
};
