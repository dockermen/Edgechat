<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api.js';
import store from '../store.js';
import MessageAttachment from '../components/chat/MessageAttachment.vue';
import UiAvatar from '../components/ui/Avatar.vue';
import UiBadge from '../components/ui/Badge.vue';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const error = ref('');
const room = ref(null);
const messages = ref([]);

const kind = computed(() => route.params.kind);
const roomId = computed(() => route.params.roomId);
const title = computed(() => route.query.title || room.value?.name || '会话详情');
const session = computed(() => store.session);

function formatTime(value) {
  return new Date(value).toLocaleString();
}

function isOwnMessage(message) {
  return Number(message.sender.id) === Number(session.value?.userId);
}

function previousMessage(index) {
  return index > 0 ? messages.value[index - 1] : null;
}

function nextMessage(index) {
  return index < messages.value.length - 1 ? messages.value[index + 1] : null;
}

function isSameSender(a, b) {
  return a && b && Number(a.sender.id) === Number(b.sender.id);
}

function bubbleRowClass(message, index) {
  return {
    'chat-bubble-row--own': isOwnMessage(message),
    'chat-bubble-row--stacked': isSameSender(previousMessage(index), message)
  };
}

function bubbleClass(message, index) {
  return {
    'chat-bubble--own': isOwnMessage(message),
    'chat-bubble--continued': isSameSender(previousMessage(index), message),
    'chat-bubble--tail-hidden': isSameSender(nextMessage(index), message)
  };
}

async function loadRoom() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.adminRoomMessages(kind.value, roomId.value);
    room.value = payload.room;
    messages.value = payload.messages;
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadRoom);
</script>

<template>
  <div class="admin-room-page">
    <div class="admin-room-shell">
      <header class="admin-room-shell__header">
        <div class="admin-room-shell__heading">
          <span class="admin-room-kicker">{{ kind === 'dm' ? '管理员私信查看页' : '管理员频道查看页' }}</span>
          <h1>{{ title }}</h1>
        </div>
        <div class="inline-actions admin-room-shell__actions">
          <UiBadge variant="secondary">{{ messages.length }} 条消息</UiBadge>
          <UiButton variant="secondary" @click="router.push('/admin')">返回后台</UiButton>
        </div>
      </header>

      <section class="chat-stream admin-room-shell__stream">
        <div class="chat-stream__inner">
          <UiSurface v-if="loading" tone="muted" class="chat-empty">正在加载会话...</UiSurface>
          <UiSurface v-else-if="error" tone="muted" class="chat-empty">{{ error }}</UiSurface>
          <UiSurface v-else-if="!messages.length" tone="muted" class="chat-empty">
            这个会话目前没有消息。
          </UiSurface>

          <article
            v-for="(message, index) in messages"
            :key="message.id"
            class="chat-bubble-row"
            :class="bubbleRowClass(message, index)"
          >
            <UiAvatar
              v-if="!isOwnMessage(message)"
              :src="message.sender.avatarUrl"
              :fallback="message.sender.displayName"
              size="sm"
              class="chat-bubble-row__avatar"
            />
            <div class="chat-bubble" :class="bubbleClass(message, index)">
              <div class="chat-bubble__meta">
                <strong>{{ isOwnMessage(message) ? '我' : message.sender.displayName }}</strong>
                <span>{{ formatTime(message.createdAt) }}</span>
              </div>
              <p v-if="message.content">{{ message.content }}</p>
              <MessageAttachment v-if="message.attachment" :attachment="message.attachment" />
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-room-page {
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.admin-room-shell {
  max-width: 1120px;
  width: 100%;
  min-height: calc(100vh - 48px);
  display: grid;
  grid-template-rows: auto 1fr;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 28px;
  overflow: hidden;
  box-shadow:
    0 20px 60px rgba(91, 141, 191, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  opacity: 0;
  animation: windowRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
}

.admin-room-shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  background: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(91, 141, 191, 0.1);
  opacity: 0;
  animation: fadeSlideDown 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
}

.admin-room-shell__heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-room-kicker {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(91, 141, 191, 0.08);
  border: 1px solid rgba(91, 141, 191, 0.12);
  color: #5b8dbf;
  font-size: 11px;
  font-weight: 600;
  width: fit-content;
}

.admin-room-shell__heading h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #2c4a6e;
}

.admin-room-shell__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.admin-room-shell__stream {
  padding: 24px 28px;
  overflow-y: auto;
}

.admin-room-shell__stream::-webkit-scrollbar { width: 6px; }
.admin-room-shell__stream::-webkit-scrollbar-track { background: transparent; }
.admin-room-shell__stream::-webkit-scrollbar-thumb {
  background: rgba(91, 141, 191, 0.2);
  border-radius: 3px;
}

:deep(.chat-stream__inner) {
  max-width: 940px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

:deep(.chat-empty) {
  padding: 24px;
  text-align: center;
  color: #6b8aab;
  font-size: 14px;
  background: rgba(91, 141, 191, 0.04) !important;
  border: 1px solid rgba(91, 141, 191, 0.1) !important;
  border-radius: 16px !important;
}

:deep(.chat-bubble-row) {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  opacity: 0;
  animation: messageRise 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

:deep(.chat-bubble-row:nth-child(n)) {
  animation-delay: calc(0.3s + 0.05s * var(--i, 0));
}

:deep(.chat-bubble-row--own) {
  flex-direction: row-reverse;
}

:deep(.chat-bubble-row--stacked) {
  margin-top: -8px;
}

:deep(.chat-bubble-row__avatar) {
  flex-shrink: 0;
}

:deep(.chat-bubble) {
  max-width: 70%;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(91, 141, 191, 0.1);
  box-shadow: 0 2px 8px rgba(91, 141, 191, 0.04);
}

:deep(.chat-bubble--own) {
  background: linear-gradient(135deg, rgba(91, 141, 191, 0.12), rgba(91, 141, 191, 0.06));
  border-color: rgba(91, 141, 191, 0.15);
}

:deep(.chat-bubble__meta) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

:deep(.chat-bubble__meta strong) {
  font-size: 13px;
  font-weight: 600;
  color: #2c4a6e;
}

:deep(.chat-bubble__meta span) {
  font-size: 11px;
  color: #6b8aab;
}

:deep(.chat-bubble p) {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #2c4a6e;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.inline-actions) {
  display: flex;
  gap: 8px;
}

@keyframes windowRise {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeSlideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes messageRise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .admin-room-page {
    padding: 16px;
  }

  .admin-room-shell {
    min-height: calc(100vh - 32px);
    border-radius: 24px;
  }

  .admin-room-shell__header {
    flex-direction: column;
    padding: 20px;
  }

  .admin-room-shell__stream {
    padding: 16px 20px;
  }

  :deep(.chat-bubble) {
    max-width: calc(100% - 48px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-room-shell,
  .admin-room-shell__header,
  :deep(.chat-bubble-row) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
