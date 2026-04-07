<script lang="ts">

export let title: string;
export let description: string;
export let onclick: () => void;

</script>

<button type="button" class="clickable_card" on:click={onclick}>
  <p>{title}</p>
  <p class="description">{description}</p>
</button>

<style>

.clickable_card {
  border: none;
  cursor: pointer;
  background-color: #00385a;
  border-radius: 15px;
  box-shadow: 5px 10px 5px 2px #01162b;
  min-width: 270px;
  min-height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  flex-wrap: wrap;
  margin: 0.5rem;
  padding: 0.5rem;

  transition: all 0.5s ease-in-out;
}
.clickable_card:hover {
  transition: all 0.5s ease-in-out;
  background-color: #45538a;
  transform: translate(-5px, -10px);
}

.clickable_card p {
  font-size: 18px;
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  font-weight: bold;
}
.clickable_card p:hover {
  transition: all 0.5s ease-in;
  color: #c9ccd3;
}

.clickable_card .description {
  font-size: 12px;
  color: #6a90b4;
  text-align: center;
  max-width: 20rem;
}

</style>