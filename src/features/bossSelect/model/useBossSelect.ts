import { ref } from "vue";
import { useRouter } from "vue-router";
import type { Boss, Buff, Debuff } from "@/entities/boss/model";
import { useCharacterStore } from "@/app/store/character";

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
  const characterStore = useCharacterStore();
  const selectedInfo = ref<Boss | null>(null);
  const inventoryWarningOpen = ref(false);

  const handleSelectBoss = (boss: Boss) => {
    const hasFreeInventorySlot = characterStore.inventory.some(
      (slot) => slot === null,
    );
    if (!hasFreeInventorySlot) {
      inventoryWarningOpen.value = true;
      return;
    }
    router.push({ name: "battle", params: { bossId: boss.id } });
  };

  const closeInventoryWarning = () => {
    inventoryWarningOpen.value = false;
  };

  const openInfo = (boss: Boss) => {
    selectedInfo.value = selectedInfo.value?.id === boss.id ? null : boss;
  };

  const buffRows = (boss: Boss) => chunkBy5<Buff>(boss.buffs ?? []);
  const debuffRows = (boss: Boss) => chunkBy5<Debuff>(boss.debuffs ?? []);

  return {
    selectedInfo,
    inventoryWarningOpen,
    handleSelectBoss,
    openInfo,
    closeInventoryWarning,
    buffRows,
    debuffRows,
  };
}
