<template>
  <section class="detail-page">
    <button type="button" class="back-button" @click="goBack">뒤로 가기</button>

    <p v-if="loading" class="state-message" role="status">책 정보를 불러오는 중입니다…</p>

    <div v-else-if="error" class="state-message" role="alert">
      <p>{{ error }}</p>
      <button v-if="canRetry" type="button" class="retry-button" @click="fetchBook">다시 시도</button>
    </div>

    <article v-else-if="book" class="detail-body">
      <div class="cover-box">
        <img
          v-if="book.cover && !coverFailed"
          :src="book.cover"
          :alt="book.title + ' 표지'"
          @error="coverFailed = true"
        />
        <span v-else class="cover-fallback">표지 없음</span>
      </div>

      <div class="detail-info">
        <h2 class="detail-title">{{ book.title }}</h2>

        <dl class="detail-list">
          <div v-if="book.author">
            <dt>저자</dt>
            <dd>{{ book.author }}</dd>
          </div>
          <div v-if="book.publisher">
            <dt>출판사</dt>
            <dd>{{ book.publisher }}</dd>
          </div>
          <div v-if="categoryText">
            <dt>분류</dt>
            <dd>{{ categoryText }}</dd>
          </div>
          <div v-if="book.rating > 0">
            <dt>독자 평점</dt>
            <dd>{{ book.rating }} / 10</dd>
          </div>
          <div v-if="book.isbn">
            <dt>ISBN</dt>
            <dd>{{ book.isbn }}</dd>
          </div>
        </dl>

        <h3 class="description-heading">책 소개</h3>
        <p v-if="book.description" class="description">{{ book.description }}</p>
        <p v-else class="description empty">등록된 책 소개가 없습니다.</p>
      </div>
    </article>
  </section>
</template>

<script>
import axios from '@/axios';

// 알라딘 응답에 &lt; 같은 HTML 엔티티가 섞여 있어 화면용 문자열로 변환한다.
// DOMParser는 스크립트를 실행하지 않고, textContent는 태그를 버리므로 안전하다.
function decodeEntities(value) {
  if (!value) return '';
  return new DOMParser().parseFromString(value, 'text/html').documentElement.textContent;
}

export default {
  name: 'BookDetailsView',

  data() {
    return {
      book: null,
      loading: false,
      error: '',
      canRetry: false,
      coverFailed: false,
      requestId: 0, // 이전 요청의 응답이 늦게 도착해도 덮어쓰지 않도록 구분한다.
    };
  },

  computed: {
    isbn() {
      return this.$route.params.isbn;
    },
    // "국내도서>소설/시/희곡>한국소설" 형태의 분류를 읽기 쉽게 바꾼다.
    categoryText() {
      if (!this.book || !this.book.categoryName) return '';
      return this.book.categoryName
        .split('>')
        .filter((part) => part !== '국내도서')
        .join(' / ');
    },
  },

  watch: {
    // 같은 컴포넌트에서 다른 ISBN으로 이동하는 경우에도 다시 불러온다.
    isbn: {
      immediate: true,
      handler() {
        this.fetchBook();
      },
    },
  },

  methods: {
    async fetchBook() {
      const currentRequest = ++this.requestId;
      this.loading = true;
      this.error = '';
      this.canRetry = false;
      this.book = null;
      this.coverFailed = false;

      try {
        const response = await axios.get(`/api/book/${encodeURIComponent(this.isbn)}`);
        if (currentRequest !== this.requestId) return;

        if (response.data.isSuccess && response.data.result) {
          const result = response.data.result;
          this.book = {
            title: decodeEntities(result.title),
            author: decodeEntities(result.author),
            publisher: decodeEntities(result.publisher),
            description: decodeEntities(result.description),
            categoryName: decodeEntities(result.categoryName),
            isbn: result.isbn,
            cover: result.cover,
            rating: Number(result.customerReviewRank) || 0,
          };
        } else {
          this.error = response.data.message || '책 정보를 찾을 수 없습니다.';
        }
      } catch (e) {
        if (currentRequest !== this.requestId) return;
        if (e.response && e.response.status === 404) {
          this.error = '책 정보를 찾을 수 없습니다. 알라딘에 등록되지 않은 책일 수 있습니다.';
        } else {
          console.error('책 정보 조회 오류:', e);
          this.error = '책 정보를 불러오지 못했습니다. 서버가 켜져 있는지 확인하고 다시 시도해 주세요.';
          this.canRetry = true;
        }
      } finally {
        if (currentRequest === this.requestId) this.loading = false;
      }
    },

    goBack() {
      // 직접 주소로 들어와 이전 기록이 없으면 홈으로 이동한다.
      if (window.history.length > 1) {
        this.$router.back();
      } else {
        this.$router.push('/');
      }
    },
  },
};
</script>

<style scoped>
.detail-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 4rem 2rem 2rem;
}

.back-button,
.retry-button {
  padding: 8px 18px;
  font-size: 15px;
  cursor: pointer;
  border-radius: 4px;
}

.back-button {
  margin-bottom: 28px;
  color: #333;
  background-color: #fff;
  border: 2px solid #FFA500;
}

.back-button:hover {
  color: #fff;
  background-color: #FFA500;
}

.retry-button {
  margin-top: 8px;
  color: #fff;
  background-color: #FFA500;
  border: 2px solid #FFA500;
}

.retry-button:hover {
  background-color: #e39400;
}

.back-button:focus-visible,
.retry-button:focus-visible {
  outline: 3px solid #FFA500;
  outline-offset: 2px;
}

.state-message {
  margin: 48px 0;
  text-align: center;
  color: #666;
  line-height: 1.6;
}

.detail-body {
  display: flex;
  gap: 36px;
  align-items: flex-start;
}

.cover-box {
  display: flex;
  flex: 0 0 220px;
  align-items: center;
  justify-content: center;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background-color: #f2f2f2;
  border: 1px solid #eee;
  border-radius: 4px;
}

.cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  font-size: 13px;
  color: #999;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-title {
  margin: 0 0 20px;
  font-size: 26px;
  line-height: 1.35;
  color: #333;
}

.detail-list {
  margin: 0 0 28px;
}

.detail-list > div {
  display: flex;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-list dt {
  flex: 0 0 72px;
  color: #999;
}

.detail-list dd {
  margin: 0;
  color: #333;
  overflow-wrap: anywhere;
}

.description-heading {
  margin: 0 0 10px;
  font-size: 17px;
  color: #333;
}

.description {
  margin: 0;
  max-width: 62ch;
  line-height: 1.75;
  color: #444;
  white-space: pre-line;
}

.description.empty {
  color: #999;
}

@media (max-width: 640px) {
  .detail-page {
    padding: 4rem 1.25rem 2rem;
  }

  .detail-body {
    flex-direction: column;
    align-items: center;
  }

  .cover-box {
    flex-basis: auto;
    width: 180px;
  }

  .detail-info {
    width: 100%;
  }
}
</style>