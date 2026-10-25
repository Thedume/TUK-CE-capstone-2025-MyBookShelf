<template>
  <footer class="site-footer">
    <p class="site-footer-name">MyBookShelf</p>
    <p class="site-footer-note">2025 캡스톤디자인 프로젝트</p>
  </footer>
</template>

<script>
export default {
  name: 'FooterView',
};
</script>

<style scoped>
.site-footer {
  margin-top: 40px;
  padding: 24px 20px;
  border-top: 1px solid #eee;
  background-color: #fafafa;
  text-align: center;
  color: #777;
}

.site-footer-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: bold;
  color: #FFA500;
}

.site-footer-note {
  margin: 0;
  font-size: 13px;
}
</style>