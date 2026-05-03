<script lang="ts">
	import BooleanInput from './../../BooleanInput.svelte';
    import type { WeaponDataType } from "../../../types/types";

    let { defaultWeapon = $bindable() }:{
        defaultWeapon:WeaponDataType[]
    } = $props();
    
    const addWeaponTable = () => {
        defaultWeapon.push({
            name:'',
            skill:'근접전(격투)',
            roll:'',
            applyDamage:0,
            distance:0,
            frequency:0,
            leftBullet:0,
            broken: false
        });
        defaultWeapon = defaultWeapon;
    };

</script>

<div class="battle_container">
    <p class="main_title">전투</p>
    <table>
        <thead>
            <tr>
                <td>무기</td>
                <td>기능</td>
                <td>판정</td>
                <td>추가 피해</td>
                <td>사거리</td>
                <td>공격 횟수</td>
                <td>탄약</td>
                <td>고장</td>
            </tr>
        </thead>
        <tbody>
            {#each defaultWeapon as item}
                <tr>
                    <td><input type="text" value={item.name}/></td>
                    <td><input type="text" value={item.skill}/></td>
                    <td><input type="text" value={item.roll}/></td>
                    <td><input type="text" value={item.applyDamage}/></td>
                    <td><input type="text" value={item.distance}/></td>
                    <td><input type="text" value={item.frequency}/></td>
                    <td><input type="text" value={item.leftBullet}/></td>
                    <td><BooleanInput value={item.broken} /></td>
                </tr>
            {/each}
        </tbody>
    </table>
    <button type="button" onclick={(e) => {addWeaponTable()}}>+</button>
</div>

<style>

.battle_container {
    margin-top: 1em;
    min-width: max-content;
    border: 1px solid red;
    padding: 1em;
}

.main_title {
    background-color: var(--sea-deep);
    width: 100%;
    border-radius: 0.5em 0.5em 0em 0em;
}

td {
    text-align: center;
}

thead tr td {
    border: 2px solid var(--galaxy-muted);
    width: 8em;
}

tbody tr td {
    border: 2px solid var(--galaxy-hover);
    background-color: var(--galaxy-bg);
    padding: 0;
    height: 1px; /* height: 100% 자식이 참조할 수 있도록 */
}

tbody tr td input {
    border: none;
    border-radius: 0;
    width: 100%;
    background-color: transparent;
    text-align: center;
}

button {
    background-color: var(--galaxy-bg);
    border: none;
    border-radius: 0em 0em 0.5em 0.5em;
    padding: 0.1em;
    font-size: 1.1em;
    font-weight: bold;
    text-align: center;
    width: 100%;
    transition: all 0.5s ease;
}

button:hover {
    transition: all 0.5s ease;
    background-color: var(--galaxy-hover);
}

</style>