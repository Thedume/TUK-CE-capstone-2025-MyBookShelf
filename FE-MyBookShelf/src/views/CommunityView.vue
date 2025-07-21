<template>
  <div class="app-layout">
    <Sidebar @select-board="selectedBoard = $event" />

    <div class="main-content">
      <div class="control-bar">
        <Dropdown v-model="sortOrder" :options="['최신순', '정확도순']" />
        <Dropdown v-model="itemsPerPage" :options="[10, 30, 50]" />
      </div>

      <!-- PostList에 클릭 시 이벤트 추가 -->
    <PostList :posts="paginatedPosts" @open-viewer="openPostViewer" />


      <div class="bottom-bar">
        <SearchBar v-model="searchQuery" @search="onSearch" />
        <button @click="showEditor = true" class="write-button">글쓰기</button>
      </div>
    </div>

    <!-- 게시글 작성 모달 -->
    <PostEditor v-if="showEditor" @submit="addPost" @cancel="showEditor = false" />

    <!-- 게시글 상세보기 모달 -->
    <PostViewer
      v-if="showViewer"
      :post="selectedPost"
      @close="closePostViewer"
      @edit="startEditing"
      @delete="deletePost"
    />

    <!-- 게시글 수정 모달 -->
    <PostEditor
      v-if="isEditing"
      :initial-title="selectedPost?.title"
      :initial-content="selectedPost?.content"
      :initial-board="selectedPost?.boardType"
      @submit="submitEdit"
      @cancel="cancelEdit"
    />
  </div>
</template>

<script>
import axios from 'axios';
import Sidebar from '@/components/Sidebar.vue';
import Dropdown from '@/components/Dropdown.vue';
import SearchBar from '@/components/SearchBar.vue';
import PostList from '@/components/PostList.vue';
import PostEditor from '@/components/PostEditor.vue';
import PostViewer from '@/components/PostViewer.vue';

export default {
  components: { Sidebar, Dropdown, SearchBar, PostList, PostEditor, PostViewer },

  data() {
    return {
      sortOrder: '최신순',
      itemsPerPage: 10,
      searchQuery: '',
      selectedBoard: '전체 게시판',
      showEditor: false,  
      allPosts: [],
      showViewer: false,
      selectedPost: null,
      isEditing: false,
    };
  },

  computed: {
    filteredPosts() {
      let posts = this.allPosts;

      if (this.selectedBoard !== '전체 게시판') {
        const boardType = this.getBoardType(this.selectedBoard);
        posts = posts.filter(post => post.boardType === boardType);
      }

      if (this.searchQuery) {
        posts = posts.filter(post => post.title.includes(this.searchQuery));
      }

      if (this.sortOrder === '최신순') {
        posts = posts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      return posts;
    },

    paginatedPosts() {
      return this.filteredPosts.slice(0, this.itemsPerPage);
    }
  },

  methods: {
    getBoardType(name) {
      const map = {
        '자유 게시판': 'FREE',
        '홍보 게시판': 'PROMOTION',
        '정보 게시판': 'INFO',
        '전체 게시판': 'ALL'
      };
      return map[name] || 'ALL';
    },

    async fetchPosts() {
      try {
        const boardType = this.getBoardType(this.selectedBoard);

        const url = boardType === 'ALL'
          ? '/api/posts'
          : `/api/posts?boardType=${boardType}`;

        const res = await axios.get(url);

        if (res.data.isSuccess) {
          this.allPosts = res.data.result;
        } else {
          console.warn('API 응답 실패:', res.data);
        }

      } catch (error) {
        console.error('게시글 목록 불러오기 실패:', error);
      }
    },

        async addPost(newPost) {
      try {
        const res = await axios.post('/api/posts', {
          title: newPost.title,
          content: newPost.content,
          isAnonymous: newPost.isAnonymous,
          boardType: this.getBoardType(this.selectedBoard),
        });

        if (res.data.isSuccess) {
          this.allPosts.unshift(res.data.result);
          this.showEditor = false;
        } else {
          console.warn('게시글 작성 API 응답 실패 (isSuccess: false):', res.data);
          alert('게시글 작성에 실패했습니다: ' + (res.data.message || '알 수 없는 오류'));
        }
      } catch (error) {
        console.error('게시글 작성 요청 실패:', error);

        if (error.response) {
          console.error('오류 응답 데이터:', error.response.data);
          console.error('오류 응답 상태 코드:', error.response.status);
          console.error('오류 응답 헤더:', error.response.headers);
          alert(`게시글 작성 실패: 서버 응답 오류 (${error.response.status})`);
        } else if (error.request) {
          console.error('오류 요청:', error.request);
          alert('게시글 작성 실패: 서버에 연결할 수 없습니다.');
        } else {
          console.error('오류 메시지:', error.message);
          alert('게시글 작성 실패: 요청 설정 오류.');
        }
      }
    },

    onSearch(query) {
      this.searchQuery = query;
    },

    // 게시글 상세보기 열기
    async openPostViewer(postId) {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        if (res.data.isSuccess) {
          this.selectedPost = res.data.result;
          this.showViewer = true;
          this.isEditing = false;
        }
      } catch (error) {
        console.error('게시글 상세조회 실패:', error);
      }
    },

    closePostViewer() {
      this.showViewer = false;
      this.selectedPost = null;
      this.isEditing = false;
    },

    // 수정 버튼 눌렀을 때
    startEditing() {
      this.isEditing = true;
    },

    // 수정 완료 처리
    async submitEdit(editedData) {
      try {
        const res = await axios.put(`/api/posts/${this.selectedPost.id}`, {
          title: editedData.title,
          content: editedData.content,
          boardType: editedData.board,
          isAnonymous: true,
        });

        if (res.data.isSuccess) {
          alert('수정되었습니다.');
          this.isEditing = false;
          this.showViewer = false;
          this.selectedPost = null;
          await this.fetchPosts();
        }
      } catch (error) {
        console.error('게시글 수정 실패:', error);
      }
    },

    cancelEdit() {
      this.isEditing = false;
    },

    // 삭제 처리
    async deletePost(id) {
      if (!confirm('정말 삭제하시겠습니까?')) return;

      try {
        const res = await axios.delete(`/api/posts/${id}`);
        if (res.data.isSuccess) {
          alert('삭제되었습니다.');
          this.showViewer = false;
          this.selectedPost = null;
          await this.fetchPosts();
        }
      } catch (error) {
        console.error('게시글 삭제 실패:', error);
      }
    },
  },

  watch: {
    selectedBoard() {
      this.fetchPosts();
    }
  },

  mounted() {
    this.fetchPosts();
  }
};
</script>

<style scoped>
.app-layout {
  display: flex;
}

.main-content {
  flex: 1;
  padding: 20px;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.bottom-bar {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.write-button {
  background-color: #FFA500;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}
</style>