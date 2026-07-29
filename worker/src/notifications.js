import { getSiteSettings } from './data/site-settings.js';

function compactText(value, max = 500) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function messageSummary(message, includeContent) {
  if (!includeContent) {
    return '';
  }
  if (message.content) {
    return `\n内容：${compactText(message.content)}`;
  }
  if (message.attachment?.name) {
    return `\n附件：${message.attachment.name}`;
  }
  return '';
}

export async function sendDingTalkMessageNotification(env, { room, message }) {
  const settings = await getSiteSettings(env.DB);
  const webhook = String(settings.dingtalkWebhookUrl || '').trim();
  if (!webhook) {
    return;
  }

  const senderName = message.sender?.displayName || message.sender?.username || '有人';
  const roomName = room?.name ? `（${room.name}）` : '';
  const content = `来自${senderName}的新消息${roomName}${messageSummary(message, settings.dingtalkPushContent)}`;

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'text',
      text: { content }
    })
  });
  if (!response.ok) {
    throw new Error(`DingTalk webhook failed: ${response.status}`);
  }
}
