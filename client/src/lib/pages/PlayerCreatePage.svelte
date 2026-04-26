
<script lang="ts">
	import NameTagInput from './../components/NameTagInput.svelte';
	import AISelectableInput from '../components/AISelectableInput.svelte';
    import CharacteristicCell from '../components/CharacteristicCell.svelte';
    import CharacterFuncitonCell from '../components/pages/PlayerCreatePage/CharacterFuncitonCell.svelte';
    import type { AttrType } from '../types/types';

    const AttrFactory = (name:string, number:number):AttrType => {
        return {'name':name, 'defaultVal':number, 'value':0 };
    };

    const attributes:AttrType[] = [
        AttrFactory('감정',  5),
        AttrFactory('고고학', 1),
        AttrFactory('관찰력', 25),
        AttrFactory('근접전(격투)', 25),
        AttrFactory('기계수리', 10),
        AttrFactory('도약', 20),
        AttrFactory('듣기', 20),
        AttrFactory('말재주', 5),
        AttrFactory('매혹', 15),
        AttrFactory('법률', 5),
        AttrFactory('변장', 5),
        AttrFactory('사격(권총)', 20),
        AttrFactory('사격(라/산)', 25),
        AttrFactory('설득', 10),
        AttrFactory('손놀림', 10),
        AttrFactory('수영', 20),
        AttrFactory('승마', 5),
        AttrFactory('심리학', 10),
        AttrFactory('언어(모국어)', 0),
        AttrFactory('역사', 5),
        AttrFactory('열쇠공', 1),
        AttrFactory('오르기', 20),
        AttrFactory('오컬트', 5),
        AttrFactory('위협', 15),
        AttrFactory('은밀행동', 20),
        AttrFactory('응급처치', 20),
        AttrFactory('의료', 1),
        AttrFactory('인류학', 1),
        AttrFactory('자동차 운전', 20),
        AttrFactory('자료조사', 20),
        AttrFactory('자연', 10),
        AttrFactory('재력', 0),
        AttrFactory('전기수리', 10),
        AttrFactory('정신분석', 1),
        AttrFactory('중장비 조작', 1),
        AttrFactory('추적', 10),
        AttrFactory('크툴루 신화', 0),
        AttrFactory('투척', 20),
        AttrFactory('항법', 10),
        AttrFactory('회계', 5),
        AttrFactory('회피', 0)
    ];

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

        
        <div class="skill_container">
            <p class="skill_title">스킬 선택</p>
            <div class="skill_list">
                {#each attributes as attr}
                    <CharacterFuncitonCell
                        name={attr.name}
                        value={attr.value}
                        defaultVal={attr.defaultVal}
                    />
                {/each}
            </div>
        </div>
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

.skill_container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: fit-content;
    border: 2px solid var(--galaxy-hover);
    border-radius: 0.5em;
    padding: 0.5em;
}

.skill_title {
    background-color: black;
    color: white;
    width: 100%;
    border-radius: 0.5em;
    text-align: center;
    font-size: x-large;
    font-weight: bold;
    margin-bottom: 0.5em;
}

.skill_list {
    column-count: 3;
    column-rule: 1px solid var(--galaxy-hover);
    column-gap: 1em;
    width: 80vw;
}

</style> 