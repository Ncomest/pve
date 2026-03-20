<script setup lang="ts">
import { computed, ref } from "vue";
import type { ItemInstance } from "@/entities/item/model";
import { useCharacterStore } from "@/app/store/character";
import ConsumablesGrid from "@/features/inventory/ui/ConsumablesGrid.vue";
import type { ElixirDefinition } from "@/features/elixirs/model/elixirs";
import { getElixirDefinition } from "@/features/elixirs/model/elixirs";
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import { getElixirDescription } from "../lib/getElixirDescription";
import "./ElixirsSection.scss";

interface ConsumableEntry {
  item: ItemInstance | null;
  index: number;
}

const props = defineProps<{
  items: ConsumableEntry[];
}>();

const characterStore = useCharacterStore();
const elixirsStore = useElixirsStore();

const selectedIndex = ref<number | null>(null);
const message = ref<string | null>(null);
let messageTimer: ReturnType<typeof setTimeout> | null = null;

const selectedItem = computed(() => {
  if (selectedIndex.value === null) return null;
  return props.items[selectedIndex.value]?.item ?? null;
});

const selectedElixirDef = computed<ElixirDefinition | null>(() => {
  const item = selectedItem.value;
  if (!item) return null;
  return getElixirDefinition(item.templateId);
});

const isSelectedElixir = computed(() => {
  if (!selectedElixirDef.value) return false;
  // На всякий случай (пока MVP предполагает, что consumables — только эликсиры).
  return selectedElixirDef.value.id.startsWith("elixir-");
});

const selectedElixirDescription = computed(() => {
  if (!selectedElixirDef.value) return "";
  return getElixirDescription(selectedElixirDef.value);
});

const isSelectedActive = computed(() => {
  const def = selectedElixirDef.value;
  if (!def) return false;
  return elixirsStore.isActive && elixirsStore.activeElixirId === def.id;
});

const activeSecondsLeft = computed(() => Math.ceil(elixirsStore.activeElixirRemainingMs / 1000));

function showMessage(text: string) {
  message.value = text;
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    message.value = null;
    messageTimer = null;
  }, 2500);
}

function selectElixir(_item: ItemInstance | null, index: number) {
  if (!_item) return;
  selectedIndex.value = selectedIndex.value === index ? null : index;
}

function discardSelectedElixir() {
  if (selectedIndex.value === null) return;
  const def = selectedElixirDef.value;
  if (!def) return;

  characterStore.removeItemFromConsumables(selectedIndex.value);
  selectedIndex.value = null;
  showMessage(`${def.name} выкинут.`);
}

function drinkSelectedElixir() {
  const def = selectedElixirDef.value;
  if (!def || selectedIndex.value === null) return;

  const res = elixirsStore.drinkElixir(def.id);
  if (!res.ok) {
    showMessage(res.reason ?? "Не удалось выпить эликсир.");
    return;
  }

  selectedIndex.value = null;
  showMessage(`${def.name} выпит.`);
}
</script>

<template>
  <section class="elixirs-section">
    <h2 class="elixirs-section__title">Зелья и эликсиры</h2>

    <div class="elixirs-section__body">
      <ConsumablesGrid
        :items="props.items"
        :selected-index="selectedIndex"
        @select="selectElixir"
      />

      <div v-if="selectedElixirDef && isSelectedElixir" class="elixirs-section__details">
        <div class="elixirs-section__details-header">
          <div class="elixirs-section__icon">
            <img
              :src="selectedElixirDef.icon"
              :alt="selectedElixirDef.name"
              class="elixirs-section__icon-img"
            />
          </div>

          <div class="elixirs-section__details-header-info">
            <h3 class="elixirs-section__elixir-name">{{ selectedElixirDef.name }}</h3>
            <div v-if="isSelectedActive" class="elixirs-section__timer">
              Осталось: {{ activeSecondsLeft }}с
            </div>
          </div>
        </div>

        <div class="elixirs-section__elixir-description">{{ selectedElixirDescription }}</div>

        <div class="elixirs-section__actions">
          <button
            type="button"
            class="elixirs-section__btn elixirs-section__btn--drink"
            @click="drinkSelectedElixir"
          >
            Выпить
          </button>
          <button
            type="button"
            class="elixirs-section__btn elixirs-section__btn--discard"
            @click="discardSelectedElixir"
          >
            Выкинуть
          </button>
        </div>
      </div>

      <div v-else class="elixirs-section__details elixirs-section__details--empty">
        <div class="elixirs-section__empty-text">Выберите эликсир, чтобы увидеть описание и использовать.</div>
      </div>
    </div>

    <div v-if="message" class="elixirs-section__toast">{{ message }}</div>
  </section>
</template>

