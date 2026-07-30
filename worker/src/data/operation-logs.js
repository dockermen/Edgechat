function normalizeText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function requestIp(request) {
  if (!request?.headers) return '';
  return normalizeText(
    request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      request.headers.get('X-Real-IP') ||
      '',
    120
  );
}

function requestUserAgent(request) {
  if (!request?.headers) return '';
  return normalizeText(request.headers.get('User-Agent') || '', 500);
}

function serializeDetail(detail) {
  if (detail === undefined || detail === null) return '';
  if (typeof detail === 'string') return normalizeText(detail, 1000);
  try {
    return normalizeText(JSON.stringify(detail), 1000);
  } catch {
    return normalizeText(String(detail), 1000);
  }
}

function normalizeActor(actor) {
  return {
    userId: actor?.userId || actor?.id ? Number(actor.userId || actor.id) : null,
    username: normalizeText(actor?.username || ''),
    displayName: normalizeText(actor?.displayName || actor?.display_name || actor?.username || '')
  };
}

export async function touchUserOnline(db, userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return;
  await db.prepare(
    `UPDATE users
     SET last_seen_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND deleted_at IS NULL`
  )
    .bind(id)
    .run();
}

export async function recordOperation(db, actor, options = {}) {
  const normalized = normalizeActor(actor);
  if (!options.action) return;

  await db.prepare(
    `INSERT INTO operation_logs (
       user_id,
       username,
       display_name,
       action,
       target_type,
       target_id,
       detail,
       ip,
       user_agent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      normalized.userId,
      normalized.username,
      normalized.displayName,
      normalizeText(options.action, 80),
      normalizeText(options.targetType, 80),
      normalizeText(options.targetId, 120),
      serializeDetail(options.detail),
      requestIp(options.request),
      requestUserAgent(options.request)
    )
    .run();
}

export async function listOperationLogs(db, options = {}) {
  const filters = [];
  const binds = [];
  const userId = Number(options.userId || '');
  if (Number.isFinite(userId) && userId > 0) {
    filters.push('ol.user_id = ?');
    binds.push(userId);
  }
  const action = normalizeText(options.action, 80);
  if (action) {
    filters.push('ol.action = ?');
    binds.push(action);
  }
  const keyword = normalizeText(options.keyword, 120);
  if (keyword) {
    const like = `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;
    filters.push(`(ol.username LIKE ? ESCAPE '\\' OR ol.display_name LIKE ? ESCAPE '\\' OR ol.action LIKE ? ESCAPE '\\' OR ol.detail LIKE ? ESCAPE '\\' OR ol.target_type LIKE ? ESCAPE '\\' OR ol.target_id LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like, like, like);
  }
  const before = normalizeText(options.before, 40);
  if (before) {
    filters.push('ol.created_at < ?');
    binds.push(before);
  }
  const limit = Math.max(1, Math.min(Number(options.limit) || 80, 200));
  const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { results } = await db.prepare(
    `SELECT
       ol.id,
       ol.user_id,
       COALESCE(u.username, ol.username) AS username,
       COALESCE(u.display_name, ol.display_name) AS display_name,
       ol.action,
       ol.target_type,
       ol.target_id,
       ol.detail,
       ol.ip,
       ol.user_agent,
       ol.created_at
     FROM operation_logs ol
     LEFT JOIN users u ON u.id = ol.user_id
     ${whereSql}
     ORDER BY ol.id DESC
     LIMIT ?`
  )
    .bind(...binds, limit)
    .all();

  return results.map((row) => ({
    id: Number(row.id),
    userId: row.user_id === null || row.user_id === undefined ? null : Number(row.user_id),
    username: row.username || '',
    displayName: row.display_name || row.username || '系统',
    action: row.action,
    targetType: row.target_type || '',
    targetId: row.target_id || '',
    detail: row.detail || '',
    ip: row.ip || '',
    userAgent: row.user_agent || '',
    createdAt: row.created_at
  }));
}
