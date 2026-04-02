/**
 * Normalize axios / FastAPI error payloads to a single string for UI (toasts, inline errors).
 * FastAPI validation errors use detail: [{ loc, msg, type }, ...] which must not be passed raw to React children.
 */
export function formatApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (err == null) return fallback;

  const detail = err.response?.data?.detail;

  if (detail == null || detail === '') {
    if (err.response == null && typeof err.message === 'string' && err.message) {
      return err.message;
    }
    return fallback;
  }

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item == null) return null;
        if (typeof item === 'string') return item;
        if (typeof item.msg === 'string') return item.msg;
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
    return fallback;
  }

  if (typeof detail === 'object' && typeof detail.msg === 'string') {
    return detail.msg;
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return fallback;
  }
}
