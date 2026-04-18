<script lang="ts">
    import type { SkillType } from "../types/types";

    export let skills:SkillType[];

    function clickAddBtn() {
        skills.push({name:'', value:0});
        //렌더링
        skills = skills;
    }

    function clickDelBtn(skill:SkillType) {
        skills = skills.filter((ar) => ar.name !== skill.name);
    }
</script>

<main>
    <div class="align_center flex-col relative p-[5px] gap-[5px]">
        {#each skills as skill}
            <div class="flex flex-row mx-2.5 p-[5px] gap-2.5">
	            <input class="rounded-[15px] min-h-[20px] p-[5px] text-center w-[180px]" type='text' bind:value={skill.name} />
				<input class="rounded-[15px] min-h-[20px] p-[5px] text-center w-[90px]" type='number' bind:value={skill.value} />
                <button type="button" class="del_btn" on:click={() => {clickDelBtn(skill)}}>×</button>
            </div>
        {/each}    
		<button type="button" class="add_btn relative" on:click={() => {clickAddBtn()}}>+</button>
    </div>
</main>

<style>

button {
    background-color: #b199db;
    width: 30px;
    height: 30px;
    border-radius: 30px;
    font-size: 18px;
    border: none;
    margin: 5px;
    font-weight: bold;
}

/* Chrome 브라우저 */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
    margin: 0; 
    -webkit-appearance: none;
}

/* Firefox 전용 - 일반 -moz-appearance는 기존 appearance 속성에 포함됨. */
input[type="number"] {
    appearance: none;
}

.add_btn {
    width: 100%;
}

</style>