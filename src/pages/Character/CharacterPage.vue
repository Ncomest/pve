<script setup lang="ts">
import { computed } from "vue";
import { useCharacterStore } from "@/app/store/character";
import { useInventory } from "@/features/inventory/model/useInventory";
import HeroStats from "@/features/inventory/ui/HeroStats.vue";
import EquipmentSlots from "@/features/inventory/ui/EquipmentSlots.vue";
import InventorySection from "@/features/inventory/ui/InventorySection.vue";
import ElixirsSection from "@/features/elixirs/ui/ElixirsSection.vue";
import "./CharacterPage.scss";

const characterStore = useCharacterStore();
const equipmentInventoryItems = computed(() =>
  characterStore.inventoryItems.filter(({ item }) => !item?.templateId.startsWith("elixir-")),
);

const {
  equipmentSlots,
  selectedEquippedSlot,
  selectedItem,
  selectedEquippedItem,
  selectedDisplayItem,
  selectedEquippedDisplayItem,
  inventoryFullWarning,
  isItemEquipped,
  selectItem,
  selectEquippedItem,
  handleEquip,
  handleUnequip,
  handleUnequipSelected,
  handleDelete,
  closeWarning,
} = useInventory();
</script>

<template>
  <div class="character-page">
    <h1 class="character-page__title">Персонаж</h1>
    <p class="character-page__subtitle">Управление снаряжением и предметами героя.</p>

    <div class="character-page__top">
      <EquipmentSlots
        :slots="equipmentSlots"
        :selected-slot="selectedEquippedSlot"
        @unequip="handleUnequip"
        @select="selectEquippedItem"
      />

      <HeroStats />
    </div>

    <InventorySection
      :items="equipmentInventoryItems"
      :selected-item="selectedItem"
      :selected-equipped-item="selectedEquippedItem"
      :selected-display-item="selectedDisplayItem"
      :selected-equipped-display-item="selectedEquippedDisplayItem"
      :inventory-full-warning="inventoryFullWarning"
      :is-item-equipped="isItemEquipped"
      @select="selectItem"
      @equip="handleEquip"
      @unequip-selected="handleUnequipSelected"
      @delete="handleDelete"
      @close-warning="closeWarning"
    />

    <ElixirsSection :items="characterStore.consumableItems" />
  </div>
</template>
