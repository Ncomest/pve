<script setup lang="ts">
defineProps<{
  title: string;
  paragraphs: string[];
}>();
</script>

<template>
  <section class="info-article">
    <h2 class="info-article__title">{{ title }}</h2>
    <p v-for="(paragraph, index) in paragraphs" :key="index" class="info-article__text">
      {{ paragraph }}
    </p>
  </section>
</template>
