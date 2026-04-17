
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
        min-width: 0; /* flex 컨텍스트에서 콘텐츠 크기 이하로 수축 허용 (기본값 auto는 수축 불가) */
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 2.5px;
    }

    p {
        padding: 0px 5px;
        color: white;
        width: max-content;
        font-size: 16px;
        font-weight: bold;
        font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
    }

    input {
        padding: 5px 5px;
        min-width: 0;
        width: auto;
    }
</style>