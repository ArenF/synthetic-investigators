
<script lang="ts">
    import type { InputTypeAttr } from "../types/types";


    let { name, placeholder, value, type = 'text' }:
        { name:string, placeholder?: string | null, value?: string | null, type?:InputTypeAttr} = $props();
    
</script>

<div class="align_center flex-row relative min-w-0 w-full gap-[2.5px]">
    <p>{name} :</p>
    <input class="p-[5px] min-w-0 w-auto" type={type} placeholder={placeholder} value={value} />
</div>

<style>
    p {
        padding: 0px 5px;
        color: white;
        width: max-content;
        font-size: 16px;
        font-weight: bold;
        font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
    }
</style>