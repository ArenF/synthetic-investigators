<script lang="ts">
  // 여기서 시작하세요
  // 화면 전환은 $state로 관리하거나 별도 store.ts를 만들어 사용할 수 있습니다
  // WebSocket, API 통신도 자유롭게 구성하세요

</script>

<main class="main min-h-screen flex items-center justify-center bg-bg-base">
  <div class="main_container">
    <div class="clickable_card">
      <p>새 세션 시작</p>
      <p class="decription"></p>
    </div>
  </div>
</main>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  position: relative;
}

.main {
  position: relative;
  justify-content: center;
  align-items: center;
}

.main_container {
  position: relative;
  display: flex;
  flex-direction: row;
}

.clickable_card {

}

.direction {
  
}

</style>
