<script setup lang="ts">
import type { Boss, Buff, Debuff } from "@/entities/boss/model";
import { rarityLabel } from "@/shared/lib/labels";
import { getBossDropItemLevel } from "@/features/bossSelect/lib/getBossLoot";

defineProps<{
  boss: Boss;
  isInfoOpen: boolean;
  buffRows: (boss: Boss) => Buff[][];
  debuffRows: (boss: Boss) => Debuff[][];
}>();

const emit = defineEmits<{
  select: [boss: Boss];
  toggleInfo: [boss: Boss];
}>();
</script>

<template>
  <div
    class="boss-select-entry"
    :class="`boss-select-entry--${boss.rarity}`"
  >
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
          <circle cx="24" cy="18" r="7" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
          <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <div class="boss-select-entry__level">{{ boss.level }}</div>
      </div>

      <div class="boss-select-entry__info">
        <div class="boss-select-entry__name">{{ boss.name }}</div>
        <div class="boss-select-entry__effects-row">
          <div v-if="(boss.buffs?.length ?? 0) > 0" class="boss-select-entry__effect-rows boss-select-entry__effect-rows--buff">
            <div v-for="(row, ri) in buffRows(boss)" :key="ri" class="boss-select-entry__effect-row">
              <div
                v-for="buff in row"
                :key="buff.id"
                class="boss-select-entry__effect-cell boss-select-entry__effect-cell--buff"
                :title="`${buff.name}: ${buff.description ?? ''}`"
              >
                {{ buff.icon }}
              </div>
            </div>
          </div>
          <div v-if="(boss.debuffs?.length ?? 0) > 0" class="boss-select-entry__effect-rows boss-select-entry__effect-rows--debuff">
            <div v-for="(row, ri) in debuffRows(boss)" :key="ri" class="boss-select-entry__effect-row">
              <div
                v-for="debuff in row"
                :key="debuff.id"
                class="boss-select-entry__effect-cell boss-select-entry__effect-cell--debuff"
                :title="`${debuff.name}: ${debuff.description ?? ''}`"
              >
                {{ debuff.icon }}
              </div>
            </div>
          </div>
          <div class="boss-select-entry__loot-desc">
            2 случайные вещи (ур. {{ getBossDropItemLevel(boss.level) }})
          </div>
        </div>
      </div>

      <div class="boss-select-entry__rarity">{{ rarityLabel(boss.rarity) }}</div>

      <div class="boss-select-entry__actions">
        <button
          class="boss-select-entry__action boss-select-entry__action--fight"
          type="button"
          title="В бой"
          @click="emit('select', boss)"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="2" y1="6" x2="6" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="22" y1="6" x2="18" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="2" y1="18" x2="6" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <line x1="22" y1="18" x2="18" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button
          class="boss-select-entry__action boss-select-entry__action--info"
          type="button"
          title="Характеристики"
          :class="{ 'boss-select-entry__action--info-active': isInfoOpen }"
          @click.stop="emit('toggleInfo', boss)"
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5" />
            <line x1="10" y1="9" x2="10" y2="14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="10" cy="6.25" r="0.9" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isInfoOpen" class="boss-select-entry__info-panel">
      <div class="boss-select-entry__stats">
        <div class="boss-select-entry__stat-row"><span>HP</span><span>{{ boss.stats.maxHp }}</span></div>
        <div class="boss-select-entry__stat-row"><span>Атака</span><span>{{ boss.stats.power }}</span></div>
        <div class="boss-select-entry__stat-row"><span>Броня</span><span>{{ boss.stats.armor }}</span></div>
        <div class="boss-select-entry__stat-row"><span>Скорость</span><span>{{ boss.stats.speed }}</span></div>
        <div class="boss-select-entry__stat-row"><span>Крит</span><span>{{ Math.round(boss.stats.chanceCrit * 100) }}%</span></div>
        <div class="boss-select-entry__stat-row"><span>Уклонение</span><span>{{ Math.round(boss.stats.evasion * 100) }}%</span></div>
        <div class="boss-select-entry__stat-row"><span>Опыт</span><span>{{ boss.xpReward }}</span></div>
      </div>
    </div>
  </div>
</template>
