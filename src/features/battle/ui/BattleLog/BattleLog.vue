<script setup lang="ts">
import "./BattleLog.scss";

defineProps<{
  lines: string[];
}>();
</script>

<template>
  <div v-if="lines.length" class="battle-log">
    <div class="battle-log__title">Лог</div>
    <div class="battle-log__lines">
      <div v-for="(line, idx) in lines" :key="idx" class="battle-log__line">
        {{ line }}
      </div>
    </div>
  </div>
</template>
