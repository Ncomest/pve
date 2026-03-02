<script setup lang="ts">
import { defineAsyncComponent, computed } from "vue";
import type { Ability } from "@/features/abilities/model/types";
import * as Icons from "@/shared/ui/icons";
import { AbilitySlotPlaceholder } from "@/shared/ui/AbilitySlotPlaceholder";
import CooldownOverlay from "@/shared/ui/CooldownOverlay/CooldownOverlay.vue";
import "./SkillBarSlot.scss";

const props = defineProps<{
  ability: Ability | null;
  hotkey: string;
  /** Режим редактирования: показывать инпут горячей клавиши и возможность очистки */
  editable?: boolean;
  /** Оставшийся кулдаун в мс (для анимации) */
  cooldownMs?: number;
  /** Максимальный кулдаун способности в мс (для вычисления прогресса) */
  cooldownMaxMs?: number;
  /** Текст перезарядки */
  cooldownText?: string;
}>();

const emit = defineEmits<{
  "update:hotkey": [value: string];
  "assign": [];
  "clear": [];
}>();

const iconMap: Record<string, ReturnType<typeof defineAsyncComponent>> = Icons as never;

const isImageIcon = computed(() =>
  !!props.ability?.icon && (props.ability.icon.startsWith("/") || props.ability.icon.startsWith("http"))
);

const iconComponent = computed(() => {
  if (!props.ability?.icon || isImageIcon.value) return null;
  return iconMap[props.ability.icon] ?? null;
});

function onContentClick(event: MouseEvent) {
  if (!props.editable) return; // в бою клик идёт дальше к родительской кнопке
  event.stopPropagation();
  if (props.ability) {
    emit("clear");
  } else {
    emit("assign");
  }
}

/** 0 = только началось, 1 = готово */
const cdProgress = computed(() => {
  if (!props.cooldownMs || !props.cooldownMaxMs || props.cooldownMaxMs <= 0) return 1;
  return 1 - Math.max(0, Math.min(1, props.cooldownMs / props.cooldownMaxMs));
});
</script>

<template>
  <div
    class="skill-bar-slot"
    :class="{
      'skill-bar-slot--empty': !ability,
      'skill-bar-slot--editable': editable,
    }"
  >
    <input
      v-if="editable"
      :value="hotkey"
      type="text"
      class="skill-bar-slot__hotkey"
      placeholder="Клавиша"
      maxlength="8"
      @click.stop
      @input="emit('update:hotkey', ($event.target as HTMLInputElement).value)"
    />
    <div v-else-if="hotkey" class="skill-bar-slot__hotkey-label">{{ hotkey }}</div>

    <div
      class="skill-bar-slot__content"
      :class="ability ? `skill-bar-slot__content--${ability.type}` : ''"
      @click="onContentClick"
    >
      <AbilitySlotPlaceholder v-if="!ability" />
      <template v-else>
        <img v-if="isImageIcon" :src="ability!.icon" class="skill-bar-slot__icon" :alt="ability!.name" />
        <component v-else :is="iconComponent" class="skill-bar-slot__icon" />
        <CooldownOverlay
          v-if="!editable"
          :progress="cdProgress"
          :cooldown-text="cooldownText"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Стили в SkillBarSlot.scss */
</style>
