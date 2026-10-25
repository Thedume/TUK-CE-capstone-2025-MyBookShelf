<template>
  <section class="search-page">
    <p v-if="!query" class="state-message">검색어를 입력해 주세요.</p>

    <template v-else>
      <h2 class="search-title">“{{ query }}” 검색 결과</h2>
      <p v-if="!loading && !error" class="search-count">총 {{ books.length }}권</p>

      <p v-if="loading" class="state-message" role="status">검색 중입니다…</p>

      <div v-else-if="error" class="state-message" role="alert">
        <p>{{ error }}</p>
        <button type="button" class="retry-button" @click="fetchBooks">다시 검색</button>
      </div>

      <p v-else-if="books.length === 0" class="state-message">
        검색 결과가 없습니다. 제목이나 저자명을 바꿔서 다시 검색해 보세요.
      </p>

      <template v-else>
        <ul class="book-grid">
          <li v-for="book in pagedBooks" :key="book.isbn || book.title">
            <button
              type="button"
              class="book-card"
              :disabled="!book.isbn"
              @click="goToDetail(book)"
            >
              <div class="cover-box">
                <img
                  v-if="book.cover && !book.coverFailed"
                  :src="book.cover"
                  :alt="book.title + ' 표지'"
                  loading="lazy"
                  @error="book.coverFailed = true"
                />
                <span v-else class="cover-fallback">표지 없음</span>
              </div>
              <p class="book-title">{{ book.title }}</p>
              <p class="book-meta">{{ book.author }}</p>
              <p class="book-meta">{{ book.publisher }}</p>
            </button>
          </li>
        </ul>

        <nav v-if="totalPages > 1" class="pager" aria-label="검색 결과 페이지">
          <button type="button" :disabled="page === 1" @click="changePage(page - 1)">이전</button>
          <span class="pager-status">{{ page }} / {{ totalPages }}</span>
          <button type="button" :disabled="page === totalPages" @click="changePage(page + 1)">다음</button>
        </nav>
      </template>
    </template>
  </section>
</template>

<script>
import axios from '@/axios';

const PER_PAGE = 12;

// 알라딘 응답에 &lt; 같은 HTML 엔티티가 섞여 있어 화면용 문자열로 변환한다.
// DOMParser는 스크립트를 실행하지 않고, textContent는 태그를 버리므로 안전하다.
function decodeEntities(value) {
  if (!value) return '';
  return new DOMParser().parseFromString(value, 'text/html').documentElement.textContent;
}

export default {
  name: 'SearchView',

  data() {
    return {
      books: [],
      loading: false,
      error: '',
      page: 1,
      requestId: 0, // 이전 검색 응답이 늦게 도착해도 덮어쓰지 않도록 구분한다.
    };
  },

  computed: {
    query() {
      const q = this.$route.query.query;
      return typeof q === 'string' ? q.trim() : '';
    },
    totalPages() {
      return Math.ceil(this.books.length / PER_PAGE);
    },
    pagedBooks() {
      const start = (this.page - 1) * PER_PAGE;
      return this.books.slice(start, start + PER_PAGE);
    },
  },

  watch: {
    // 상단 검색창에서 다시 검색하면 같은 컴포넌트가 재사용되므로 쿼리 변화를 감시한다.
    query: {
      immediate: true,
      handler() {
        this.fetchBooks();
      },
    },
  },

  methods: {
    async fetchBooks() {
      this.page = 1;
      this.error = '';

      if (!this.query) {
        this.books = [];
        this.loading = false;
        return;
      }

      const currentRequest = ++this.requestId;
      this.loading = true;

      try {
        const response = await axios.get('/api/books/search', {
          params: { query: this.query },
        });
        if (currentRequest !== this.requestId) return;

        const list = Array.isArray(response.data.books) ? response.data.books : [];
        this.books = list.map((book) => ({
          title: decodeEntities(book.title),
          author: decodeEntities(book.author),
          publisher: decodeEntities(book.publisher),
          isbn: book.isbn,
          cover: book.cover,
          coverFailed: false,
        }));
      } catch (e) {
        if (currentRequest !== this.requestId) return;
        console.error('책 검색 오류:', e);
        this.books = [];
        this.error = '검색 중 문제가 발생했습니다. 서버가 켜져 있는지 확인하고 다시 시도해 주세요.';
      } finally {
        if (currentRequest === this.requestId) this.loading = false;
      }
    },

    goToDetail(book) {
      if (!book.isbn) return;
      this.$router.push({ name: 'BookDetails', params: { isbn: book.isbn } });
    },

    changePage(next) {
      if (next < 1 || next > this.totalPages) return;
      this.page = next;
      window.scrollTo({ top: 0 });
    },
  },
};
</script>

<style scoped>
.search-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 4rem 2rem 2rem;
}

.search-title {
  margin: 0 0 4px;
  font-size: 22px;
  color: #333;
}

.search-count {
  margin: 0 0 24px;
  font-size: 14px;
  color: #777;
}

.state-message {
  margin: 48px 0;
  text-align: center;
  color: #666;
  line-height: 1.6;
}

.retry-button {
  margin-top: 8px;
  padding: 8px 18px;
  font-size: 15px;
  cursor: pointer;
  color: #fff;
  background-color: #FFA500;
  border: 2px solid #FFA500;
  border-radius: 4px;
}

.retry-button:hover {
  background-color: #e39400;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 24px 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.book-card {
  display: block;
  width: 100%;
  padding: 0;
  font: inherit;
  text-align: left;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.book-card:disabled {
  cursor: default;
  opacity: 0.6;
}

.cover-box {
  display: flex;
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

.book-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 10px 0 4px;
  font-size: 15px;
  font-weight: bold;
  line-height: 1.4;
  color: #333;
}

.book-card:not(:disabled):hover .book-title {
  color: #e39400;
}

.book-meta {
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.5;
  color: #777;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.book-card:focus-visible,
.pager button:focus-visible,
.retry-button:focus-visible {
  outline: 3px solid #FFA500;
  outline-offset: 2px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 36px;
}

.pager button {
  padding: 8px 18px;
  font-size: 15px;
  cursor: pointer;
  color: #333;
  background-color: #fff;
  border: 2px solid #FFA500;
  border-radius: 4px;
}

.pager button:hover:not(:disabled) {
  background-color: #FFA500;
  color: #fff;
}

.pager button:disabled {
  cursor: default;
  color: #bbb;
  border-color: #ddd;
}

.pager-status {
  min-width: 64px;
  text-align: center;
  color: #555;
}
</style>