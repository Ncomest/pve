<script setup lang="ts">
import InfoArticle from "@/pages/Info/ui/InfoArticle.vue";
import { INFO_SECTIONS } from "@/pages/Info/lib/infoPageContent";
import "./InfoPage.scss";
</script>

<template>
  <div class="info-page">
    <h1 class="info-page__title">Информация</h1>
    <p class="info-page__subtitle">
      Кратко о характеристиках, бое, торговце и эликсирах — как устроено в текущей версии игры.
    </p>

    <div class="info-page__sections">
      <InfoArticle
        v-for="(section, index) in INFO_SECTIONS"
        :key="index"
        :title="section.title"
        :paragraphs="section.paragraphs"
      />
    </div>
  </div>
</template>
