
<script lang="ts">
  // 여기서 시작하세요
  // 화면 전환은 $state로 관리하거나 별도 store.ts를 만들어 사용할 수 있습니다
  // WebSocket, API 통신도 자유롭게 구성하세요
import ClickableCard from "./lib/components/ClickableCard.svelte";
    import GamePlay from "./lib/pages/GamePlayPage.svelte";
    import PlayerCreatePage from "./lib/pages/PlayerCreatePage.svelte";
    import PlayerEditPage from "./lib/pages/PlayerEditPage.svelte";
    import ScenarioCreatePage from "./lib/pages/ScenarioCreatePage.svelte";
    import ScenarioEditPage from "./lib/pages/ScenarioEditPage.svelte";
import type { PageType } from "./lib/types/types";

let page:PageType = $state('Main');

</script>

<main class="main min-h-screen flex items-center justify-center bg-bg-base">
  {#if page === 'Main'}
    <div class="main_container">
    
    <ClickableCard
        title="시나리오 생성"
        description="새로운 시나리오를 생성할 수 있습니다."
        onclick={() => {page = 'ScenarioCreate'}}
      />
      <ClickableCard
        title="시나리오 편집"
        description="기존의 시나리오를 수정/제거 할 수 있습니다."
        onclick={() => {page = 'ScenarioEdit'}}
      />
      <ClickableCard
        title="플레이어 생성"
        description="시나리오에서 활동할 캐릭터들의 설정과 스탯을 설정해보세요! 그들을 활동하게 할 AI도 같이 지정해보세요."
        onclick={() => {page = 'PlayerCreate'}}
      />
      <ClickableCard
        title="플레이어 편집"
        description="기존의 플레이어들의 설정을 변경해보세요!"
        onclick={() => {page = 'PlayerEdit'}}
      />
      <ClickableCard
        title="게임 플레이"
        description="시나리오를 선택하고 플레이어들을 선택해 게임을 시작하세요!"
        onclick={() => {page = 'GamePlay'}}
      />
    </div>
  {:else if page === "GamePlay"}
    <GamePlay/>
  {:else if page === "PlayerCreate"}
    <PlayerCreatePage/>
  {:else if page === "PlayerEdit"}
    <PlayerEditPage/>
  {:else if page === "ScenarioCreate"}
    <ScenarioCreatePage/>
  {:else if page === "ScenarioEdit"}
    <ScenarioEditPage/>
  {/if}
  
</main>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  position: relative;
}

.main {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.main_container {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 1280px;
  justify-content: center;
}


</style>
