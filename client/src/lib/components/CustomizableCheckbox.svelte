<script lang="ts">
    import type { Snippet } from "svelte";
    
    let { name, id, checked = $bindable(false), display }:
    {name:string, id:string, checked?:boolean, display?:Snippet<[boolean]>}
     = $props();

    
</script>

<div>
    <input class="sr_only" type="checkbox" name={name} id={id} onclick={() => {
        console.log(checked);
        checked = !checked;
    }}>
    {#if display}
        {@render display(checked)}
    {/if}
</div>

<style>
    .sr_only {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }
</style>