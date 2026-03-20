<script setup lang="ts">
import type { Item, ItemInstance } from "@/entities/item/model";
import InventoryGrid from "@/features/inventory/ui/InventoryGrid.vue";
import ItemDetails from "@/features/inventory/ui/ItemDetails.vue";
import "./InventorySection.scss";

interface InventoryEntry {
  item: ItemInstance | null;
  index: number;
}

const props = withDefaults(
  defineProps<{
    items: InventoryEntry[];
    selectedItem: { item: ItemInstance; index: number } | null;
    selectedEquippedItem: ItemInstance | null;
    selectedDisplayItem: Item | null;
    selectedEquippedDisplayItem: Item | null;
    inventoryFullWarning: boolean;
    isItemEquipped: boolean;
    /** Если false — блок деталей надетой вещи не показывается (например, аккордеон на странице персонажа). */
    showEquippedInInventory?: boolean;
  }>(),
  { showEquippedInInventory: true },
);

const emit = defineEmits<{
  select: [item: ItemInstance | null, index: number];
  equip: [];
  unequipSelected: [];
  delete: [];
  closeWarning: [];
}>();
</script>

<template>
  <section class="inventory-section">
    <h2 class="inventory-section__title">Инвентарь</h2>
    <div class="inventory-section__body">
      <InventoryGrid
        :items="props.items"
        :selected-index="props.selectedItem?.index ?? null"
        @select="(item, index) => emit('select', item, index)"
      />
      <div
        v-if="props.showEquippedInInventory && props.selectedEquippedDisplayItem"
        class="inventory-section__item-details"
      >
        <ItemDetails
          :item="props.selectedEquippedDisplayItem"
          :is-equipped="true"
          :is-equipped-slot="true"
          @unequip="emit('unequipSelected')"
        />
      </div>
      <div v-else-if="props.selectedDisplayItem" class="inventory-section__item-details">
        <ItemDetails
          :item="props.selectedDisplayItem"
          :is-equipped="props.isItemEquipped"
          @equip="emit('equip')"
          @delete="emit('delete')"
        />
      </div>
    </div>
  </section>

  <Teleport to="body">
    <div v-if="props.inventoryFullWarning" class="inventory-warning-overlay" @click.self="emit('closeWarning')">
      <div class="inventory-warning-modal">
        <div class="inventory-warning-modal__icon">⚠️</div>
        <h3 class="inventory-warning-modal__title">Инвентарь заполнен</h3>
        <p class="inventory-warning-modal__text">
          Нет свободных слотов для снятия предмета. Освободите место в инвентаре.
        </p>
        <button
          type="button"
          class="inventory-warning-modal__btn"
          @click="emit('closeWarning')"
        >
          Понятно
        </button>
      </div>
    </div>
  </Teleport>
</template>
