<script setup lang="ts">
/** SVG-заглушка для пустого слота способности */
</script>

<template>
  <svg
    class="ability-slot-placeholder"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="44"
      height="44"
      rx="6"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-dasharray="4 3"
      fill="none"
      opacity="0.5"
    />
    <path
      d="M24 14v20M14 24h20"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      opacity="0.6"
    />
  </svg>
</template>

<style scoped>
.ability-slot-placeholder {
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.25);
}
</style>
