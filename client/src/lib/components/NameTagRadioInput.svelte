
<script lang="ts">
    type RadioValue = {
        name: string,
        value: string,
    };

    let { name, radios }: { name:string, radios:RadioValue[] } = $props();
    
</script>

<div class="main">
    <p>{name} :</p>
    <div class="radio_container">
        {#each radios as radio}
            <div class="radio_elem">
                <label for={radio.value}>{radio.name} : </label>
                <input type="radio" id={radio.value} name="group" value={radio.value}/>
            </div>
        {/each}
    </div>
</div>

<style>

    p, label {
        padding: 0px 5px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
    }

    .main {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 100%;
        padding: 5px 15px;
    }

    .radio_container {
        position: relative;
        display: flex;
        flex-direction: row;

    }
    .radio_elem {
        margin: 0px 10px;
    }
</style>