import { computed, ref } from "vue";
import { useCharacterStore } from "@/app/store/character";
import type { EquipmentSlot, Item, ItemInstance } from "@/entities/item/model";
import { SLOT_NAMES, getDisplayItem } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";

export function useInventory() {
  const characterStore = useCharacterStore();

  const selectedItem = ref<{ item: ItemInstance; index: number } | null>(null);
  const selectedEquippedSlot = ref<EquipmentSlot | null>(null);
  const inventoryFullWarning = ref(false);

  const selectItem = (item: ItemInstance | null, index: number) => {
    selectedItem.value = item ? { item, index } : null;
    selectedEquippedSlot.value = null;
  };

  const selectEquippedItem = (slot: EquipmentSlot) => {
    if (selectedEquippedSlot.value === slot) {
      selectedEquippedSlot.value = null;
    } else {
      selectedEquippedSlot.value = slot;
      selectedItem.value = null;
    }
  };

  const handleEquip = () => {
    if (!selectedItem.value) return;
    const success = characterStore.equipItem(selectedItem.value.index);
    if (success) selectedItem.value = null;
  };

  const handleUnequip = (slot: EquipmentSlot) => {
    const success = characterStore.unequipItem(slot);
    if (!success) {
      inventoryFullWarning.value = true;
    }
  };

  const handleUnequipSelected = () => {
    if (!selectedEquippedSlot.value) return;
    const success = characterStore.unequipItem(selectedEquippedSlot.value);
    if (success) {
      selectedEquippedSlot.value = null;
    } else {
      inventoryFullWarning.value = true;
    }
  };

  const closeWarning = () => {
    inventoryFullWarning.value = false;
  };

  const handleDelete = () => {
    if (!selectedItem.value) return;
    characterStore.removeItemFromInventory(selectedItem.value.index);
    selectedItem.value = null;
  };

  // Для предмета из инвентаря никогда не показываем «Надето»: выбранный слот — это вещь в сумке,
  // даже если такой же предмет надет (дубликат по id/ссылке). Иначе дубликаты ошибочно отображались бы как надетые.
  const isItemEquipped = computed(() => false);

  const selectedEquippedItem = computed<ItemInstance | null>(() => {
    if (selectedItem.value) {
      const selectedTemplate = getTemplate(selectedItem.value.item.templateId);
      if (!selectedTemplate || selectedTemplate.slot === "resource") return null;
      return characterStore.equipped[selectedTemplate.slot] ?? null;
    }

    if (!selectedEquippedSlot.value) return null;
    return characterStore.equipped[selectedEquippedSlot.value] ?? null;
  });

  const selectedDisplayItem = computed<Item | null>(() => {
    if (!selectedItem.value) return null;
    return getDisplayItem(selectedItem.value.item, getTemplate);
  });

  const selectedEquippedDisplayItem = computed<Item | null>(() => {
    const inst = selectedEquippedItem.value;
    return inst ? getDisplayItem(inst, getTemplate) : null;
  });

  const equipmentSlots = computed(() =>
    Object.entries(characterStore.equipped).map(([slot, item]) => ({
      slot: slot as keyof typeof characterStore.equipped,
      label: SLOT_NAMES[slot as keyof typeof SLOT_NAMES],
      item,
    })),
  );

  return {
    characterStore,
    selectedItem,
    selectedEquippedSlot,
    selectedEquippedItem,
    selectedDisplayItem,
    selectedEquippedDisplayItem,
    inventoryFullWarning,
    selectItem,
    selectEquippedItem,
    handleEquip,
    handleUnequip,
    handleUnequipSelected,
    handleDelete,
    closeWarning,
    isItemEquipped,
    equipmentSlots,
  };
}
