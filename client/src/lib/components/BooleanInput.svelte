<!-- 

-->
<script lang="ts">
    
    let { value }:{
        value:boolean
    } = $props();

    const changeValue = () => {
        value = !value;
    }

</script>

<div>
    {#if value}
        <button type="button" onclick={() => {changeValue()}}>true</button>
    {:else}
        <button type="button" onclick={() => {changeValue()}}>false</button>
    {/if}
</div>

<style>
div {
    display: contents;
}

button {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    text-align: center;
    font-weight: bold;
    color: white;
    transition: all 0.5s ease;
}

button:hover {
    color: aliceblue;
    background-color: var(--galaxy-hover);
    transition: all 0.5s ease;
}

</style>