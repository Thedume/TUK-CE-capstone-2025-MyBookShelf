import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// Vuex와 Router를 앱에 등록
app.use(router);

// 앱을 마운트
app.mount('#app');
