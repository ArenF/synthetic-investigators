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
    <div class="flexible_list">
        {#each skills as skill}
            <div class="input_container">
	            <input type='text' bind:value={skill.name} />
				<input type='number' bind:value={skill.value} />
                <button type="button" class="del_btn" on:click={() => {clickDelBtn(skill)}}>×</button>
            </div>
        {/each}    
		<button type="button" class="add_btn" on:click={() => {clickAddBtn()}}>+</button>
    </div>
</main>

<style>
/* global */
input {
	border-radius: 15px;
	width: 80px;
	min-height: 20px;
	padding: 5px;
	text-align: center;
}

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

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
    margin: 0; 
    -webkit-appearance: none;
}

input[type="number"] {
    -moz-appearance: none;
}

.flexible_list {
    position: relative;
    display: flex;
    flex-direction: column;
	justify-content: center;
	align-items: center;
    padding: 5px;
    gap: 5px;
}

.input_container {
    display: flex;
	flex-direction: row;
    margin: 0px 10px;
    padding: 5px;
    gap: 10px;
}

.add_btn {
    position: relative;
    width: 100%;
}

.input_container input {
    width: 180px;
}
.input_container input[type="number"] {
    width: 90px;
}


</style>