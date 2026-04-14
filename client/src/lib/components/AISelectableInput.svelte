<script lang="ts">
    import { isArrayLiteralExpression } from "typescript";

    let { name } = $props();
    
    const providers: Record<string, string[]> = {
        claude: [
            'claude-opus-4-6',
            'claude-sonnet-4-6',
            'claude-haiku-4-5-20251001',
        ],
        gemini: [
            'gemini-2.0-flash',
            'gemini-1.5-pro',
        ],
        openai: [
            'gpt-4o',
            'gpt-4o-mini',
        ],
        ollama: [],
    };
    let modelTypeKey:string = $state('');

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
        
    </div>
</div>

<style>

.main_container {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}

p {
    width: max-content;

}

.input_container {
    display: flex;
    flex-direction: column;
    width: 16rem;
}

.input_container select {
    width: 100%;
    margin: 10px;
}

</style>