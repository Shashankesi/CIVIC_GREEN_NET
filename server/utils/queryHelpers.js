function buildPagination({ page = 1, limit = 20 }) {
  page = parseInt(page, 10) || 1;
  limit = Math.min(parseInt(limit, 10) || 20, 100);
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

function buildSort(sort) {
  // sort expected like: "created_at:desc" or "priority:asc"
  if (!sort) return '';
  const [field, dir] = sort.split(':');
  const d = dir && dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  // whitelist simple fields to avoid SQL injection - callers should pass safe fields
  return `ORDER BY ${field} ${d}`;
}

function buildFilters(filters = {}) {
  // filters object -> array of conditions and values
  const conditions = [];
  const values = [];
  let idx = 1;
  Object.keys(filters).forEach((k) => {
    const v = filters[k];
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      const placeholders = v.map(() => `$${idx++}`).join(',');
      conditions.push(`${k} IN (${placeholders})`);
      values.push(...v);
    } else {
      conditions.push(`${k}=$${idx++}`);
      values.push(v);
    }
  });
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

module.exports = { buildPagination, buildSort, buildFilters };
