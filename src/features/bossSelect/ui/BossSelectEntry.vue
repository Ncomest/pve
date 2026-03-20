<script setup lang="ts">
  import { ref } from "vue";
  import type { Boss, BossAbility } from "@/entities/boss/model";
  import { rarityLabel } from "@/shared/lib/labels";

  defineProps<{
    boss: Boss;
    isInfoOpen: boolean;
  }>();

  const emit = defineEmits<{
    select: [boss: Boss];
    toggleInfo: [boss: Boss];
  }>();

  const tooltip = ref<{ ability: BossAbility; x: number; y: number } | null>(
    null,
  );

  function showTooltip(e: MouseEvent, ability: BossAbility) {
    tooltip.value = { ability, x: e.clientX, y: e.clientY };
  }

  function moveTooltip(e: MouseEvent) {
    if (tooltip.value) {
      tooltip.value.x = e.clientX;
      tooltip.value.y = e.clientY;
    }
  }

  function hideTooltip() {
    tooltip.value = null;
  }

  const typeLabel: Record<string, string> = {
    damage: "Урон",
    heal: "Лечение",
    buff: "Бафф",
  };

  function formatMs(ms: number): string {
    return (ms / 1000).toFixed(1).replace(/\.0$/, "") + "с";
  }
</script>

<template>
  <div class="boss-select-entry" :class="`boss-select-entry--${boss.rarity}`">
    <div class="boss-select-entry__card">
      <div class="boss-select-entry__avatar">
        <img
          v-if="boss.image"
          :src="boss.image"
          :alt="boss.name"
          class="boss-select-entry__avatar-img"
        />
        <svg
          v-else
          class="boss-select-entry__avatar-placeholder"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="48" height="48" rx="8" fill="rgba(255,255,255,0.04)" />
          <circle
            cx="24"
            cy="18"
            r="7"
            stroke="rgba(255,255,255,0.2)"
            stroke-width="1.5"
          />
          <path
            d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14"
            stroke="rgba(255,255,255,0.2)"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <div class="boss-select-entry__level">{{ boss.level }}</div>
      </div>

      <div class="boss-select-entry__info">
        <div class="boss-select-entry__name">
          {{ boss.name }}
          <span class="boss-select-entry__rarity">
            {{ rarityLabel(boss.rarity) }}
          </span>
        </div>
        <div
          v-if="(boss.bossAbilities?.length ?? 0) > 0"
          class="boss-select-entry__abilities-row"
        >
          <div
            v-for="ability in boss.bossAbilities"
            :key="ability.id"
            class="boss-select-entry__ability-cell"
            @mouseenter="showTooltip($event, ability)"
            @mousemove="moveTooltip($event)"
            @mouseleave="hideTooltip"
          >
            <img
              v-if="ability.icon"
              :src="ability.icon"
              :alt="ability.name"
              class="boss-select-entry__ability-icon"
            />
            <span v-else class="boss-select-entry__ability-icon-fallback"
              >?</span
            >
          </div>
        </div>

        <Teleport to="body">
          <div
            v-if="tooltip"
            class="boss-ability-tooltip"
            :style="{ left: tooltip.x + 14 + 'px', top: tooltip.y + 14 + 'px' }"
          >
            <div class="boss-ability-tooltip__name">
              {{ tooltip.ability.name }}
            </div>
            <div class="boss-ability-tooltip__row">
              <span class="boss-ability-tooltip__label">Тип:</span>
              <span>{{
                typeLabel[tooltip.ability.type] ?? tooltip.ability.type
              }}</span>
            </div>
            <div
              v-if="tooltip.ability.baseDamageX != null"
              class="boss-ability-tooltip__row"
            >
              <span class="boss-ability-tooltip__label">Множитель урона:</span>
              <span>×{{ tooltip.ability.baseDamageX }}</span>
            </div>
            <div
              v-if="tooltip.ability.dotDurationMs != null"
              class="boss-ability-tooltip__row"
            >
              <span class="boss-ability-tooltip__label">Длительность DoT:</span>
              <span>{{ formatMs(tooltip.ability.dotDurationMs) }}</span>
            </div>
            <div
              v-if="tooltip.ability.dotTickIntervalMs != null"
              class="boss-ability-tooltip__row"
            >
              <span class="boss-ability-tooltip__label">Интервал тика:</span>
              <span>{{ formatMs(tooltip.ability.dotTickIntervalMs) }}</span>
            </div>
            <div
              v-if="tooltip.ability.dotDamagePerTick != null"
              class="boss-ability-tooltip__row"
            >
              <span class="boss-ability-tooltip__label">Урон за тик:</span>
              <span>{{ tooltip.ability.dotDamagePerTick }}</span>
            </div>
            <div
              v-if="tooltip.ability.description"
              class="boss-ability-tooltip__description"
            >
              {{ tooltip.ability.description }}
            </div>
            <div
              v-if="tooltip.ability.requiredDefensiveTag"
              class="boss-ability-tooltip__row boss-ability-tooltip__row--tag"
            >
              <span class="boss-ability-tooltip__label">Требует защиту:</span>
              <span>{{ tooltip.ability.requiredDefensiveTag }}</span>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- <div class="boss-select-entry__rarity">
        {{ rarityLabel(boss.rarity) }}
      </div> -->

      <div class="boss-select-entry__actions">
        <button
          class="boss-select-entry__action boss-select-entry__action--fight"
          type="button"
          title="В бой"
          @click="emit('select', boss)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="4"
              y1="4"
              x2="20"
              y2="20"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="20"
              y1="4"
              x2="4"
              y2="20"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="2"
              y1="6"
              x2="6"
              y2="2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="22"
              y1="6"
              x2="18"
              y2="2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="2"
              y1="18"
              x2="6"
              y2="22"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="22"
              y1="18"
              x2="18"
              y2="22"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          class="boss-select-entry__action boss-select-entry__action--info"
          type="button"
          title="Характеристики"
          :class="{ 'boss-select-entry__action--info-active': isInfoOpen }"
          @click.stop="emit('toggleInfo', boss)"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="10"
              cy="10"
              r="8.5"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <line
              x1="10"
              y1="9"
              x2="10"
              y2="14.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <circle cx="10" cy="6.25" r="0.9" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isInfoOpen" class="boss-select-entry__info-panel">
      <div class="boss-select-entry__stats">
        <div class="boss-select-entry__stat-row">
          <span>HP</span><span>{{ boss.stats.maxHp }}</span>
        </div>
        <div class="boss-select-entry__stat-row">
          <span>Атака</span><span>{{ boss.stats.power }}</span>
        </div>
        <div class="boss-select-entry__stat-row">
          <span>Броня</span><span>{{ boss.stats.armor }}</span>
        </div>
        <div class="boss-select-entry__stat-row">
          <span>Скорость</span><span>{{ boss.stats.speed }}</span>
        </div>
        <div class="boss-select-entry__stat-row">
          <span>Крит</span
          ><span>{{ Math.round(boss.stats.chanceCrit * 100) }}%</span>
        </div>
        <div class="boss-select-entry__stat-row">
          <span>Уклонение</span
          ><span>{{ Math.round(boss.stats.evasion * 100) }}%</span>
        </div>
        <div class="boss-select-entry__stat-row">
          <span>Опыт</span><span>{{ boss.xpReward }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
