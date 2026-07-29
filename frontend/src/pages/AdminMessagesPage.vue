<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const users = ref([]);
const channels = ref([]);
const dms = ref([]);
const searchResults = ref([]);

const searchForm = reactive({
  keyword: '',
  kind: '',
  userId: '',
  channelId: ''
});

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.adminOverview();
    users.value = payload.users;
    channels.value = payload.channels;
    dms.value = payload.dms;
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

async function searchMessages() {
  const payload = await api.searchMessages(searchForm);
  searchResults.value = payload.messages;
}

async function removeChannel(channel) {
  if (!window.confirm(`确认删除群组 ${channel.name} 吗？`)) {
    return;
  }
  await api.deleteChannel(channel.id);
  await loadAll();
}

function openRoom(kind, roomId, title) {
  router.push({
    name: 'admin-room',
    params: { kind, roomId },
    query: { title }
  });
}

onMounted(loadAll);
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h1>消息查看</h1>
        <p>搜索全站消息，并进入任意群组或私信的完整会话页查看上下文。</p>
      </div>
      <UiButton variant="secondary" @click="loadAll">刷新数据</UiButton>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="loading" class="muted">消息索引与会话数据加载中...</p>

      <UiSurface class="panel">
        <h3 class="panel-title">消息搜索</h3>
        <div class="search-grid admin-search-grid">
          <label class="field">
            <span>关键词</span>
            <input v-model.trim="searchForm.keyword" />
          </label>
          <label class="field">
            <span>会话类型</span>
            <select v-model="searchForm.kind">
              <option value="">全部</option>
              <option value="public">公开群组</option>
              <option value="private">私有群组</option>
              <option value="dm">私信</option>
            </select>
          </label>
          <label class="field">
            <span>发送用户</span>
            <select v-model="searchForm.userId">
              <option value="">全部</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>群组</span>
            <select v-model="searchForm.channelId">
              <option value="">全部</option>
              <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
          </label>
        </div>
        <div class="inline-actions">
          <UiButton @click="searchMessages">开始搜索</UiButton>
        </div>

        <div v-if="searchResults.length" class="admin-table-wrap admin-table-wrap--bounded">
          <table class="list-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>发送者</th>
                <th>会话</th>
                <th>内容</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in searchResults" :key="item.id">
                <td>{{ new Date(item.createdAt).toLocaleString() }}</td>
                <td>{{ item.sender.displayName }}</td>
                <td>{{ item.room.kind === 'dm' ? '私信' : '群组' }} · {{ item.room.name }}</td>
                <td>{{ item.content || item.attachmentName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSurface>

      <section class="admin-grid admin-grid--two">
        <UiSurface class="panel">
          <h3 class="panel-title">群组列表</h3>
          <div class="admin-table-wrap">
            <table class="list-table">
              <thead>
                <tr>
                  <th>群组</th>
                  <th>统计</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="channel in channels" :key="channel.id">
                  <td>
                    <strong>{{ channel.name }}</strong>
                    <div class="muted">
                      {{ channel.kind === 'private' ? '私有群组' : '公开群组' }} · 群主 {{ channel.ownerDisplayName }}
                    </div>
                    <div class="muted">{{ channel.description || '无描述' }}</div>
                  </td>
                  <td>{{ channel.memberCount }} 人 / {{ channel.messageCount }} 条</td>
                  <td>
                    <div class="inline-actions">
                      <UiButton
                        variant="secondary"
                        size="sm"
                        @click="openRoom(channel.kind, channel.id, channel.name)"
                      >
                        打开对话
                      </UiButton>
                      <UiButton variant="destructive" size="sm" @click="removeChannel(channel)">
                        删除
                      </UiButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiSurface>

        <UiSurface class="panel">
          <h3 class="panel-title">私信列表</h3>
          <div class="admin-table-wrap">
            <table class="list-table">
              <thead>
                <tr>
                  <th>参与者</th>
                  <th>DM Key</th>
                  <th>消息数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dm in dms" :key="dm.id">
                  <td><strong>{{ dm.participants }}</strong></td>
                  <td class="muted">{{ dm.name }}</td>
                  <td>{{ dm.messageCount }}</td>
                  <td>
                    <UiButton variant="secondary" size="sm" @click="openRoom('dm', dm.id, dm.participants)">
                      打开对话
                    </UiButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiSurface>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.admin-section__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
}

.admin-section__heading h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2c4a6e;
  letter-spacing: -0.02em;
}

.admin-section__heading p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b8aab;
}

.admin-section__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.admin-section__body::-webkit-scrollbar { width: 5px; }
.admin-section__body::-webkit-scrollbar-track { background: transparent; }
.admin-section__body::-webkit-scrollbar-thumb {
  background: rgba(91, 141, 191, 0.2);
  border-radius: 3px;
}

.admin-grid--two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  flex-shrink: 0;
}

.admin-search-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

:deep(.panel) {
  padding: 18px !important;
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  box-shadow:
    0 8px 32px rgba(91, 141, 191, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  gap: 12px !important;
  opacity: 0;
  animation: cardRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

:deep(.panel:nth-child(1)) {
  animation-delay: 0.1s;
}

:deep(.panel:nth-child(2)) {
  animation-delay: 0.15s;
}

:deep(.panel:nth-child(3)) {
  animation-delay: 0.2s;
}

:deep(.panel-title) {
  font-size: 14px !important;
  font-weight: 600 !important;
  margin: 0 !important;
  color: #2c4a6e;
}

:deep(.field) {
  gap: 4px !important;
  margin-bottom: 0 !important;
}

:deep(.field span) {
  font-size: 11px !important;
  color: #6b8aab;
  font-weight: 500;
}

:deep(.field input),
:deep(.field select) {
  padding: 10px 12px !important;
  font-size: 13px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(91, 141, 191, 0.15) !important;
  background: rgba(255, 255, 255, 0.6) !important;
  color: #2c4a6e;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

:deep(.field input:focus),
:deep(.field select:focus) {
  border-color: rgba(91, 141, 191, 0.4) !important;
  box-shadow: 0 0 0 3px rgba(91, 141, 191, 0.1) !important;
  background: rgba(255, 255, 255, 0.9) !important;
}

:deep(.inline-actions) {
  gap: 6px !important;
}

:deep(.list-table) {
  font-size: 12px !important;
  width: 100%;
  border-collapse: collapse;
}

:deep(.list-table th) {
  padding: 8px 12px !important;
  font-size: 11px !important;
  font-weight: 600;
  color: #6b8aab;
  text-align: left;
  border-bottom: 1px solid rgba(91, 141, 191, 0.12);
}

:deep(.list-table td) {
  padding: 10px 12px !important;
  border-bottom: 1px solid rgba(91, 141, 191, 0.08);
}

:deep(.list-table td strong) {
  font-size: 12px !important;
  color: #2c4a6e;
}

:deep(.list-table .muted) {
  font-size: 10px !important;
  color: #6b8aab;
}

:deep(.list-table tbody tr) {
  transition: background 0.15s ease;
}

:deep(.list-table tbody tr:hover) {
  background: rgba(91, 141, 191, 0.03);
}

:deep(.error-text) {
  font-size: 12px !important;
  color: #d9534f;
  padding: 10px 14px;
  background: rgba(217, 83, 79, 0.08);
  border-radius: 10px;
}

:deep(.muted) {
  font-size: 12px !important;
  color: #6b8aab;
}

.admin-table-wrap {
  overflow: auto;
}

.admin-table-wrap--bounded {
  max-height: 180px;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardRise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .admin-search-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .admin-grid--two {
    grid-template-columns: 1fr;
  }

  .admin-section__header {
    flex-direction: column;
  }

  .admin-search-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-section,
  :deep(.panel) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
