import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import type { Boss, Buff, Debuff } from "@/entities/boss/model";
import bossesData from "@/entities/boss/bosses.json";

/** Разбить массив на строки по 5 ячеек */
function chunkBy5<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 5) {
    rows.push(arr.slice(i, i + 5));
  }
  return rows;
}

export function useBossSelect() {
  const router = useRouter();
  const selectedInfo = ref<Boss | null>(null);

  const bosses = computed<Boss[]>(() =>
    (bossesData as Boss[]).slice().sort((a, b) => a.level - b.level),
  );

  const handleSelectBoss = (boss: Boss) => {
    router.push({ name: "battle", params: { bossId: boss.id } });
  };

  const openInfo = (boss: Boss) => {
    selectedInfo.value = selectedInfo.value?.id === boss.id ? null : boss;
  };

  const buffRows = (boss: Boss) => chunkBy5<Buff>(boss.buffs ?? []);
  const debuffRows = (boss: Boss) => chunkBy5<Debuff>(boss.debuffs ?? []);

  return {
    bosses,
    selectedInfo,
    handleSelectBoss,
    openInfo,
    buffRows,
    debuffRows,
  };
}
