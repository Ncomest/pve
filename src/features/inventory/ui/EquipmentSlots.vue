<script setup lang="ts">
import { computed } from "vue";
import type { EquipmentSlot, ItemInstance } from "@/entities/item/model";
import { getDisplayItem } from "@/entities/item/model";
import { getTemplate } from "@/entities/item/items-db";
import { rarityColor } from "@/entities/item/lib/rarityColor";
import { useHeroAvatar } from "@/features/inventory/model/useHeroAvatar";

interface SlotEntry {
  slot: EquipmentSlot;
  label: string;
  item: ItemInstance | null;
}

const props = defineProps<{
  slots: SlotEntry[];
  selectedSlot?: EquipmentSlot | null;
}>();

const emit = defineEmits<{
  unequip: [slot: EquipmentSlot];
  select: [slot: EquipmentSlot];
}>();

const LEFT_SLOTS: EquipmentSlot[] = ["helmet", "chest", "belt", "pants", "boots"];
const RIGHT_SLOTS: EquipmentSlot[] = ["necklace", "ring", "earring", "weapon", "shield"];

const leftSlots = computed(() =>
  LEFT_SLOTS.map((s) => props.slots.find((e) => e.slot === s)).filter(Boolean) as SlotEntry[],
);

const rightSlots = computed(() =>
  RIGHT_SLOTS.map((s) => props.slots.find((e) => e.slot === s)).filter(Boolean) as SlotEntry[],
);

const { selectedSrc } = useHeroAvatar();
const avatarSrc = computed(() => selectedSrc());

const SLOT_ICON_FILES: Record<EquipmentSlot, string> = {
  helmet: "helmet",
  chest: "chest",
  belt: "belt",
  pants: "pants",
  boots: "boots",
  necklace: "neck",
  ring: "ring",
  earring: "trinket",
  weapon: "sword",
  shield: "shield",
};

function getSlotIconSrc(slot: EquipmentSlot) {
  const file = SLOT_ICON_FILES[slot];
  return `/images/equipment/${file}.png`;
}

function getDisplay(inst: ItemInstance | null) {
  return inst ? getDisplayItem(inst, getTemplate) : null;
}
</script>

<template>
  <section class="equipment-slots">
    <h2 class="equipment-slots__title">Экипировка</h2>
    <div class="equipment-slots__layout">

      <!-- Левая колонка: шлем, грудь, пояс, штаны, ботинки -->
      <div class="equipment-slots__column">
        <div
          v-for="{ slot, label, item } in leftSlots"
          :key="slot"
          class="equipment-slots__card"
          :class="{
            'equipment-slots__card--filled': item,
            'equipment-slots__card--selected': item && selectedSlot === slot,
          }"
          @click="item && emit('select', slot)"
        >
          <!-- Иконка слота -->
          <div class="equipment-slots__icon" :class="{ 'equipment-slots__icon--filled': item }">
            <img
              :src="getSlotIconSrc(slot)"
              :alt="label"
              class="equipment-slots__icon-img"
            />
          </div>

          <!-- Правая часть: заголовок + имя предмета/статус -->
          <div class="equipment-slots__info">
            <div class="equipment-slots__header">
              <span class="equipment-slots__label">{{ label }}</span>
              <button
                v-if="item"
                type="button"
                class="equipment-slots__unequip-btn"
                @click.stop="emit('unequip', slot)"
              >
                Снять
              </button>
            </div>
            <template v-if="item">
              <div
                class="equipment-slots__item-name"
                :style="getDisplay(item) ? { color: rarityColor(getDisplay(item)!.rarity) } : {}"
              >
                {{ getDisplay(item)?.name }}
              </div>
              <div v-if="getDisplay(item)?.itemLevel != null" class="equipment-slots__item-level">
                Ур. {{ getDisplay(item)!.itemLevel }}
              </div>
            </template>
            <div v-else class="equipment-slots__empty">Свободно</div>
          </div>
        </div>
      </div>

      <!-- Аватар персонажа по центру -->
      <div class="equipment-slots__avatar">
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          alt="Аватар героя"
          class="equipment-slots__avatar-img"
        />
        <svg
          v-else
          viewBox="0 0 120 220"
          xmlns="http://www.w3.org/2000/svg"
          class="equipment-slots__avatar-svg"
        >
          <ellipse cx="60" cy="32" rx="22" ry="26" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.5"/>
          <path d="M38 32 Q38 8 60 6 Q82 8 82 32 L78 28 Q60 12 42 28 Z" fill="#2563eb" stroke="#60a5fa" stroke-width="1"/>
          <ellipse cx="53" cy="30" rx="3" ry="3.5" fill="#93c5fd" opacity="0.8"/>
          <ellipse cx="67" cy="30" rx="3" ry="3.5" fill="#93c5fd" opacity="0.8"/>
          <path d="M52 40 Q60 46 68 40" stroke="#60a5fa" stroke-width="1.2" fill="none"/>
          <rect x="54" y="57" width="12" height="10" rx="3" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1"/>
          <path d="M30 68 Q28 100 32 118 L60 122 L88 118 Q92 100 90 68 Q75 60 60 58 Q45 60 30 68Z" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.5"/>
          <path d="M42 72 Q60 66 78 72 L76 90 Q60 84 44 90 Z" fill="#2563eb" opacity="0.6"/>
          <ellipse cx="24" cy="76" rx="14" ry="10" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.5"/>
          <ellipse cx="96" cy="76" rx="14" ry="10" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.5"/>
          <rect x="10" y="84" width="12" height="44" rx="6" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.2"/>
          <rect x="98" y="84" width="12" height="44" rx="6" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.2"/>
          <rect x="9" y="122" width="14" height="14" rx="5" fill="#2563eb" stroke="#60a5fa" stroke-width="1"/>
          <rect x="97" y="122" width="14" height="14" rx="5" fill="#2563eb" stroke="#60a5fa" stroke-width="1"/>
          <rect x="30" y="118" width="60" height="10" rx="4" fill="#2563eb" stroke="#60a5fa" stroke-width="1.5"/>
          <rect x="56" y="119" width="8" height="8" rx="2" fill="#60a5fa"/>
          <path d="M32 128 L44 178 L60 174 L60 128 Z" fill="#1e293b" stroke="#60a5fa" stroke-width="1.2"/>
          <path d="M88 128 L76 178 L60 174 L60 128 Z" fill="#1e293b" stroke="#60a5fa" stroke-width="1.2"/>
          <path d="M34 178 Q30 190 28 200 L52 200 L52 175 Z" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.2"/>
          <path d="M86 178 Q90 190 92 200 L68 200 L68 175 Z" fill="#1e3a5f" stroke="#60a5fa" stroke-width="1.2"/>
          <ellipse cx="38" cy="200" rx="12" ry="5" fill="#2563eb" stroke="#60a5fa" stroke-width="1"/>
          <ellipse cx="82" cy="200" rx="12" ry="5" fill="#2563eb" stroke="#60a5fa" stroke-width="1"/>
        </svg>
      </div>

      <!-- Правая колонка: шея, кольцо, серьга, оружие, щит -->
      <div class="equipment-slots__column">
        <div
          v-for="{ slot, label, item } in rightSlots"
          :key="slot"
          class="equipment-slots__card"
          :class="{
            'equipment-slots__card--filled': item,
            'equipment-slots__card--selected': item && selectedSlot === slot,
          }"
          @click="item && emit('select', slot)"
        >
          <!-- Иконка слота -->
          <div class="equipment-slots__icon" :class="{ 'equipment-slots__icon--filled': item }">
            <img
              :src="getSlotIconSrc(slot)"
              :alt="label"
              class="equipment-slots__icon-img"
            />
          </div>

          <!-- Правая часть: заголовок + имя предмета/статус -->
          <div class="equipment-slots__info">
            <div class="equipment-slots__header">
              <span class="equipment-slots__label">{{ label }}</span>
              <button
                v-if="item"
                type="button"
                class="equipment-slots__unequip-btn"
                @click.stop="emit('unequip', slot)"
              >
                Снять
              </button>
            </div>
            <template v-if="item">
              <div
                class="equipment-slots__item-name"
                :style="getDisplay(item) ? { color: rarityColor(getDisplay(item)!.rarity) } : {}"
              >
                {{ getDisplay(item)?.name }}
              </div>
              <div v-if="getDisplay(item)?.itemLevel != null" class="equipment-slots__item-level">
                Ур. {{ getDisplay(item)!.itemLevel }}
              </div>
            </template>
            <div v-else class="equipment-slots__empty">Свободно</div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style lang="scss" src="./EquipmentSlots.scss"></style>
