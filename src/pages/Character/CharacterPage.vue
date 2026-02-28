<script setup lang="ts">
import { onMounted } from "vue";
import { useCharacterStore } from "@/app/store/character";
import { useInventory } from "@/features/inventory/model/useInventory";
import HeroStats from "@/features/inventory/ui/HeroStats.vue";
import EquipmentSlots from "@/features/inventory/ui/EquipmentSlots.vue";
import InventorySection from "@/features/inventory/ui/InventorySection.vue";
import "./CharacterPage.scss";

const characterStore = useCharacterStore();

onMounted(() => {
  characterStore.init();
});

const {
  equipmentSlots,
  selectedEquippedSlot,
  selectedItem,
  selectedEquippedItem,
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
      :items="characterStore.inventoryItems"
      :selected-item="selectedItem"
      :selected-equipped-item="selectedEquippedItem"
      :inventory-full-warning="inventoryFullWarning"
      :is-item-equipped="isItemEquipped"
      @select="selectItem"
      @equip="handleEquip"
      @unequip-selected="handleUnequipSelected"
      @delete="handleDelete"
      @close-warning="closeWarning"
    />
  </div>
</template>
