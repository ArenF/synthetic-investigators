<script lang="ts">
    import type { ChangeEventHandler } from "svelte/elements";

    let { name, value, defaultVal = 0, onChange = () => {} }:{
        name:string,
        value:number,
        defaultVal?:number,
        onChange?:ChangeEventHandler<HTMLInputElement>
    } = $props();
    
    let realVal:number = $derived(defaultVal + value);
    let harder:number = $derived(Math.floor(realVal/2));
    let extreme:number = $derived(Math.floor(realVal/5));

</script>

<div>
    <p class="name">{name} :</p>
    <p class="display display_default">{defaultVal}</p>
    <input type="number" name="cell-{name}" bind:value={value} onchange={onChange}/>
    <input type="number" disabled bind:value={realVal}/>
    <p class="display display_harder">{harder}</p>
    <p class="display display_extreme">{extreme}</p>
</div>

<style>

div {
    position: relative;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: left;
    align-items: center;
    gap: 0.1em;
    padding: 0.2em;
    break-inside: avoid;
}

div * {
    padding: 0.5em;
}

.name {
    color: var(--sea-text);
    min-width: 8em; /* 가장 긴 스킬명에 맞춤 */
    text-align: right;
    white-space: nowrap;
    font-weight: bold;
    font-size: large;
}

input[type="number"] {
    display: flex;
    font-size: 1rem;
    width: 2.5em;
    height: 2.5em;
    padding: 0em;

    /* Firefox */
    appearance: textfield;
    text-align: center;
}

input[type="number"]:disabled {
    color: darkgray;
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.display {
    width: 2.5em;
    height: 2.5em;
    border-radius: 0.5em;
    text-align: center;
}

.display_default {
    background-color: var(--sea-text);
    border: 1px solid var(--sea-text-light);
}

.display_harder {
    background-color: var(--galaxy-muted);
    border: 1px solid var(--galaxy-accent);
}

.display_extreme {
    background-color: var(--sea-panel);
    border: 1px solid var(--sea-text);
}

</style>