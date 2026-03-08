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
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <!-- helmet -->
              <template v-if="slot === 'helmet'">
                <path d="M8 26 Q8 14 20 12 Q32 14 32 26 L30 28 L10 28 Z" fill="currentColor" opacity="0.7"/>
                <rect x="10" y="27" width="20" height="5" rx="2" fill="currentColor" opacity="0.9"/>
                <path d="M15 19 Q20 15 25 19" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5"/>
              </template>
              <!-- chest -->
              <template v-else-if="slot === 'chest'">
                <path d="M10 12 Q10 28 12 32 L20 34 L28 32 Q30 28 30 12 Q25 8 20 8 Q15 8 10 12Z" fill="currentColor" opacity="0.7"/>
                <path d="M14 15 Q20 12 26 15 L25 24 Q20 21 15 24 Z" fill="currentColor" opacity="0.4"/>
                <line x1="20" y1="8" x2="20" y2="34" stroke="currentColor" stroke-width="1" opacity="0.4"/>
              </template>
              <!-- belt -->
              <template v-else-if="slot === 'belt'">
                <rect x="6" y="16" width="28" height="8" rx="3" fill="currentColor" opacity="0.7"/>
                <rect x="17" y="17" width="6" height="6" rx="1.5" fill="currentColor" opacity="1"/>
                <circle cx="20" cy="20" r="2" fill="rgba(0,0,0,0.4)"/>
              </template>
              <!-- pants -->
              <template v-else-if="slot === 'pants'">
                <path d="M10 8 L14 30 L20 27 L20 8 Z" fill="currentColor" opacity="0.7"/>
                <path d="M30 8 L26 30 L20 27 L20 8 Z" fill="currentColor" opacity="0.7"/>
                <rect x="10" y="8" width="20" height="4" rx="1" fill="currentColor" opacity="0.5"/>
              </template>
              <!-- boots -->
              <template v-else-if="slot === 'boots'">
                <path d="M12 10 Q11 24 10 32 L22 32 L22 22 L18 22 L18 10 Z" fill="currentColor" opacity="0.7"/>
                <ellipse cx="16" cy="32" rx="8" ry="3.5" fill="currentColor" opacity="0.9"/>
              </template>
            </svg>
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
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <!-- necklace -->
              <template v-if="slot === 'necklace'">
                <path d="M10 12 Q20 30 30 12" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
                <circle cx="20" cy="29" r="5" fill="currentColor" opacity="0.8"/>
                <circle cx="20" cy="29" r="2.5" fill="rgba(0,0,0,0.3)"/>
              </template>
              <!-- ring -->
              <template v-else-if="slot === 'ring'">
                <circle cx="20" cy="20" r="12" stroke="currentColor" stroke-width="3" fill="none" opacity="0.8"/>
                <circle cx="20" cy="9" r="4" fill="currentColor" opacity="0.9"/>
                <circle cx="20" cy="9" r="2" fill="rgba(0,0,0,0.3)"/>
              </template>
              <!-- earring -->
              <template v-else-if="slot === 'earring'">
                <circle cx="20" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none" opacity="0.8"/>
                <path d="M20 17 Q16 24 20 30" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
                <circle cx="20" cy="30" r="3" fill="currentColor" opacity="0.9"/>
              </template>
              <!-- weapon -->
              <template v-else-if="slot === 'weapon'">
                <line x1="10" y1="32" x2="30" y2="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
                <path d="M27 8 L34 8 L34 15 L30 11 Z" fill="currentColor" opacity="0.9"/>
                <rect x="8" y="28" width="8" height="3" rx="1" transform="rotate(-45 12 30)" fill="currentColor" opacity="0.6"/>
              </template>
              <!-- shield -->
              <template v-else-if="slot === 'shield'">
                <path d="M20 6 L32 11 L32 22 Q32 32 20 36 Q8 32 8 22 L8 11 Z" fill="currentColor" opacity="0.6"/>
                <path d="M20 10 L28 14 L28 22 Q28 29 20 32 Q12 29 12 22 L12 14 Z" fill="currentColor" opacity="0.3"/>
                <line x1="20" y1="10" x2="20" y2="32" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
                <line x1="12" y1="20" x2="28" y2="20" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
              </template>
            </svg>
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
