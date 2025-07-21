<template>
  <div id="app">
    <div class="app-wrapper">
      <LayoutView v-if="$route.meta.layout !== false">
        <transition name="fade" mode="out-in">
          <router-view />
        </transition>
      </LayoutView>

      <router-view v-else />

      <FooterView v-if="$route.meta.footer !== false" />
    </div>
  </div>
</template>

<script>
import { ref, provide, onMounted } from 'vue';
import LayoutView from '@/layouts/LayoutView.vue';
import FooterView from '@/components/FooterView.vue';
import axios from '@/axios'; // 커스텀 axios 인스턴스

export default {
  name: 'App',
  components: { LayoutView, FooterView },

  setup() {
    const user = ref(null);

    // ✅ 서버에서 로그인 여부 확인
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('/api/user/info', {
          withCredentials: true
        });

        if (response.data.isSuccess) {
          user.value = response.data.result;
          localStorage.setItem('user', JSON.stringify(response.data.result));
        } else {
          user.value = null;
          localStorage.removeItem('user');
        }
      } catch (e) {
        console.warn('세션 확인 실패:', e);
        user.value = null;
        localStorage.removeItem('user');
      }
    };

    onMounted(() => {
      // localStorage 기반 초기 설정
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        user.value = JSON.parse(storedUser);
      }

      // 다른 탭 로그인/로그아웃 반영
      window.addEventListener('storage', () => {
        const updatedUser = localStorage.getItem('user');
        user.value = updatedUser ? JSON.parse(updatedUser) : null;
      });

      // ✅ 서버 세션 확인
      fetchUserInfo();
    });

    const logout = () => {
      localStorage.removeItem('user');
      user.value = null;
    };

    provide('user', user);
    provide('logout', logout);

    return { user, logout };
  },
};
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
}

.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 콘텐츠 확장 및 푸터 하단 고정 */
.app-wrapper > *:first-child {
  flex: 1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
