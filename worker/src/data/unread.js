async function resolveReadableMessageId(db, channelId, messageId = null) {
	const filters = ["channel_id = ?", "deleted_at IS NULL"];
	const binds = [Number(channelId)];
	if (messageId !== null && messageId !== undefined) {
		filters.push("id <= ?");
		binds.push(Number(messageId));
	}
	const { results } = await db
		.prepare(`SELECT COALESCE(MAX(id), 0) AS message_id FROM messages WHERE ${filters.join(" AND ")}`)
		.bind(...binds)
		.all();
	return Number(results[0]?.message_id || 0);
}

export async function markRoomRead(db, { channelId, userId, messageId = null }) {
	const lastReadMessageId = await resolveReadableMessageId(db, channelId, messageId);
	await db
		.prepare(
			`INSERT INTO message_reads (channel_id, user_id, last_read_message_id, updated_at)
			 VALUES (?, ?, ?, CURRENT_TIMESTAMP)
			 ON CONFLICT(channel_id, user_id) DO UPDATE
			 SET last_read_message_id = MAX(message_reads.last_read_message_id, excluded.last_read_message_id),
			     updated_at = CURRENT_TIMESTAMP`,
		)
		.bind(Number(channelId), Number(userId), lastReadMessageId)
		.run();
	return lastReadMessageId;
}

export async function countUnreadMessages(db, { channelId, userId }) {
	const { results } = await db
		.prepare(
			`SELECT COUNT(*) AS unread_count FROM messages m
			 WHERE m.channel_id = ? AND m.deleted_at IS NULL AND m.sender_id != ?
			   AND m.id > COALESCE((SELECT mr.last_read_message_id FROM message_reads mr
			                            WHERE mr.channel_id = ? AND mr.user_id = ?), 0)`,
		)
		.bind(Number(channelId), Number(userId), Number(channelId), Number(userId))
		.all();
	return Number(results[0]?.unread_count || 0);
}

export async function listRoomMemberIds(db, channelId) {
	const { results } = await db
		.prepare(
			`SELECT cm.user_id
			 FROM channel_members cm
			 JOIN users u ON u.id = cm.user_id
			 WHERE cm.channel_id = ?
			   AND u.deleted_at IS NULL
			   AND u.is_disabled = 0`,
		)
		.bind(Number(channelId))
		.all();
	return results
		.map((row) => Number(row.user_id))
		.filter((userId) => Number.isFinite(userId));
}


export async function listMessageReadStatus(db, { channelId, messageId }) {
	const { results } = await db
		.prepare(
			`SELECT
			   u.id,
			   u.username,
			   u.display_name,
			   u.avatar_key,
			   COALESCE(mr.last_read_message_id, 0) AS last_read_message_id,
			   mr.updated_at AS read_at,
			   m.sender_id AS message_sender_id
			 FROM channel_members cm
			 JOIN users u ON u.id = cm.user_id
			 JOIN messages m ON m.id = ? AND m.channel_id = cm.channel_id AND m.deleted_at IS NULL
			 LEFT JOIN message_reads mr ON mr.channel_id = cm.channel_id AND mr.user_id = cm.user_id
			 WHERE cm.channel_id = ?
			   AND u.deleted_at IS NULL
			   AND u.is_disabled = 0
			 ORDER BY u.display_name COLLATE NOCASE ASC`,
		)
		.bind(Number(messageId), Number(channelId))
		.all();
	return results.map((row) => {
		const read = Number(row.id) === Number(row.message_sender_id) || Number(row.last_read_message_id || 0) >= Number(messageId);
		return {
			id: Number(row.id),
			username: row.username,
			displayName: row.display_name,
			avatarUrl: row.avatar_key ? `/files/${encodeURIComponent(row.avatar_key)}` : '',
			read,
			readAt: read ? row.read_at || null : null,
		};
	});
}
