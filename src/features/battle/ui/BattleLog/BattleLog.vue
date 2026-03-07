<script setup lang="ts">
import type { BattleLogEntry } from "../../model/useBattle";
import "./BattleLog.scss";

defineProps<{
  lines: BattleLogEntry[];
}>();
</script>

<template>
  <div v-if="lines.length" class="battle-log">
    <div class="battle-log__title">Лог</div>
    <div class="battle-log__lines">
      <div
        v-for="(line, idx) in lines"
        :key="idx"
        class="battle-log__line"
        :class="`battle-log__line--${line.type}`"
      >
        {{ line.text }}
      </div>
    </div>
  </div>
</template>
