<!--
    [스킬 포인트 배분 시스템 설계]

    데이터 흐름:
        PlayerCreatePage
          └─ SelectableSkillList (points 상위에서 수신)
               ├─ attributes[] 를 $state로 소유
               ├─ spent = sum(attributes[].value)  ($derived)
               ├─ remaining = points - spent        ($derived)
               │
               └─ CharacterFuncitonCell (attr, remaining, onChange)

    SelectableSkillList 역할:
        - attributes 배열을 $state로 중앙 소유
        - spent / remaining을 $derived로 계산
        - 각 셀에 remaining과 값 변경 콜백(onChange)을 전달

        onChange(index, newValue):
            - diff = newValue - 현재값
            - diff > remaining → 남은 포인트만큼만 허용
            - newValue < 0 → 0으로 클램핑
            - 그 외 → 그대로 반영

    CharacterFuncitonCell 역할:
        - 자기 값을 직접 소유하지 않고, 부모에게 변경 요청
        - remaining을 받아서 UI 피드백 (입력 불가 표시 등)

        onInput(e):
            - onChange(Number(e.target.value)) 호출
            - 부모가 클램핑한 값으로 e.target.value 동기화

    엣지 케이스:
        - remaining 0일 때 값 올리기 → 차단
        - 값 내리기 → 항상 허용, remaining 복구
        - 음수 입력 → 0 클램핑
        - 큰 수 한번에 입력 → remaining까지만 허용
        - defaultVal은 건드리지 않음, value는 순수 추가분
-->
<script lang="ts">
    import CharacterFuncitonCell from "./CharacterFuncitonCell.svelte";
    import type { AttrType } from "../../../types/types";

    const { points }:{ points:number } = $props();


    // 기초 및 기본값들
    const AttrFactory = (name:string, number:number, value:number = 0):AttrType => {
        return {'name':name, 'defaultVal':number, 'value':value };
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

<div>
    <div class="skill_container">
        <p class="skill_title">스킬 선택</p>
        <p>남은 스킬 포인트 : {points}</p>
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
</div>

<style>
    
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