<script lang="ts">
    import CustomizableCheckbox from "./CustomizableCheckbox.svelte";


    // 프론트 관련 변수
    let { name } = $props();
    let enableConfigThinking:boolean = $state(false);

    // AI 관련 변수들
    const providers: Record<string, string[]> = {
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
    };
    let modelTypeKey:string = $state('');

    // 즉시 실행함수 웹페이지 로드 때 불러옴.
    (async function getOllamaModels() {
        try {
            const resp = await fetch('http://localhost:11434/api/tags');
            const data = await resp.json() as { models: { name:string }[]};
            providers.ollama = data.models.map(m => m.name);
        } catch(er) {
            console.log("ollama의 모델 타입을 불러오는데 실패했습니다. ollama가 작동되고 있는지 확인해주세요.");
        }
    }());
</script>

<div class="main_container">
    <p>{name} :</p>
    <div class="input_container">
        <select name="ai_selector" id="model" onchange={(e:Event) => {
            const target = e.target as HTMLSelectElement;
            modelTypeKey = target.value;
        }}>
            <option value="none" disabled selected>-- 선택해주세요 --</option>
            {#each Object.keys(providers) as key}
                <option value={key}>{key}</option>
            {/each}
        </select>
        {#if modelTypeKey.length !== 0}
        <select name="model_type_selector" id="model_version">
             {#each providers[modelTypeKey] as value}
                <option value={value}>{value}</option>
             {/each}
        </select>
        {/if}
        {#if modelTypeKey === 'claude' || modelTypeKey === 'gemini'}
        <div class="extend_thinking_container">
            <p>Extend Thinking 활성화 : </p>
            <CustomizableCheckbox name="extended_thinking" id="extendedThinking" bind:checked={enableConfigThinking}>
                {#snippet display(enableConfigThinking)}
                    <div class="checkbox_display">
                        <label for="extendedThinking">
                            {#if enableConfigThinking}<span>✔</span>
                            {:else} <span>✖</span>
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

.main_container {
    position: relative;
    width: fit-content;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 5px;
}

p {
    width: max-content;
}

.input_container {
    display: flex;
    flex-direction: column;
    width: 16rem;
    padding: 10px;
}

.input_container select {
    position: relative;
    width: 100%;
}

.extend_thinking_container {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: left;
    padding: 5px;
    gap: 10px;
}

.checkbox_display {
    width: 2em;
    height: 2em;
    background-color: #262e4c;
    border-radius: 1em;
    display: flex;
    justify-content: center;
    align-items: center;
}

.checkbox_display label span {
    color: #b199db;
}

</style>