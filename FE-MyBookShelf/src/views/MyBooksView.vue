<template>
  <div class="my-books">
    <!-- 책장 헤더 -->
    <div class="bookshelf-header">
      <div class="bookshelf-controls">
        <div v-if="isRenaming">
          <input v-model="newBookshelfName" @keyup.enter="renameBookshelf"
          class="rename-input" type="text" placeholder="새 책장 이름 입력"/>
        </div>

        <!-- 책장 리스트 -->
        <select v-else v-model="currentBookshelf" @change="selectBookshelf" class="bookshelf-select">
          <option value="null" disabled> ------- 책장을 추가해주세요 ------- </option>
          <option v-for="shelf in bookshelves" :key="shelf.bookshelfId" :value="shelf.bookshelfId">
            {{ [ shelf.bookshelfName ] }}
          </option>
        </select>

        <button @click="toggleRenameMode" class="rename-button" :disabled="isNoBookshelf">
          {{ isRenaming ? "저장" : "이름 변경" }}
        </button>
        <button @click="openAddBookshelfModal" class="add-bookshelf-button">+ 책장 생성</button>
        <button @click="deleteBookshelf" class="delete-bookshelf-button" :disabled="isNoBookshelf">🗑 책장 삭제</button>
        <button @click="openSidebar" class="add-book-button" :disabled="!currentBookshelf">책 등록</button>
        <button @click="openRecommendationModal" class="recommend-button">책 추천 받기</button>
        <button @click="toggleEditMode" class="edit-button">책장 편집</button>
        <button @click="openShareModal" class="share-button" :disabled="isNoBookshelf">책장 공유</button>
      </div>
    </div>

    <!-- 책장 공유용 게시글 작성 모달 -->
    <PostEditor
      v-if="showShareModal" :initial-title="sharePostTitle" :initial-content="sharePostContent" :initial-board="'FREE'"
      @submit="submitSharedBookshelf" @cancel="closeShareModal"
    />

    <!-- 네모난 책장 폼 -->
    <div class="bookshelf">
      <div class="book-grid">
        <div v-for="(book, index) in currentBookshelfBooks" 
          :key="index" class="book-placeholder" @contextmenu.prevent="showContextMenu($event, book)">
          <div v-if="book.cover" class="bookshelfbook-cover">
            <img :src="book.cover || 'default-cover.jpg'" alt="책 표지" />
          </div>
          <div class="bookshelf-info">
            <div class="bookshelf-title">{{ truncateTitleBeforeSpecialChar(book.title) }}</div>
            <div class="bookshelf-author">{{ book.author.length > 20 ? book.author.slice(0, 20) + '...' : book.author }}</div>
            <div class="bookshelf-category">{{ book.categoryName }}</div>
            <button v-if="isEditing" @click="removeBook(book)" class="remove-book-button">-</button>
          </div>
        </div>
      </div>
      <!-- 컨텍스트 메뉴 -->
      <div v-if="contextMenuVisible" class="context-menu" :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }">
        <button @click="viewBookInfo()">책 상세보기</button>
        <button @click="removeBookFromContextMenu">책 삭제</button>
      </div>
    </div>

    <!-- 책장 추가 모달 -->
    <div v-if="isAddBookshelfModalOpen" class="add-bookshelf-modal">
      <div class="add-bookshelf-modal-content">
        <label for="new-bookshelf-name">책장 이름</label>
        <input type="text" id="new-bookshelf-name" v-model="newBookshelfNameForModal" placeholder="책장 이름 입력" />
        <button @click="addBookshelf" class="create-bookshelf-button">책장 생성하기</button>
        <button @click="closeAddBookshelfModal" class="close-modal-button">취소</button>
      </div>
    </div>

    <!-- 로딩 모달 -->
    <div v-if="isLoading" class="loading-modal">
      <div class="loading-modal-content">
        <div class="spinner"></div> <!-- 여기에 CSS로 애니메이션 -->
        <p>도서 추천 목록 불러오는 중... (약 1~2분 소요)</p>
        <button @click="cancelRecommendation" class="cancel-recommendation-button">추천 취소</button>
      </div>
    </div>

    <!-- 추천받기 모달 -->
    <div v-if="isRecommendationModalOpen" class="recommendation-modal">
      <div class="recommendation-modal-content">
        <h3>맞춤형 도서 추천받기</h3>
        <div class="plus-recommendation-options"> 
          <button @click="setRecommendationType('preference')" :class="{ active: recommendationType === 'preference' }">내 취향 추천</button>
          <button @click="setRecommendationType('quick')" :class="{ active: recommendationType === 'quick' }">빠른 통합 추천</button>
          <button @click="setRecommendationType('ai')" :class="{ active: recommendationType === 'ai' }">AI 키워드 추천</button>
        </div>
        <div v-if="recommendationType === 'preference'" class="recommendation-options">
          <p>내 취향(선호 장르)에 맞춘 도서를 추천받으시겠습니까?</p>
          <div class="button-container">
            <button @click="recommendPreference" class="recommend-books-button">추천받기</button>
            <button @click="closeRecommendationModal" class="close-modal-button">취소</button>
          </div>
        </div>
        <div v-if="recommendationType === 'quick'" class="recommendation-options">
          <p>빠르게 통합 추천받으시겠습니까?</p>
          <div class="button-container">
            <button @click="recommendQuick" class="recommend-books-button">추천받기</button>
            <button @click="closeRecommendationModal" class="close-modal-button">취소</button>
          </div>
        </div>
        <div v-if="recommendationType === 'ai'" class="recommendation-options">
          <p>AI 기반 키워드 분석을 포함한 정밀 추천을 받으시겠습니까?</p>
          <div class="button-container">
            <button @click="recommendAI" class="recommend-books-button">추천받기</button>
            <button @click="closeRecommendationModal" class="close-modal-button">취소</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 추가 평점 모달 -->
    <div v-if="isAdditionalRatingModalOpen" class="additional-rating-modal">
      <div class="additional-rating-modal-content">
        <div class="additional-rating-header">도서 추천 결과</div>
        <div class="rating-list">
          <div class="rating-item" v-for="book in recommendations" :key="book.isbn">
            <div class="rating-cover">
              <img :src="book.cover" alt="책 표지" />
            </div>
            <div class="rating-info">
              <div class="rating-title">{{ book.title }}</div>
              <div class="rating-author">저자: {{ book.author.length > 20 ? book.author.slice(0, 20) + '...' : book.author }}</div>
              <div class="rating-category">카테고리: {{ book.categoryName }}</div>
            </div>
            <div class="rating-save-button-area">
              <button @click="selectBook(book)" class="rating-save-button">저장</button>
            </div>
            <div>
              <div class="rating-details">
                <template v-if="recommendationType === 'preference'">
                  <div class="rating-score">가중평점: {{ book.weightedRatingScore?.toFixed(2) ?? 'N/A' }}</div>
                  <div class="rating-loan">대출 점수: {{ book.loanScore?.toFixed(2) ?? 'N/A' }}</div>
                  <div class="rating-best">베스트셀러 점수: {{ book.bestsellerScore }}</div>
                  <div class="rating-total">총점: {{ book.totalScore?.toFixed(2) ?? 'N/A' }}</div>
                </template>
                <template v-else>
                  <div class="rating-gerne">장르 유사 점수: {{ book.similarityScore }}</div>
                  <div class="rating-prefer">선호 장르 점수: {{ book.preferenceScore }}</div>
                  <div class="rating-keyword">키워드 점수: {{ book.keywordScore }}</div>
                  <div class="rating-score">가중평점: {{ book.weightedRatingScore?.toFixed(2) ?? 'N/A' }}</div>
                  <div class="rating-loan">대출 점수: {{ book.loanScore.toFixed(2) ?? 'N/A' }}</div>
                  <div class="rating-best">베스트셀러 점수: {{ book.bestsellerScore }}</div>
                  <div class="rating-total">총점: {{ book.totalScore?.toFixed(2) ?? 'N/A' }}</div>
                </template>
              </div>
            </div>
          </div>
        </div>
        <button @click="closeAdditionalRatingModal" class="close-rating-modal-button">닫기</button>
      </div>
    </div>

    <!-- 확인 모달 -->
    <div v-if="showConfirmModal" class="confirm-modal">
      <div class="confirm-modal-content">
        <p>'{{ selectedBook.title }}' 을 저장하시겠습니까?</p>
        <div class="confirm-modal-button-container">
          <button @click="confirmAddBook">예</button>
          <button @click="cancelAddBook">아니요</button>
        </div>
      </div>
    </div>

    <!-- 사이드바 -->
    <div v-if="isSidebarOpen" class="sidebar">
      <div class="sidebar-content">
        <button class="close-button" @click="closeSidebar">✖</button>
        <div class="registration-options">
          <button @click="setRegisterType('manual')" :class="{ active: registerType === 'manual' }">직접 등록</button>
          <button @click="setRegisterType('isbn')" :class="{ active: registerType === 'isbn' }">ISBN 등록</button>
          <button @click="setRegisterType('photo')" :class="{ active: registerType === 'photo' }">사진 등록</button>
        </div>

        <!-- 직접 등록 폼 -->
        <div v-if="registerType === 'manual'" class="manual-form">
          <input type="text" id="title" v-model="manualTitle" placeholder="책 제목 입력" />
          <button @click="searchManual">검색</button>
        </div>

        <!-- ISBN 등록 폼 -->
        <div v-if="registerType === 'isbn'" class="isbn-form">
          <input type="text" id="isbn" v-model="isbn" placeholder="ISBN 입력" />
          <button @click="searchISBN">검색</button>
        </div>

        <!-- 사진 등록 폼 -->
        <div v-if="registerType === 'photo'" class="photo-options">
          <button @click="openFileInput" class="file-upload-button">첨부파일</button>
          <button @click="openCamera" class="camera-button">사진 촬영</button>
        </div>

        <!-- 검색된 책들 -->
        <div v-if="searchResults.length" class="search-results">
          <h4>검색된 책들:</h4>
          <ul>
            <li v-for="(book, index) in paginatedResults" :key="index">
              <div class="search-book-item">
                <div class="sidebook-cover">
                  <img :src="book.cover" alt="책 표지" />
                </div>
                <div class="sidebook-info">
                  <p class="sidebook-title" :title="book.title">
                    {{ book.title.length > 25 ? book.title.slice(0, 25) + '...' : book.title }}
                  </p>
                  <p class="sidebook-author">{{ book.author }}</p>
                  <button @click="selectBook(book)" class="sideselect-book-button">선택</button>
                </div>
              </div>
            </li>
          </ul>

          <!-- 페이지네이션 버튼 -->
          <div class="pagination">
            <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">이전</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">다음</button>
          </div>
        </div>

        <!-- 확인 모달 -->
        <div v-if="showConfirmModal" class="confirm-modal">
          <div class="confirm-modal-content">
            <p>'{{ selectedBook.title }}' 을 저장하시겠습니까?</p>
            <div class="confirm-modal-button-container">
              <button @click="confirmAddBook">예</button>
              <button @click="cancelAddBook">아니요</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import PostEditor from "@/components/PostEditor.vue";

axios.defaults.baseURL = 'http://localhost:8081'; // 기본 API 주소 설정

export default {
  name: "MyBooksView",
  components: { PostEditor },
  data() {
    return {
      bookshelves: [], // 기본값은 빈 배열로 설정
      currentBookshelf: null, // 기본값은 'null'로 설정
      isRenaming: false,
      newBookshelfName: "",  // 입력 필드에 사용할 새 책장 이름
      isNoBookshelf: false, // 선택된 책장이 없을 때 처리할 상태
      newBookshelfNameForModal: "", // 모달에 입력할 새 책장 이름
      isSidebarOpen: false,
      registerType: "manual",
      manualTitle: "",
      isbn: "",
      isAddBookshelfModalOpen: false, // 책장 추가 모달 열기 여부
      isRecommendationModalOpen: false, // 추천받기 모달 열기 여부
      isAdditionalRatingModalOpen: false,
      recommendationType: "preference", // 추천 타입
      searchResults: [], // 검색된 책 정보
      books: [], // 책 배열 초기화
      currentPage: 1, // 현재 페이지
      booksPerPage: 6, // 페이지당 책 개수
      showConfirmModal: false, // 책 선택버튼 누르면 뜨는 창
      isEditing: false,  // 책장 편집 모드 상태 추가
      contextMenuVisible: false, // 컨텍스트 메뉴 표시 여부
      contextMenuX: 0, // 컨텍스트 메뉴 X 좌표
      contextMenuY: 0, // 컨텍스트 메뉴 Y 좌표
      selectedBook: null, // 선택된 책
      recommendations: [], // 추천받은 책 목록
      isBooksModalOpen: false, // 책 추천 결과 모달 상태
      isLoading: false,
      loadingMessage: "도서 추천 목록 불러오는 중... (약 1~2분 소요)", // 로딩 모달 멘트
      abortController: null,
    };
  },

  created() {
    this.fetchBookshelves();
  },

  // 마우스 클릭 시 메뉴를 닫기 위해 이벤트 추가
  mounted() {
    document.addEventListener('click', this.closeContextMenu);
  },
  beforeUmount() {
    document.removeEventListener('click', this.closeContextMenu);
  },

  computed: {
    currentBookshelfBooks() {
      const shelf = this.bookshelves.find(
        // (shelf) => shelf.name === this.currentBookshelf
        (shelf) => shelf.bookshelfId === this.currentBookshelf // ID로 비교
      );
      return shelf ? shelf.book : []; // 책장에 등록된 책 목록 반환
    },

    // 사이드바 결과 페이지 쪽수
    paginatedResults() {
      const start = (this.currentPage - 1) * this.booksPerPage;
      const end = this.currentPage * this.booksPerPage;
      return this.searchResults.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.searchResults.length / this.booksPerPage); // 총 페이지 수
    },
  },

  methods: {
    cancelRecommendation() {
      if (this.abortController) {
        this.abortController.abort(); // ✅ 요청 취소
        this.isLoading = false;
        this.abortController = null; // 정리
      }
    },

    closeBooksModal() {
      this.isBooksModalOpen = false; // 책 추천 결과 모달 닫기
    },
    
    truncateTitleBeforeSpecialChar(title) {
    // 특정 특수 기호가 나타나는 위치를 찾음
    const index = title.search(/[-:/]/); // '-', ':', '/' 중 첫 번째 문자의 인덱스

    // 특수 기호가 없으면 전체 제목을 반환하고, 있으면 그 이전까지 반환
    return index === -1 ? title : title.slice(0, index);
    },

    // 오른쪽 클릭 시 컨텍스트 메뉴 표시
    showContextMenu(event, book) {
      this.selectedBook = book; // 선택된 책 저장
      this.contextMenuX = event.clientX; // 클릭한 위치의 X 좌표
      this.contextMenuY = event.clientY; // 클릭한 위치의 Y 좌표
      this.contextMenuVisible = true; // 메뉴 표시
    },

    // 책 정보 뷰로 이동
    viewBookInfo() {
      if (this.selectedBook && this.selectedBook.isbn) {
        this.$router.push({
          name: 'BookDetails',
          params: { isbn: this.selectedBook.isbn } 
        });
      } else {
        console.error('isbn이 존재하지 않습니다:', this.selectedBook);
      }
      this.contextMenuVisible = false;
    },

    // 클릭 외부 시 메뉴 닫기
    closeContextMenu() {
      this.contextMenuVisible = false;
    },

    // 특정 사용자의 책장 불러오기 (책장 목록 조회 API)
    async fetchBookshelves() {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user ? user.userId : null; // userId를 가져옵니다.

      try {
        const response = await axios.get(`/api/bookshelf/${userId}`); // userId를 URL에 포함
        this.bookshelves = response.data.result; // result 필드를 사용하여 책장과 책 정보를 포함한 배열로 설정
      } catch (error) {
        console.error('책장 목록 조회 실패:', error);
      }
    },

    // 책장 생성 API
    async addBookshelf() {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user ? user.userId : null;  // userId를 가져옵니다.

      if (!this.newBookshelfNameForModal.trim()) {
        alert("책장 이름을 입력해 주세요.");
        return;
      }

      try {
        const response = await axios.post('/api/bookshelf/create', {
          userId: userId,
          bookshelfName: this.newBookshelfNameForModal,
        });

        if (response.data.isSuccess) { // 응답 상태를 isSuccess로 확인
          alert(`${this.newBookshelfNameForModal} 책장이 추가되었습니다!`); // 알림 메시지
          
          // 책장 목록을 다시 불러옵니다.
          await this.fetchBookshelves(); 

          this.newBookshelfNameForModal = "";
          this.isAddBookshelfModalOpen = false; // 모달 닫rl
        } else {
          alert("책장 추가 실패: " + response.data.message);
        }
      } catch (error) {
        console.error("책장 추가 중 오류 발생:", error);
      }
    },

    toggleRenameMode() {
      if (this.currentBookshelf === null) {
        alert("책장을 먼저 선택해주세요.");
        return;
      }

      if (this.isRenaming) {
        this.renameBookshelf();  // 이름 변경 모드에서 저장 진행
      } else {
        // 이름 변경 모드 시작
        const shelf = this.bookshelves.find(shelf => shelf.bookshelfId === this.currentBookshelf);
        if (shelf) {
          this.newBookshelfName = shelf.bookshelfName; // 현재 선택된 책장 이름으로 초기화
        }
      }
      this.isRenaming = !this.isRenaming; // 모드 토글
    },
    
    // 책장 이름 변경 API
    async renameBookshelf() {
      if (!this.currentBookshelf) return; // 선택된 책장이 없을 경우 처리
      if (!this.newBookshelfName.trim()) {
        alert("새 이름을 입력해 주세요.");
        return; // 새 이름이 비어있을 경우 처리
      }

      // bookshelfId를 숫자형으로 변환
      const bookshelfId = Number(this.currentBookshelf);

      // 요청 데이터 확인
      console.log("Request body:", {
        bookshelfId: bookshelfId, // 수정할 책장 ID
        bookshelfName: this.newBookshelfName, // 새 책장 이름
      });

      try {
        const response = await axios.patch("/api/bookshelf/edit", {
          bookshelfId: bookshelfId, // 수정할 책장 ID
          bookshelfName: this.newBookshelfName, // 새 책장 이름
        });

        if (response.data.isSuccess) {
          alert("책장 이름이 수정되었습니다!");
          await this.fetchBookshelves(); // 변경된 데이터 다시 가져오기
          this.isRenaming = false; // 이름 변경 모드 종료
          this.newBookshelfName = ""; // 입력 필드 초기화
        } else {
          alert("책장 이름 수정 실패: " + response.data.message);
        }
      } catch (error) {
        console.error('책장 이름 수정 실패:', error);
        alert("책장 이름 수정 중 오류가 발생했습니다.");
      }
    },

    // 책장 삭제 API
    async deleteBookshelf() {
      if (!this.selectedBookshelf) return; // 선택된 책장이 없을 경우 처리
      
      if (!confirm('정말 이 책장을 삭제하시겠습니까?')) return;

      try {
        const response = await axios.delete(`/api/bookshelf/delete/${this.selectedBookshelf}`);

        if (response.data.isSuccess) { // isSuccess로 확인
          alert("책장이 삭제되었습니다!");
          this.fetchBookshelves(); // 변경된 데이터 다시 가져오기
        } else {
          alert("책장 삭제 실패: " + response.data.message);
        }
      } catch (error) {
        console.error('책장 삭제 실패:', error);
      }
    },

    selectBookshelf() {
      this.selectedBookshelf = this.currentBookshelf; // 현재 선택된 책장 ID를 저장
    },
    openAddBookshelfModal() {
      this.isAddBookshelfModalOpen = true;
    },
    closeAddBookshelfModal() {
      this.isAddBookshelfModalOpen = false;
      this.newBookshelfNameForModal = "";
    },
    openSidebar() {
      this.isSidebarOpen = true;
    },
    closeSidebar() {
      this.isSidebarOpen = false;
      this.manualTitle = "";
      this.isbn = "";
    },

    // 추천받기 모달 열기
    openRecommendationModal() {
      this.isRecommendationModalOpen = true;
    },

    // 추천받기 모달 닫기
    closeRecommendationModal() {
      this.isRecommendationModalOpen = false;
    },

    closeAdditionalRatingModal(){
      this.isAdditionalRatingModalOpen = false;
    },

    setRecommendationType(type) {
      this.recommendationType = type;
    },

     // 내 취향 기반 추천 (책장 없이)
    async recommendPreference() {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.userId;

      if (!userId) {
        console.error("userId가 유효하지 않습니다.");
        return;
      }

      this.isLoading = true;

      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      try {
        const response = await axios.get(`/api/recommend/${userId}/genre`, {
          signal: this.abortController.signal,
        });

        if (response.data.isSuccess) {
          this.recommendations = response.data.result;
          this.isAdditionalRatingModalOpen = true; 
          this.closeRecommendationModal();
        } else {
          console.error("추천받기 실패:", response.data.message);
          alert("추천받기 실패: " + response.data.message);
        }
      } catch (error) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          console.log("추천 요청이 취소되었습니다.");
        } else {
          console.error("추천받기 오류:", error);
          alert("추천 중 오류가 발생했습니다.");
        }
      } finally {
        this.isLoading = false;
      }
    },

    // 빠른 통합 추천
    async recommendQuick() {
      this.isLoading = true;

      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      try {
        const response = await axios.get(`/api/recommend/total/${this.selectedBookshelf}`, {
          signal: this.abortController.signal,
        });

        if (response.data.isSuccess) {
          this.recommendations = response.data.result;
          this.isAdditionalRatingModalOpen = true; 
          this.closeRecommendationModal();
        } else {
          console.error("추천받기 실패:", response.data.message);
          alert("추천받기 실패: " + response.data.message);
        }
      } catch (error) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          console.log("추천 요청이 취소되었습니다.");
        } else {
          console.error("추천받기 오류:", error);
          alert("추천 중 오류가 발생했습니다.");
        }
      } finally {
        this.isLoading = false;
      }
    },

    // AI 기반 키워드 정밀 추천 API
    async recommendAI() {
      this.isLoading = true;

      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      try {
        const response = await axios.get(`/api/recommend/total/${this.selectedBookshelf}`, {
          signal: this.abortController.signal,
        });

        if (response.data.isSuccess) {
          this.recommendations = response.data.result;
          this.isAdditionalRatingModalOpen = true; 
          this.closeRecommendationModal();
        } else {
          console.error("추천받기 실패:", response.data.message);
          alert("추천받기 실패: " + response.data.message);
        }
      } catch (error) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          console.log("추천 요청이 취소되었습니다.");
        } else {
          console.error("추천받기 오류:", error);
          alert("추천 중 오류가 발생했습니다.");
        }
      } finally {
        this.isLoading = false;
      }
    },

    // 검색된 책을 책장에 넣는 작업
    async selectBook(book) {
      this.selectedBook = book; // 선택한 책 정보를 저장
      this.showConfirmModal = true; // 모달 표시
    },

    async selectRating(book) {
      this.selectedRating = book;
      this.showConfirmModal = true;
    },

    confirmAddBook() {
      if (!this.currentBookshelf) {
        alert("책장을 먼저 선택해주세요.");
        return;
      }

      // 선택된 책장의 책 개수 확인
      const currentBookshelfBooks = this.currentBookshelfBooks; // 현재 책장에 있는 책 목록
      if (currentBookshelfBooks.length >= 10) {
        alert("한 책장에는 최대 10권의 책만 추가할 수 있습니다.");
        return; // 10권 이상일 경우 추가하지 않음
      }

      try {
        // API 요청: 선택한 책의 ISBN을 이용해 책장에 추가
        axios.post(`/api/bookshelf/${this.currentBookshelf}/register`, null, {
          params: { isbn13: this.selectedBook.isbn } // this.selectedBook 사용
        }).then(() => {
          this.fetchBookshelves(); 
          alert(`'${this.selectedBook.title}' 책이 책장에 추가되었습니다.`);
          this.showConfirmModal = false; // 모달을 닫습니다.
        });
      } catch (error) {
        console.error('책 추가 실패:', error);
        alert("책 추가 중 오류가 발생했습니다.");
      }
    },

    cancelAddBook() {
      this.showConfirmModal = false; // 모달 닫기
    },

    // 책장 검색 쪽수수
    changePage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
    },

    setRegisterType(type) {
      this.registerType = type;
    },

    // 알라딘 도서 검색 API (제목 검색)
    async searchManual() {
      try {
        const response = await axios.get(`/api/books/search`, {
          params: { query: this.manualTitle },
        });

        if (response.data.books.length === 0) {
          alert("검색 결과가 없습니다.");
        }

        this.searchResults = response.data.books.map(book => ({
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          isbn: book.isbn,
          cover: book.cover,
        }));
        this.currentPage = 1; // 검색 후 페이지를 1로 초기화
      } catch (error) {
        console.error("책 검색 오류:", error);
      }
    },

    // 알라딘 도서 검색(ISBN)
    async searchISBN() {
      try {
        const response = await axios.get(`/api/books/search`, {
          params: { query: this.isbn },
        });

        if (response.data.books.length === 0) {
          alert("검색 결과가 없습니다.");
        }

        const book = response.data.books[0];
        this.searchResults = [{
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          isbn: book.isbn,
          cover: book.cover,
        }];
        this.currentPage = 1; // 검색 후 페이지를 1로 초기화
      } catch (error) {
        console.error("ISBN 검색 오류:", error);
      }
    },

    openFileInput() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';  // 이미지 파일만 선택
      fileInput.click();
      
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
          console.log("첨부된 파일:", file);
        }
      });
    },
    openCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => {
            console.log("카메라가 열렸습니다.");
          })
          .catch((err) => {
            console.error("카메라 연결 실패:", err);
          });
      } else {
        alert("모바일에서만 지원됩니다.");
      }
    },

    // 책장 편집 모드 토글
    toggleEditMode() {
      this.isEditing = !this.isEditing;
    },

    // 책 삭제 메서드
    async removeBook(book) {
      if (confirm(`'${book.title}' 책을 삭제하시겠습니까?`)) {
        try {
          const response = await axios.delete(`/api/bookshelf/delete/book/${this.selectedBookshelf}/${book.bookId}`, {
          });

          if (response.data.isSuccess) {
            alert(`${book.title}이(가) 삭제되었습니다.`);
            // 책장 목록 업데이트
            this.fetchBookshelves();
          } else {
            alert("책 삭제 실패: " + response.data.message);
          }
        } catch (error) {
          console.error("책 삭제 중 오류 발생:", error);
        }
      }
    },

    // 컨텍스트메뉴에서 책 삭제
    async removeBookFromContextMenu() {
      if (this.selectedBook && confirm(`'${this.selectedBook.title}' 책을 삭제하시겠습니까?`)) {
        try {
          const response = await axios.delete(`/api/bookshelf/delete/book/${this.selectedBookshelf}/${this.selectedBook.bookId}`);

          if (response.data.isSuccess) {
            alert(`${this.selectedBook.title}이(가) 삭제되었습니다.`);
            // 책장 목록 업데이트
            this.fetchBookshelves();
          } else {
            alert("책 삭제 실패: " + response.data.message);
          }
        } catch (error) {
          console.error("책 삭제 중 오류 발생:", error);
        }
      }
    },

  }
};


</script>

<style src="../css/mybooks.css"></style>