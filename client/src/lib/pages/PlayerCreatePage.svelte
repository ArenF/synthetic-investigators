
<script lang="ts">

</script>

<main>
    <form action="post" class="player_create_page">
        <input type="text" id="name">
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
        </div>
    </form>
</main>

<style>

.player_create_page {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.number_form {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    max-width: 380px;
}


</style> 