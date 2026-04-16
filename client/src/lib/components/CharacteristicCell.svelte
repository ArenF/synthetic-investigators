<script lang="ts">
    import { untrack } from "svelte";


    let { name, startVal = 0 }:{
        name:string,
        startVal?:number
    } = $props();

    // untrack: startVal은 서버에서 내려오는 초기값. prop 변경에 반응하지 않고 초기값만 캡처하는 게 의도
    let value = $state(untrack(() => startVal));

    // CoC 7e 일반 판정값 = floor(능력치 / 2)
    let normalJudge:number = $derived(Math.floor(value / 2));
    // CoC 7e 극단 판정값 = floor(능력치 / 5)
    let extremeJudge:number = $derived(Math.floor(value / 5));

</script>

<div>
    <p>{name}</p>
    <input type="number" placeholder="0" bind:value={value}/>
    <div class="display_judge_container">
        <!-- $derived는 읽기 전용이라 bind:value 불가 → 단방향 value= 사용 -->
        <input type="number" readonly value={normalJudge}>
        <input type="number" readonly value={extremeJudge}>
    </div>
</div>

<style>

div {
    padding: 5px;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
}

p {
    border: 1px solid red;
    margin: 0 0.25em 0 0;
    width: 1.5em;
    height: 4em;
    font-size: 22px;
    font-weight: bold;
    writing-mode: vertical-lr;
    letter-spacing: 5px;
    text-align: center;
}

input[type="number"] {
    width: 5rem;
    height: 5rem;
    font-size: 24px;

    /* Firefox */
    appearance: textfield;
    text-align: center;
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.display_judge_container {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.display_judge_container input {
    width: 2.4rem;
    height: 2.4rem;
    font-size: 16px;
}

</style>