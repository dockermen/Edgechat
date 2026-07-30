<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../api.js';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const loading = ref(false);
const error = ref('');
const logs = ref([]);
const filters = reactive({
  keyword: '',
  userId: '',
  action: '',
  limit: 80
});

const actionLabels = {
  login: '登录',
  logout: '退出登录',
  message_send: '发送消息',
  file_upload: '上传附件',
  profile_update: '更新资料',
  password_change: '修改密码',
  admin_user_create: '创建用户',
  admin_user_update: '更新用户',
  admin_user_reset_password: '重置密码',
  admin_user_delete: '删除用户',
  admin_site_update: '更新站点设置',
  admin_invite_create: '创建注册链接',
  admin_invite_revoke: '停用注册链接',
  channel_create: '创建群组',
  channel_update: '更新群组',
  channel_invite_members: '邀请成员',
  channel_remove_member: '移除成员',
  channel_delete: '删除群组',
  admin_channel_delete: '后台删除群组',
  dm_open: '打开私聊'
};

const actionOptions = computed(() => Object.entries(actionLabels));

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

function actionLabel(action) {
  return actionLabels[action] || action || '-';
}

function formatDetail(detail) {
  if (!detail) return '-';
  try {
    const parsed = JSON.parse(detail);
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join('，');
    }
  } catch {
    // 非 JSON 明细直接展示。
  }
  return detail;
}

async function loadLogs() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.adminLogs(filters);
    logs.value = payload.logs || [];
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.keyword = '';
  filters.userId = '';
  filters.action = '';
  filters.limit = 80;
  void loadLogs();
}

onMounted(loadLogs);
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h1>操作日志</h1>
        <p>查看用户上线时间关联的登录、退出、消息、上传和后台操作记录。</p>
      </div>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <UiSurface class="panel log-filter-panel">
        <label class="field">
          <span>关键词</span>
          <input v-model.trim="filters.keyword" placeholder="用户、操作、详情、IP" @keyup.enter="loadLogs" />
        </label>
        <label class="field field--small">
          <span>用户 ID</span>
          <input v-model.trim="filters.userId" placeholder="可选" @keyup.enter="loadLogs" />
        </label>
        <label class="field field--small">
          <span>操作类型</span>
          <select v-model="filters.action">
            <option value="">全部</option>
            <option v-for="[value, label] in actionOptions" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>
        <div class="inline-actions">
          <UiButton :disabled="loading" @click="loadLogs">{{ loading ? '加载中...' : '查询' }}</UiButton>
          <UiButton variant="secondary" @click="resetFilters">重置</UiButton>
        </div>
      </UiSurface>

      <UiSurface class="panel panel--table">
        <div class="admin-table-wrap">
          <table class="list-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>操作</th>
                <th>对象</th>
                <th>详情</th>
                <th>IP</th>
                <th>User-Agent</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!logs.length && !loading">
                <td colspan="7" class="muted">暂无日志。</td>
              </tr>
              <tr v-for="log in logs" :key="log.id">
                <td>{{ formatTime(log.createdAt) }}</td>
                <td>
                  <strong>{{ log.displayName }}</strong>
                  <div class="muted">{{ log.userId ? `#${log.userId}` : '系统' }} {{ log.username ? `@${log.username}` : '' }}</div>
                </td>
                <td><span class="action-badge">{{ actionLabel(log.action) }}</span></td>
                <td>{{ log.targetType || '-' }}<span v-if="log.targetId" class="muted"> / {{ log.targetId }}</span></td>
                <td class="detail-cell">{{ formatDetail(log.detail) }}</td>
                <td>{{ log.ip || '-' }}</td>
                <td class="ua-cell">{{ log.userAgent || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSurface>
    </div>
  </div>
</template>

<style scoped>
.admin-section { display: flex; flex-direction: column; min-height: 0; gap: 16px; animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.admin-section__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-shrink: 0; }
.admin-section__heading h1 { margin: 0; font-size: 20px; font-weight: 700; color: #2c4a6e; letter-spacing: -0.02em; }
.admin-section__heading p { margin: 4px 0 0; font-size: 12px; color: #6b8aab; }
.admin-section__body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 4px; }
:deep(.panel) { padding: 18px !important; border-radius: 18px !important; background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(16px) !important; border: 1px solid rgba(255, 255, 255, 0.6) !important; box-shadow: 0 8px 32px rgba(91, 141, 191, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important; }
.log-filter-panel { display: grid !important; grid-template-columns: minmax(180px, 1fr) 120px 160px auto; align-items: end; gap: 12px !important; }
:deep(.field) { gap: 4px !important; margin-bottom: 0 !important; }
:deep(.field span) { font-size: 11px !important; color: #6b8aab; font-weight: 500; }
:deep(.field input), :deep(.field select) { width: 100%; padding: 10px 12px !important; font-size: 13px !important; border-radius: 10px !important; border: 1px solid rgba(91, 141, 191, 0.15) !important; background: rgba(255, 255, 255, 0.6) !important; color: #2c4a6e; }
:deep(.inline-actions) { display: flex; gap: 8px !important; }
:deep(.panel--table) { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.admin-table-wrap { overflow: auto; flex: 1; }
:deep(.list-table) { font-size: 12px !important; width: 100%; border-collapse: collapse; min-width: 920px; }
:deep(.list-table th) { padding: 8px 12px !important; font-size: 11px !important; font-weight: 600; color: #6b8aab; text-align: left; border-bottom: 1px solid rgba(91, 141, 191, 0.12); white-space: nowrap; }
:deep(.list-table td) { padding: 10px 12px !important; border-bottom: 1px solid rgba(91, 141, 191, 0.08); vertical-align: top; }
:deep(.list-table td strong) { font-size: 12px !important; color: #2c4a6e; }
:deep(.muted) { font-size: 10px !important; color: #6b8aab; }
.action-badge { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: rgba(91, 141, 191, 0.1); color: #2c4a6e; font-size: 11px; font-weight: 600; white-space: nowrap; }
.detail-cell { max-width: 260px; word-break: break-word; }
.ua-cell { max-width: 260px; color: #6b8aab; word-break: break-word; }
:deep(.error-text) { font-size: 12px !important; color: #d9534f; padding: 10px 14px; background: rgba(217, 83, 79, 0.08); border-radius: 10px; }
@media (max-width: 900px) { .log-filter-panel { grid-template-columns: 1fr; } }
</style>
