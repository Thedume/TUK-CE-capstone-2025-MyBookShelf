<template>
  <div class="community-container">
    <!-- 게시판 선택 & 보기 옵션 -->
    <div class="board-header">
      <select v-model="selectedBoard" @change="fetchPosts">
        <option value="FREE">자유 게시판</option>
        <option value="NOTICE">공지사항</option>
        <option value="QNA">Q&A</option>
      </select>

      <div class="list-options">
        <label>보기:</label>
        <select v-model="pageSize" @change="fetchPosts">
          <option value="10">10개씩</option>
          <option value="30">30개씩</option>
        </select>
      </div>
    </div>

    <!-- 게시글 목록 -->
    <table class="post-table">
      <thead>
        <tr>
          <th>번호</th>
          <th>제목</th>
          <th>작성자</th>
          <th>작성일</th>
          <th>좋아요</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="post in posts" :key="post.id" @click="viewPost(post.id)">
          <td>{{ post.id }}</td>
          <td class="post-title">{{ post.title }}</td>
          <td>{{ post.authorName }}</td>
          <td>{{ formatDate(post.createdAt) }}</td>
          <td>{{ post.likeCount || 0 }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 글쓰기 버튼 -->
    <div class="write-btn-wrapper">
      <button @click="toggleWriteForm">✏️ 글쓰기</button>
    </div>

    <!-- 글쓰기 폼 -->
    <div v-if="showWriteForm" class="write-form-modal">
      <div class="write-form-content">
        <h3>✍️ 새 글 작성</h3>
        <input v-model="newPost.title" placeholder="제목을 입력하세요" />
        <textarea v-model="newPost.content" placeholder="내용을 입력하세요"></textarea>
        <label class="anonymous-option">
          <input type="checkbox" v-model="newPost.isAnonymous" /> 익명으로 작성
        </label>
        <div class="write-actions">
          <button class="submit-btn" @click="submitPost">등록</button>
          <button class="cancel-btn" @click="toggleWriteForm">취소</button>
        </div>
      </div>
    </div>

    <!-- 게시글 상세 모달 -->
    <div v-if="selectedPost" class="modal">
      <div class="modal-content">
        <!-- 수정 모드 -->
        <div v-if="editingPost" class="edit-form-content">
          <h3>✏️ 게시글 수정</h3>
          <input v-model="editingPost.title" placeholder="제목을 입력하세요" class="input-field"/>
          <textarea v-model="editingPost.content" placeholder="내용을 입력하세요" class="textarea-field"></textarea>
          <div class="edit-actions">
            <button class="submit-btn" @click="updatePost">저장</button>
            <button class="cancel-btn" @click="cancelEditPost">취소</button>
          </div>
        </div>
        <div v-else>
          <h3>{{ selectedPost.title }}</h3>
          <p class="post-meta">
            작성자: {{ selectedPost.authorName }} | {{ formatDate(selectedPost.createdAt) }}
          </p>
          <p>{{ selectedPost.content }}</p>

          <div class="post-actions">
            <button @click="toggleLike(selectedPost.id)">❤️ {{ likeCount }}</button>
            <button @click="startEditPost">수정</button>
            <button @click="deletePost(selectedPost.id)">삭제</button>
          </div>
        </div>

        <!-- 댓글 영역 -->
        <div class="comments">
          <h4>댓글</h4>
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <strong>{{ comment.authorName }}</strong> ({{ formatDate(comment.createdAt) }})
            <div v-if="editingComment && editingComment.id === comment.id">
              <textarea v-model="editingComment.content"></textarea>
              <div class="comment-actions">
                <button @click="updateComment">저장</button>
                <button @click="cancelEdit">취소</button>
              </div>
            </div>
            <div v-else>
              <p>{{ comment.content }}</p>
              <div class="comment-actions">
                <button @click="startEditComment(comment)">수정</button>
                <button @click="deleteComment(comment.id)">삭제</button>
              </div>
            </div>
          </div>

          <!-- 댓글 작성 -->
          <div class="comment-form">
            <textarea v-model="newComment.content" placeholder="댓글 입력"></textarea>
            <label class="anonymous-option">
              <input type="checkbox" v-model="newComment.isAnonymous" /> 익명
            </label>
            <button @click="submitComment(selectedPost.id)">등록</button>
          </div>
        </div>

        <button class="close-btn" @click="closeModal">닫기</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

axios.defaults.baseURL = 'http://localhost:8081';

export default {
  name: "CommunityView",
  data() {
    return {
      selectedBoard: "FREE",
      pageSize: 10,
      posts: [],
      showWriteForm: false,
      newPost: {
        title: "",
        content: "",
        isAnonymous: false,
        boardType: "FREE"
      },
      selectedPost: null,
      comments: [],
      newComment: {
        content: "",
        isAnonymous: false
      },
      editingPost: null,
      editingComment: null,
      likeCount: 0
    };
  },
  methods: {
    async fetchPosts() {
      try {
        const res = await axios.get(`/api/posts?boardType=${this.selectedBoard}`);
        if (res.data.isSuccess) {
          this.posts = res.data.result || res.data.response || [];
        }
      } catch (error) {
        console.error("fetchPosts 오류:", error);
      }
    },
    async viewPost(id) {
      const res = await axios.get(`/api/posts/${id}`);
      if (res.data.isSuccess) {
        this.selectedPost = res.data.result;
        this.fetchComments(id);
        this.fetchLikeCount(id);
      }
    },
    async submitPost() {
      try {
        this.newPost.boardType = this.selectedBoard;
        const res = await axios.post("/api/posts", this.newPost);
        if (res.data.isSuccess) {
          await this.fetchPosts();
          this.toggleWriteForm();
          this.newPost = { title: "", content: "", isAnonymous: false, boardType: this.selectedBoard };
        }
      } catch (error) {
        console.error("submitPost 오류:", error);
      }
    },
    startEditPost() {
    this.editingPost = { ...this.selectedPost }; // 복사본 생성
  },
  async updatePost() {
    try {
      const updated = {
        title: this.editingPost.title,
        content: this.editingPost.content,
        isAnonymous: this.editingPost.isAnonymous,
        boardType: this.editingPost.boardType,
      };
      const res = await axios.put(`/api/posts/${this.editingPost.id}`, updated);
      if (res.data.isSuccess) {
        this.selectedPost = res.data.response;
        this.editingPost = null;
        this.fetchPosts();
      }
    } catch (err) {
      console.error("updatePost 오류:", err);
    }
  },
  cancelEditPost() {
    this.editingPost = null;
  },
    async deletePost(id) {
      if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
      const res = await axios.delete(`/api/posts/${id}`);
      if (res.data.isSuccess) {
        this.fetchPosts();
        this.closeModal();
      }
    },
    // 좋아요 토글
    async toggleLike(postId) {
      try {
        const res = await axios.post(`/api/posts/${postId}/like`);
        alert(res.data); // "좋아요 등록됨" 또는 "좋아요 취소됨"
        await this.fetchLikeCount(postId); // 최신 좋아요 수 다시 불러오기
      } catch (error) {
        console.error("좋아요 토글 실패:", error);
      }
    },

    // 좋아요 수 조회
    async fetchLikeCount(postId) {
      try {
        const res = await axios.get(`/api/posts/${postId}/likes/count`);
        this.likeCount = res.data; // 숫자 그대로 들어옴
      } catch (error) {
        console.error("좋아요 수 조회 실패:", error);
      }
    },
    /* async toggleLike(postId) {
      await axios.post(`/api/posts/${postId}/like`);
      this.fetchLikeCount(postId);
    },
    async fetchLikeCount(postId) {
      const res = await axios.get(`/api/posts/${postId}/likes/count`);
      this.likeCount = res.data;
    },*/
    async fetchComments(postId) {
      const res = await axios.get(`/api/posts/${postId}/comments`);
      this.comments = res.data;
    },
    async submitComment(postId) {
      await axios.post(`/api/posts/${postId}/comments`, this.newComment);
      this.fetchComments(postId);
      this.newComment.content = "";
    },
    startEditComment(comment) {
      this.editingComment = { ...comment };
    },
    async updateComment() {
      const updated = { content: this.editingComment.content, isAnonymous: this.editingComment.isAnonymous };
      await axios.put(`/api/posts/comments/${this.editingComment.id}`, updated);
      this.fetchComments(this.selectedPost.id);
      this.editingComment = null;
    },
    cancelEdit() {
      this.editingComment = null;
    },
    async deleteComment(commentId) {
      if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) return;
      await axios.delete(`/api/posts/comments/${commentId}`);
      this.fetchComments(this.selectedPost.id);
    },
    toggleWriteForm() {
      this.showWriteForm = !this.showWriteForm;
    },
    closeModal() {
      this.selectedPost = null;
      this.comments = [];
    },
    formatDate(date) {
      return new Date(date).toLocaleString();
    }
  },
  mounted() {
    this.fetchPosts();
  }
};
</script>

<style scoped>
.community-container {
  max-width: 900px;
  margin: auto;
  font-family: 'Segoe UI', sans-serif;
}
.board-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}
.post-table {
  width: 100%;
  border-collapse: collapse;
}
.post-table th, .post-table td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  text-align: center;
}
.post-title {
  text-align: left;
  cursor: pointer;
  color: #0073e6;
}
.write-btn-wrapper {
  text-align: right;
  margin: 15px 0;
}
.write-btn-wrapper button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
}
.write-btn-wrapper button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* 글쓰기 모달 */
.write-form-modal {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
}
.write-form-content {
  background: #fff;
  padding: 25px;
  border-radius: 12px;
  width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  animation: fadeIn 0.3s ease;
}
.write-form-content h3 {
  margin-bottom: 15px;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}
.write-form-content input,
.write-form-content textarea {
  width: 96%;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  transition: border-color 0.3s;
}
.write-form-content textarea {
  height: 300px;
}
.write-form-content input:focus,
.write-form-content textarea:focus {
  border-color: #ff7e5f;
  outline: none;
}
.anonymous-option {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  color: #555;
}
.anonymous-option input[type="checkbox"] {
  width: auto;     /* 기본 크기만 차지 */
  flex-shrink: 0;  /* 줄어들지 않게 고정 */
}
.write-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.submit-btn {
  background-color: #ff7e5f;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s;
}
.submit-btn:hover {
  background-color: #e96c50;
}
.cancel-btn {
  background-color: #ccc;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* 수정 모드 스타일 */
.edit-form-content {
  background: #fafafa;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #ddd;
  margin-bottom: 20px;
}
.edit-form-content h3 {
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}
.input-field,
.textarea-field {
  width: 100%;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  transition: border-color 0.3s;
}
.textarea-field {
  min-height: 200px;
}
.input-field:focus,
.textarea-field:focus {
  border-color: #ff7e5f;
  outline: none;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 댓글 */
.comment-item {
  border-bottom: 1px solid #ddd;
  padding: 8px 0;
}
.comment-actions button {
  margin-right: 6px;
  font-size: 12px;
  background: none;
  border: none;
  color: #0073e6;
  cursor: pointer;
}
.comment-actions button:hover {
  text-decoration: underline;
}

/* 게시글 상세 모달 */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
  animation: fadeIn 0.3s ease;
}
.modal-content {
  background: #fff;
  padding: 24px 28px;
  border-radius: 14px;
  width: 650px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease;
}
.modal-content h3 {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}
.post-meta {
  font-size: 13px;
  color: #888;
  margin-bottom: 18px;
}
.modal-content p {
  font-size: 16px;
  color: #444;
  line-height: 1.6;
  margin-bottom: 20px;
  white-space: pre-line;
}

/* 게시글 액션 버튼 */
.post-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 20px;
}
.post-actions button {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}
.post-actions button:hover {
  transform: translateY(-1px);
}
.post-actions button:nth-child(1) { background: #ff4d4d; color: #fff; } /* ❤️ 좋아요 */
.post-actions button:nth-child(2) { background: #4caf50; color: #fff; } /* 수정 */
.post-actions button:nth-child(3) { background: #f44336; color: #fff; } /* 삭제 */
.post-actions button:nth-child(1):hover { background: #e53935; }
.post-actions button:nth-child(2):hover { background: #43a047; }
.post-actions button:nth-child(3):hover { background: #d32f2f; }

/* 닫기 버튼 */
.close-btn {
  background: #999;
  color: #fff;
  padding: 6px 14px;
  border: none;
  margin-top: 20px;
  border-radius: 6px;
  cursor: pointer;
}
.close-btn:hover {
  background: #777;
}

/* 댓글 작성 폼 */
.comment-form {
  margin-top: 15px;
}
.comment-form textarea {
  width: 100%;
  min-height: 60px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
}
.comment-form button {
  background: #ff7e5f;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.comment-form button:hover {
  background: #e96c50;
}

/* 애니메이션 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>