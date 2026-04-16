
<script lang="ts">
	import NameTagRadioInput from './../components/NameTagRadioInput.svelte';
	import NameTagInput from './../components/NameTagInput.svelte';
	import FlexibleInputList from './../components/FlexibleInputList.svelte';
    import AISelectableInput from '../components/AISelectableInput.svelte';
    import CharacteristicCell from '../components/CharacteristicCell.svelte';

</script>

<main>
    <form action="method" class="player_create_page">
        <div class="headline_container">
            <div class="investigator_container">
                <NameTagInput
                    name={"이름"}
                    placeholder={"ex) 이지수, 한민철"}
                />
                <AISelectableInput
                    name={"플레이어"}
                />
                <NameTagInput
                    name={"나이"}
                    placeholder={"ex) 26"}
                />
                <NameTagInput
                    name={"생일"}
                />
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

        <NameTagRadioInput
            name={"성별"}
            radios={[
                {
                    name: '남성',
                    value: 'male'
                },
                {
                    name: '여성',
                    value: 'female'
                }
            ]}
        />
        <!-- <input type="text" id="name">
        <input type="text" id="age">
        <input type="text" id="gender">
        <input type="text" id="occupation">
        <input type="text" id="birthplace">
        <input type="text" id="residence">
        <div class="number_form">
            <input type="number" name="str" id="STR">
            <input type="number" name="con" id="CON">
            <input type="number" name="siz" id="SIZ">
            <input type="number" name="dex" id="DEX">
            <input type="number" name="app" id="APP">
            <input type="number" name="int" id="INT">
            <input type="number" name="pow" id="POW">
            <input type="number" name="edu" id="EDU">
            <hr>
            <input type="number" name="hp" id="HP">
            <input type="number" name="mp" id="MP">
            <input type="number" name="san" id="SAN">
            <input type="number" name="luck" id="LUCK">
        </div> -->

        <div class="skill_list">
            <FlexibleInputList
                skills={
                    [
                        { name:'은신', value:65 },
                        { name:'도서관이용', value:55 }
                    ]
                }
            />
        </div>
    </form>
</main>

<style>

.player_create_page {
    width: 320px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.headline_container {
    width: 100%;
    position: relative;
    padding: 15px 30px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 50px;
}

.headline_container * {
    border: 1px solid violet;
    padding: 10px;
}

.investigator_container {
    position: relative;
}

.attribute_container {
    position: relative;
    min-width: max-content;
    max-height: 25rem;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
}

</style> 