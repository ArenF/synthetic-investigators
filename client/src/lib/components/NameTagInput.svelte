
<script lang="ts">
    import type { InputTypeAttr } from "../types/types";


    let { name, placeholder, value, type = 'text' }:
        { name:string, placeholder?: string | null, value?: string | null, type?:InputTypeAttr} = $props();
    
</script>

<div>
    <p>{name} :</p>
    <input type={type} placeholder={placeholder} value={value} />
</div>

<style>
    div {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
    }

    p {
        padding: 0px 5px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
    }

    input {
        padding: 5px 5px;
        
    }
</style>