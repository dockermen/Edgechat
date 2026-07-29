<script setup>
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const navItems = [
  { label: '用户管理', desc: '创建、禁用、删除和重置用户', to: '/admin/users', icon: 'users' },
  { label: '消息查看', desc: '搜索消息并查看会话', to: '/admin/messages', icon: 'messages' },
  { label: '网站设置', desc: '站点概况与后台配置', to: '/admin/site', icon: 'site' }
];

const currentTitle = computed(
  () => navItems.find(item => route.path.startsWith(item.to))?.label || '管理后台'
);
</script>

<template>
  <div class="admin-page">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <h1 class="admin-brand__title">控制台</h1>
        <p class="admin-brand__subtitle">管理后台</p>
      </div>

      <nav class="admin-nav">
        <button
          v-for="(item, i) in navItems" :key="item.to" type="button"
          class="admin-nav-item"
          :class="{ 'admin-nav-item--active': route.path.startsWith(item.to) }"
          :style="{ animationDelay: `${0.1 + i * 0.08}s` }"
          @click="router.push(item.to)"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.desc }}</span>
        </button>
      </nav>

      <div class="admin-sidebar-foot">
        <button type="button" class="admin-foot-link" @click="router.push('/')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          返回聊天
        </button>
        <button type="button" class="admin-foot-link" @click="router.push('/settings')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          个人设置
        </button>
      </div>
    </aside>

    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-page {
  height: 100vh;
  display: flex;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
}

.admin-sidebar {
  width: 260px;
  min-width: 260px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 28px 20px 24px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 0 60px rgba(91, 141, 191, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.admin-sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  pointer-events: none;
}

.admin-brand {
  padding: 0 12px 24px;
  border-bottom: 1px solid rgba(91, 141, 191, 0.12);
  opacity: 0;
  animation: fadeSlideDown 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
}

.admin-brand__title {
  font-size: 22px;
  font-weight: 700;
  color: #2c4a6e;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.admin-brand__subtitle {
  font-size: 12px;
  color: #6b9fd8;
  margin: 0;
  font-weight: 500;
}

.admin-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 0;
}

.admin-nav-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  color: #2c4a6e;
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  opacity: 0;
  animation: fadeSlideRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.admin-nav-item strong {
  font-size: 14px;
  font-weight: 600;
}

.admin-nav-item span {
  font-size: 11px;
  color: #6b8aab;
  line-height: 1.4;
}

.admin-nav-item:hover {
  background: rgba(91, 141, 191, 0.06);
  border-color: rgba(91, 141, 191, 0.12);
  transform: translateX(4px);
}

.admin-nav-item--active {
  background: linear-gradient(135deg, rgba(91, 141, 191, 0.12), rgba(91, 141, 191, 0.06));
  border-color: rgba(91, 141, 191, 0.2);
  box-shadow:
    0 4px 16px rgba(91, 141, 191, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.admin-nav-item--active span {
  color: #5b8dbf;
}

.admin-sidebar-foot {
  padding-top: 16px;
  border-top: 1px solid rgba(91, 141, 191, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards;
}

.admin-foot-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: none;
  color: #6b8aab;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.admin-foot-link:hover {
  background: rgba(91, 141, 191, 0.08);
  color: #2c4a6e;
  transform: translateX(2px);
}

.admin-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
}

.admin-content::-webkit-scrollbar { width: 6px; }
.admin-content::-webkit-scrollbar-track { background: transparent; }
.admin-content::-webkit-scrollbar-thumb {
  background: rgba(91, 141, 191, 0.2);
  border-radius: 3px;
}
.admin-content::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 141, 191, 0.35);
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

@keyframes fadeSlideRight {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeSlideUp {
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
  .admin-page { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }

  .admin-sidebar {
    width: 100%;
    min-width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.6);
    padding: 20px 16px 16px;
  }

  .admin-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 16px 0;
    gap: 8px;
    scrollbar-width: none;
  }

  .admin-nav::-webkit-scrollbar { display: none; }

  .admin-nav-item {
    min-width: 140px;
    flex-shrink: 0;
  }

  .admin-sidebar-foot {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .admin-content { padding: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .admin-brand,
  .admin-nav-item,
  .admin-sidebar-foot {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
