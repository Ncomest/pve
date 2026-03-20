<script setup lang="ts">
import type { ItemInstance } from "@/entities/item/model";
import ConsumablesGrid from "@/features/inventory/ui/ConsumablesGrid.vue";
import "./ConsumablesSection.scss";

interface ConsumableEntry {
  item: ItemInstance | null;
  index: number;
}

const props = defineProps<{
  items: ConsumableEntry[];
}>();
</script>

<template>
  <section class="consumables-section">
    <h2 class="consumables-section__title">Зелья и эликсиры</h2>
    <ConsumablesGrid :items="props.items" :selected-index="null" />
  </section>
</template>

