<template>
  <div class="guidelines-container">
    <h1 class="guidelines-title">이용 가이드라인</h1>
    <div class="guideline-card" v-for="(item, i) in guidelines" :key="i">
      <div class="guideline-header">
        <span class="step-number">{{ i + 1 }}</span>
        <h2>{{ item.title }}</h2>
      </div>
      <p>{{ item.content }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: "GuidelinesView",
  data() {
    return {
      guidelines: [
        {
          title: "책 검색 및 등록",
          content:
            "도서를 직접 검색하여 등록하거나, ISBN 입력 및 책 표지 촬영을 통해 손쉽게 책을 추가할 수 있습니다.",
        },
        {
          title: "나만의 책장 관리",
          content:
            "원하는 책장을 생성하고 이름을 변경하거나 삭제할 수 있습니다. 선택한 책장을 공유하여 게시물 작성도 가능합니다.",
        },
        {
          title: "맞춤형 도서 추천",
          content:
            "장르, 인기도, 출간일, 베스트셀러 여부 등 설문 기반의 항목을 선택하면 개인 맞춤형 도서를 추천받을 수 있습니다.",
        },
        {
          title: "커뮤니티 참여",
          content:
            "게시물을 작성하거나 댓글을 남기며 다른 사용자와 소통할 수 있습니다. 익명 여부도 선택할 수 있습니다.",
        },
      ],
    };
  },
};
</script>

<style scoped>
.guidelines-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.guidelines-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  text-align: center;
  color: #333;
}

.guideline-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.guideline-card:hover {
  transform: translateY(-4px);
}

.guideline-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.8rem;
}

.step-number {
  display: inline-block;
  width: 32px;
  height: 32px;
  margin-right: 0.8rem;
  background: #4f46e5;
  color: white;
  font-weight: bold;
  border-radius: 50%;
  text-align: center;
  line-height: 32px;
}
</style>