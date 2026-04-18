<script lang="ts">
    import { onMount, untrack } from "svelte";
    import CustomizableCheckbox from "./CustomizableCheckbox.svelte";


    // 프론트 관련 변수
    let { name, thinkConfig = false }:{ name:string, thinkConfig?:boolean } 
    = $props();
    // untrack: 서버에서 받은 초기값만 캡처. 이후 사용자가 자유롭게 토글 가능
    let enableThink:boolean = $state(untrack(() => thinkConfig));

    // AI 관련 변수들
    // $state: ollama 목록이 비동기로 업데이트될 때 재렌더링되려면 $state 필요
    let providers = $state<Record<string, string[]>>({
        claude: [
            'claude-opus-4-6',
            'claude-sonnet-4-6',
            'claude-haiku-4-5-20251001',
        ],
        gemini: [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
        ],
        openai: [
            'gpt-4o',
            'gpt-4o-mini',
        ],
        ollama: [],
    });
    let modelTypeKey:string = $state('');

    // ollama 모델 목록은 마운트 시 1회만 로드
    onMount(async () => {
        try {
            const resp = await fetch('http://localhost:11434/api/tags');
            const data = await resp.json() as { models: { name:string }[]};
            providers.ollama = data.models.map(m => m.name);
        } catch(er) {
            console.log("ollama의 모델 타입을 불러오는데 실패했습니다. ollama가 작동되고 있는지 확인해주세요.");
        }
    });

</script>

<div class="align_center flex-row relative w-full">
    <p class="w-max">{name} :</p>
    <div class="flex flex-col w-64 p-2.5">
        <select class="relative w-full" name="ai_selector" id="model" onchange={(e:Event) => {
            const target = e.target as HTMLSelectElement;
            modelTypeKey = target.value;
        }}>
            <option value="none" disabled selected>-- 선택해주세요 --</option>
            {#each Object.keys(providers) as key}
                <option value={key}>{key}</option>
            {/each}
        </select>
        {#if modelTypeKey.length !== 0}
        <select class="relative w-full" name="model_type_selector" id="model_version">
             {#each providers[modelTypeKey] as value}
                <option value={value}>{value}</option>
             {/each}
        </select>
        {/if}
        {#if modelTypeKey === 'claude' || modelTypeKey === 'gemini'}
        <div class="extend_thinking_container">
            <p class="w-max">Extend Thinking 활성화 : </p>
            <CustomizableCheckbox name="extended_thinking" id="extendedThinking" bind:checked={enableThink}>
                {#snippet display(enableThink)}
                    <div class="align_center w-[2em] h-[2em] bg-[#262e4c] rounded-full">
                        <label for="extendedThinking">
                            {#if enableThink}<span class="text-[#b199db]">✔</span>
                            {:else} <span class="text-[#b199db]">✖</span>
                            {/if}
                        </label>
                    </div>
                {/snippet}
            </CustomizableCheckbox>
        </div>
        {/if}
    </div>
</div>

<style>

.extend_thinking_container {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: left;
    padding: 5px;
    gap: 10px;
}

</style>