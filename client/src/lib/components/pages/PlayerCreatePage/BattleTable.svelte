<!-- 
    1. tbody의 내용은 props를 통해서 전달받는다.
-->
<script lang="ts">
    import type { WeaponDataType } from "../../../types/types";

    const { weaponData }:{
        weaponData:WeaponDataType[]
    } = $props();
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
                <td rowspan="2">공격 횟수</td>
                <td>탄약</td>
                <td>고장</td>
            </tr>
        </thead>
        <tbody>
            {#each weaponData as item}
                <tr>
                    <td>{item.name}</td>
                    <td>{item.skill}</td>
                    <td>{item.roll}</td>
                    <td>{item.applyDamage}</td>
                    <td>{item.frequency}</td>
                    <td>{item.distance}</td>
                    <td>{item.frequency}</td>
                    <td>{item.leftBullet}</td>
                    <td>{item.broken}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>

</style>