<template>
  <div class="random-books">
    <!-- 광고 슬라이드 -->
    <div class="ad-slide-container" @mouseenter="pauseSlide" @mouseleave="resumeSlide">
      <div class="ad-slide" :style="{ transform: 'translateX(' + (-100 * slideIndex) + '%)'}">

        <!-- 광고 이미지 -->
        <div v-for="(ad, index) in ads" :key="'ad-' + index" class="ad-slide-item" @click="handleAdClick(index)">
          <img :src="ad" alt="광고 이미지" class="ad-img" />
        </div>
      </div>

      <!-- 슬라이드 인디케이터 (동그라미 버튼들) -->
      <div class="slide-indicators">
        <div v-for="(ad, index) in ads" :key="'indicator-' + index" class="indicator" 
          :class="{ active: index === slideIndex }" @click="goToSlide(index)">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import ad1 from '@/assets/ad1.png';
import ad2 from '@/assets/ad2.png';
import ad3 from '@/assets/ad3.png';

export default {
  name: "RandomBooksView",

  data() {
    return {
      randomBooks: [],
      slideIndex: 0,
      ads: [ad1, ad2, ad3],
      slideInterval: null,
    };
  },

  created() {
    this.fetchRandomBooks();
    this.startSlide();  // 슬라이드 시작
  },

  beforeUnmount() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  },

  methods: {
    fetchRandomBooks() {
      axios.get('http://localhost:8081/api/books/random?count=3')
        .then(response => {
          this.randomBooks = response.data.books;
        })
        .catch(error => {
          console.error("랜덤 책 검색 오류:", error);
        });
    },

    nextSlide() {
      this.slideIndex = (this.slideIndex + 1) % this.ads.length;
    },

    startSlide() {
      this.slideInterval = setInterval(this.nextSlide, 5000);
    },

    pauseSlide() {
      if (this.slideInterval) {
        clearInterval(this.slideInterval);
      }
    },

    resumeSlide() {
      this.startSlide();
    },

    goToSlide(index) {
      // 슬라이드 인디케이터 클릭 시 해당 슬라이드로 이동
      this.slideIndex = index;
    },
    
    handleAdClick(index) {
      if (index === 0) {
        this.$router.push({ name: 'MyBooks' });
      } else if (index === 1) {
        this.$router.push({ name: 'Guidelines' });
      } else if (index === 2) {
        this.$router.push({ name: 'Community' });
      } 
    },
  },
};
</script>

<style scoped>
/* 광고 이미지에 마우스를 올렸을 때 효과 */
.ad-img {
  display: block;
  max-width: 100%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer; /* 마우스 커서를 손 모양으로 바꿔줌 */
}

.ad-img:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 1.0);
  position: relative;
  z-index: 1;
}

/* 광고 슬라이드 컨테이너 */
.ad-slide-container {
  position: relative;
  width: 100%;
  overflow: visible;
  margin-top: 30px;
}

/* 광고 슬라이드 스타일 */
.ad-slide {
  display: flex;
  transition: transform 0.5s ease-in-out;
}

.ad-slide-item {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ad-slide-item img {
  max-width: 60%;
  height: auto;
  border-radius: 10px;
}

/* 슬라이드 인디케이터 (동그라미 버튼들) */
.slide-indicators {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.indicator {
  width: 14px;
  height: 14px;
  background-color: rgb(255, 228, 196);
  border-radius: 50%;
  cursor: pointer;
}

.indicator.active {
  width: 25px;              /* 좌우로 늘어남 */
  background-color: #ff2b2b; 
  border-radius: 15px;      /* 둥근 모서리 유지 → 알약 모양 */
}
</style>