
<script lang="ts">
	import BattleTable from './../components/pages/PlayerCreatePage/BattleTable.svelte';
	import NameTagInput from './../components/NameTagInput.svelte';
	import AISelectableInput from '../components/AISelectableInput.svelte';
    import CharacteristicCell from '../components/CharacteristicCell.svelte';
    import SelectableSkillList from '../components/pages/PlayerCreatePage/SelectableSkillList.svelte';

</script>

<main class="w-full self-start max-h-screen overflow-y-auto flex justify-center">
    <form action="method" class="align_center justify-start flex-col w-[320px] py-8">
        <div class="align_center flex-row w-full relative py-[15px] px-[30px] gap-[50px]">
            <div class="align_center flex-col relative gap-[5px]">
                <NameTagInput
                    name="이름"
                    placeholder="ex) 이지수, 한민철"
                />
                <AISelectableInput
                    name="플레이어"
                />
                <div class="flex flex-row flex-nowrap w-full gap-2">
                    <NameTagInput name="나이" placeholder="ex) 26"/>
                    <NameTagInput name="성별" placeholder="성별을 정해주세요." />
                </div>
                <NameTagInput name="거주지" />
                <NameTagInput name="출생지" />
            </div>

            <div class="attribute_container">
                <CharacteristicCell name="근력"/>
                <CharacteristicCell name="건강"/>
                <CharacteristicCell name="크기"/>
                <CharacteristicCell name="민첩"/>
                <CharacteristicCell name="외모"/>
                <CharacteristicCell name="지능"/>
                <CharacteristicCell name="정신"/>
                <CharacteristicCell name="교육"/>
                <CharacteristicCell name="이동력"/>
            </div>
        </div>

        <SelectableSkillList
            points={10}
        />
    
        <BattleTable
            weaponData={[
                {
                    name:'권총',
                    skill:'근접전(격투)',
                    roll:'1d6',
                    applyDamage:1,
                    distance:0,
                    frequency:1,
                    leftBullet:0,
                    broken:false,
                }
            ]}
        />

    </form>
</main>

<style>

.attribute_container {
    position: relative;
    max-height: 20rem;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
}

</style> 