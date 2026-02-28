import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import type { Boss, Stats } from "@/entities/boss/model";
import type { ActiveEffect } from "@/shared/lib/effects/types";
import bossesData from "@/entities/boss/bosses.json";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { ABILITIES } from "@/features/abilities/model/abilities";
import type { Ability } from "@/features/abilities/model/types";
import { useCooldowns } from "@/shared/lib/cooldowns/useCooldowns";
import { expGainedFromMonster } from "@/shared/lib/experience/experience";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { usePlayerHp } from "@/features/character/model/usePlayerHp";
import { useCharacterStore } from "@/app/store/character";
import { getItem } from "@/entities/item/items-db";
import type { Item } from "@/entities/item/model";

const rng = () => Math.random();

const cloneStats = (stats: Stats): Stats => ({
  hp: stats.hp,
  maxHp: stats.maxHp,
  power: stats.power,
  chanceCrit: stats.chanceCrit,
  evasion: stats.evasion,
  speed: stats.speed ?? 2,
  armor: stats.armor ?? 0,
});

const clampHp = (stats: Stats) => {
  stats.hp = Math.max(0, Math.min(stats.hp, stats.maxHp));
};

const calcHit = (attacker: Stats, defender: Stats) => {
  const isDodged = rng() < defender.evasion;
  if (isDodged) {
    return { damage: 0, isCrit: false, isDodged: true };
  }

  const isCrit = rng() < attacker.chanceCrit;
  const base = Math.floor(attacker.power * (0.9 + Math.random() * 0.2));
  const raw = Math.round(base * (isCrit ? 1.7 : 1));
  // Броня снижает урон: каждая единица брони уменьшает урон на 1, минимум 1
  const damage = Math.max(1, raw - (defender.armor ?? 0));
  return { damage, isCrit, isDodged: false };
};

const formatCooldown = (ms: number) => {
  if (ms <= 0) return "";
  return `${(ms / 1000).toFixed(1)}с`;
};

export function useBattle(bossId: () => string | undefined) {
  const bosses = bossesData as Boss[];
  const playerProgress = usePlayerProgress();
  const characterStore = useCharacterStore();
  const playerHp = usePlayerHp();

  const basePlayerStats = cloneStats(PLAYER_CHARACTER.stats);

  const buildPlayerStatsForLevel = (level: number): Stats => {
    const bonusHp = (level - 1) * 20;
    const bonusPower = (level - 1) * 2;
    const equipStats = characterStore.equipmentStats;

    return {
      hp: basePlayerStats.maxHp + bonusHp + equipStats.hp,
      maxHp: basePlayerStats.maxHp + bonusHp + equipStats.hp,
      power: basePlayerStats.power + bonusPower + equipStats.power,
      chanceCrit: Math.min(1, basePlayerStats.chanceCrit + equipStats.chanceCrit),
      evasion: Math.min(1, basePlayerStats.evasion + equipStats.evasion),
      speed: (basePlayerStats.speed ?? 2) + (equipStats.speed ?? 0),
      armor: (basePlayerStats.armor ?? 0) + (equipStats.armor ?? 0),
    };
  };

  const calcMaxHp = (level: number) => {
    const bonusHp = (level - 1) * 20;
    return basePlayerStats.maxHp + bonusHp + characterStore.equipmentStats.hp;
  };

  const selectedBoss = computed(() => {
    const id = bossId();
    return bosses.find((b) => b.id === id) ?? bosses[0];
  });

  const initialStats = buildPlayerStatsForLevel(playerProgress.level.value);
  playerHp.init(initialStats.maxHp);

  const player = reactive({
    name: PLAYER_CHARACTER.name,
    stats: {
      ...initialStats,
      hp: playerHp.hp.value,
    },
  });

  const boss = reactive({
    name: selectedBoss.value?.name ?? "Босс",
    level: selectedBoss.value?.level ?? 1,
    image: selectedBoss.value?.image ?? undefined,
    stats: cloneStats(selectedBoss.value?.stats ?? PLAYER_CHARACTER.stats),
  });

  const applySelectedBoss = () => {
    const next = selectedBoss.value;
    if (!next) return;
    boss.name = next.name;
    boss.level = next.level;
    boss.image = next.image;
    boss.stats = cloneStats(next.stats);
  };

  watch(selectedBoss, () => {
    applySelectedBoss();
  });

  const battleLog = ref<string[]>([]);

  /** Баффы на персонаже игрока */
  const playerBuffs = ref<ActiveEffect[]>([]);
  /** Дебаффы на персонаже игрока */
  const playerDebuffs = ref<ActiveEffect[]>([]);
  /** Баффы на боссе (которые босс наложил на себя) */
  const bossBuffs = ref<ActiveEffect[]>([]);
  /** Дебаффы на боссе (которые игрок наложил на босса) */
  const bossDebuffs = ref<ActiveEffect[]>([]);

  /** Кровотечение на боссе: урон за тик и время окончания */
  const bossBleed = ref<{ damagePerTick: number; endTime: number } | null>(null);
  let bleedIntervalId: ReturnType<typeof setInterval> | null = null;
  let bleedEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Дебафф брони на боссе: значение снижения и время окончания */
  const bossArmorDebuff = ref<{ value: number; endTime: number } | null>(null);
  let armorDebuffTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const pushLog = (line: string) => {
    battleLog.value = [line, ...battleLog.value].slice(0, 12);
  };

  /** Общий тикер: обновляет durationSeconds всех активных эффектов */
  let effectsTickerId: ReturnType<typeof setInterval> | null = null;

  const startEffectsTicker = () => {
    if (effectsTickerId !== null) return;
    effectsTickerId = setInterval(() => {
      const now = Date.now();
      const updateList = (list: ActiveEffect[]) => {
        list.forEach((e) => {
          if (e.endTime !== undefined) {
            e.durationSeconds = Math.max(0, (e.endTime - now) / 1000);
          }
        });
      };
      updateList(playerBuffs.value);
      updateList(playerDebuffs.value);
      updateList(bossDebuffs.value);
      updateList(bossBuffs.value);
    }, 100);
  };

  const stopEffectsTicker = () => {
    if (effectsTickerId !== null) {
      clearInterval(effectsTickerId);
      effectsTickerId = null;
    }
  };

  const loot = ref<Item[]>([]);
  const showLoot = ref(false);

  const isBattleOver = computed(
    () => player.stats.hp <= 0 || boss.stats.hp <= 0,
  );

  const winnerText = computed(() => {
    if (!isBattleOver.value) return "";
    if (player.stats.hp <= 0 && boss.stats.hp <= 0) return "Ничья.";
    if (boss.stats.hp <= 0) return "Победа! Босс повержен.";
    return "Поражение. Ты пал в бою.";
  });

  const playerHpPercent = computed(() =>
    Math.max(0, Math.round((player.stats.hp / player.stats.maxHp) * 100)),
  );
  const bossHpPercent = computed(() =>
    Math.max(0, Math.round((boss.stats.hp / boss.stats.maxHp) * 100)),
  );

  const { cooldownsLeftMs, setCooldown, isReady, resetAll: resetCooldowns } =
    useCooldowns();

  /** Глобальный кулдаун (GCD) — 2 секунды, применяется ко всем способностям */
  const GCD_MS = 2000;
  const {
    cooldownsLeftMs: gcdLeftMs,
    setCooldown: setGcd,
    isReady: isGcdReady,
    resetAll: resetGcd,
  } = useCooldowns();

  const GCD_KEY = "__gcd__";

  const isAbilityReady = (id: string) => isReady(id) && isGcdReady(GCD_KEY);

  /**
   * Возвращает оставшийся кулдаун для способности с учётом GCD.
   * Если GCD > собственного кулдауна способности — возвращает GCD.
   */
  const cooldownLeftMs = (id: string): number =>
    Math.max(cooldownsLeftMs[id] ?? 0, gcdLeftMs[GCD_KEY] ?? 0);

  /** Собственный кулдаун способности без учёта GCD */
  const ownCooldownLeftMs = (id: string): number => cooldownsLeftMs[id] ?? 0;

  const abilityCooldownText = (id: string) => formatCooldown(cooldownLeftMs(id));

  /**
   * Ставит кулдаун на способность + запускает GCD для всех прочих.
   * GCD берётся как максимум из GCD_MS и текущего собственного кулдауна,
   * чтобы при коротком кулдауне GCD не «продлевал» его.
   */
  const triggerCooldowns = (id: string, ms: number) => {
    setCooldown(id, ms);
    setGcd(GCD_KEY, GCD_MS);
  };

  const powerBoostLeftMs = ref(0);
  const powerBoostValue = ref(0);
  let powerBoostTimer: number | null = null;

  const playerPower = computed(() => player.stats.power + powerBoostValue.value);
  const bossPower = computed(() => boss.stats.power);

  const stopPowerBoostTimer = () => {
    if (powerBoostTimer === null) return;
    window.clearInterval(powerBoostTimer);
    powerBoostTimer = null;
  };

  const startPowerBoost = (value: number, durationMs: number) => {
    stopPowerBoostTimer();
    powerBoostValue.value = value;
    powerBoostLeftMs.value = durationMs;

    const startedAt = Date.now();
    powerBoostTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      powerBoostLeftMs.value = Math.max(0, durationMs - elapsed);
      if (powerBoostLeftMs.value <= 0) {
        stopPowerBoostTimer();
        powerBoostValue.value = 0;
      }
    }, 100);
  };

  const clearBossBleed = () => {
    if (bleedIntervalId !== null) {
      clearInterval(bleedIntervalId);
      bleedIntervalId = null;
    }
    if (bleedEndTimeoutId !== null) {
      clearTimeout(bleedEndTimeoutId);
      bleedEndTimeoutId = null;
    }
    bossBleed.value = null;
    bossDebuffs.value = bossDebuffs.value.filter((e) => e.id !== "bleed");
  };

  const clearBossArmorDebuff = () => {
    if (armorDebuffTimeoutId !== null) {
      clearTimeout(armorDebuffTimeoutId);
      armorDebuffTimeoutId = null;
    }
    bossArmorDebuff.value = null;
    bossDebuffs.value = bossDebuffs.value.filter((e) => e.id !== "armor-break");
  };

  const handleAbility = (ability: Ability) => {
    if (isBattleOver.value) return;
    if (!isAbilityReady(ability.id)) return;

    if (ability.type === "damage") {
      const effectiveBossArmor = bossArmorDebuff.value
        ? Math.max(0, boss.stats.armor - bossArmorDebuff.value.value)
        : boss.stats.armor;
      const defenderStats: Stats = { ...boss.stats, armor: effectiveBossArmor };

      // Способность с кровотечением: плоский урон + DoT
      if (ability.bleedDamage !== undefined && ability.bleedDurationMs !== undefined && ability.bleedTickIntervalMs !== undefined) {
        const dmg = ability.value;
        boss.stats.hp -= dmg;
        clampHp(boss.stats);
        pushLog(`Ты нанёс ${dmg} урона и наложил кровотечение.`);

        clearBossBleed();
        const endTime = Date.now() + ability.bleedDurationMs;
        bossBleed.value = { damagePerTick: ability.bleedDamage, endTime };
        bossDebuffs.value = [
          ...bossDebuffs.value,
          { id: "bleed", name: "Кровотечение", icon: "IconBleed", durationSeconds: ability.bleedDurationMs / 1000, endTime },
        ];
        bleedIntervalId = setInterval(() => {
          if (!bossBleed.value || isBattleOver.value) return;
          if (Date.now() >= bossBleed.value!.endTime) {
            clearBossBleed();
            return;
          }
          const tickDmg = bossBleed.value!.damagePerTick;
          boss.stats.hp -= tickDmg;
          clampHp(boss.stats);
          pushLog(`Кровотечение: −${tickDmg} HP у босса.`);
        }, ability.bleedTickIntervalMs);
        bleedEndTimeoutId = setTimeout(clearBossBleed, ability.bleedDurationMs);
        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // Способность с дебаффом брони: плоский урон + снижение брони
      if (ability.armorDebuff !== undefined && ability.armorDebuffDurationMs !== undefined) {
        const dmg = ability.value;
        boss.stats.hp -= dmg;
        clampHp(boss.stats);
        pushLog(`Ты нанёс ${dmg} урона и снизил броню босса на ${ability.armorDebuff}.`);

        clearBossArmorDebuff();
        const endTime = Date.now() + ability.armorDebuffDurationMs;
        bossArmorDebuff.value = { value: ability.armorDebuff, endTime };
        bossDebuffs.value = [
          ...bossDebuffs.value,
          { id: "armor-break", name: "Срез брони", icon: "IconArmorBreak", durationSeconds: ability.armorDebuffDurationMs / 1000, endTime },
        ];
        armorDebuffTimeoutId = setTimeout(() => {
          clearBossArmorDebuff();
        }, ability.armorDebuffDurationMs);
        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // Обычная атака
      const attacker: Stats = { ...player.stats, power: playerPower.value };
      const { damage, isCrit, isDodged } = calcHit(attacker, defenderStats);
      if (isDodged) {
        pushLog("Ты атаковал, но босс уклонился.");
      } else {
        boss.stats.hp -= damage;
        clampHp(boss.stats);
        pushLog(`Ты нанёс ${damage} урона${isCrit ? " (крит)" : ""}.`);
      }
      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

    if (ability.type === "heal") {
      const before = player.stats.hp;
      player.stats.hp += ability.value;
      clampHp(player.stats);
      const healed = player.stats.hp - before;
      pushLog(`Ты восстановил ${healed} HP.`);
      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

    if (ability.type === "buff") {
      const duration = ability.durationMs ?? 0;
      startPowerBoost(ability.value, duration);
      pushLog(`Ты усилил атаку на +${ability.value} на ${(duration / 1000).toFixed(0)}с.`);
      triggerCooldowns(ability.id, ability.cooldownMs);

      // Добавляем бафф в слоты игрока
      playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
      const buffEndTime = Date.now() + duration;
      playerBuffs.value = [
        ...playerBuffs.value,
        {
          id: ability.id,
          name: ability.name,
          icon: ability.icon ?? "IconPowerBoost",
          durationSeconds: duration / 1000,
          endTime: buffEndTime,
        },
      ];
      // Убираем бафф из слотов по истечении
      setTimeout(() => {
        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
      }, duration);
    }
  };

  let bossAttackTimer: number | null = null;

  const stopBossAutoAttack = () => {
    if (bossAttackTimer === null) return;
    window.clearTimeout(bossAttackTimer);
    bossAttackTimer = null;
  };

  const scheduleNextBossAttack = () => {
    stopBossAutoAttack();
    if (isBattleOver.value) return;
    // speed 1 → ~4000мс, speed 5 → ~1500мс; случайный разброс ±500мс
    const speed = boss.stats.speed ?? 2;
    const baseDelay = Math.max(1500, 4500 - speed * 600);
    const delay = baseDelay + Math.floor(rng() * 1000) - 500;
    bossAttackTimer = window.setTimeout(() => {
      if (isBattleOver.value) return;

      const attacker: Stats = { ...boss.stats, power: bossPower.value };
      const { damage, isCrit, isDodged } = calcHit(attacker, player.stats);

      if (isDodged) {
        pushLog("Босс атаковал, но ты уклонился.");
      } else {
        player.stats.hp -= damage;
        clampHp(player.stats);
        pushLog(`Босс нанёс ${damage} урона${isCrit ? " (крит)" : ""}.`);
      }

      scheduleNextBossAttack();
    }, delay);
  };

  const resetBattle = () => {
    stopBossAutoAttack();
    stopPowerBoostTimer();
    resetCooldowns();
    resetGcd();

    const newMaxHp = calcMaxHp(playerProgress.level.value);
    playerHp.updateMaxHp(newMaxHp);

    const freshStats = buildPlayerStatsForLevel(playerProgress.level.value);
    player.stats = {
      ...freshStats,
      hp: playerHp.hp.value,
    };
    applySelectedBoss();

    powerBoostValue.value = 0;
    powerBoostLeftMs.value = 0;
    battleLog.value = [];
    loot.value = [];
    showLoot.value = false;
    playerBuffs.value = [];
    playerDebuffs.value = [];
    bossBuffs.value = [];
    bossDebuffs.value = [];
    clearBossBleed();
    clearBossArmorDebuff();

    scheduleNextBossAttack();
  };

  const takeLootItem = (item: Item) => {
    const success = characterStore.addItemToInventory(item);
    if (success) {
      loot.value = loot.value.filter((i) => i.id !== item.id);
      pushLog(`Получен предмет: ${item.name}`);
    }
  };

  // Синхронизируем HP игрока в хранилище при каждом изменении
  watch(
    () => player.stats.hp,
    (hp) => playerHp.setHp(hp),
  );

  watch(isBattleOver, (over) => {
    if (over) {
      clearBossBleed();
      clearBossArmorDebuff();
      // Сохраняем финальное HP сразу после окончания боя
      playerHp.saveHp();

      if (boss.stats.hp <= 0 && player.stats.hp > 0) {
        const monsterLevel = boss.level;
        const xp = expGainedFromMonster(monsterLevel);
        if (xp > 0) {
          playerProgress.addXp(xp);
          pushLog(`Ты получаешь ${xp} опыта.`);
        }

        const bossLoot = selectedBoss.value?.loot ?? [];
        loot.value = bossLoot
          .map((itemId) => getItem(itemId))
          .filter((item): item is Item => item !== null);

        if (loot.value.length > 0) {
          showLoot.value = true;
        }
      }
      stopBossAutoAttack();
      stopPowerBoostTimer();
      powerBoostValue.value = 0;
      powerBoostLeftMs.value = 0;
    } else {
      scheduleNextBossAttack();
    }
  });

  onMounted(() => {
    applySelectedBoss();
    scheduleNextBossAttack();
    startEffectsTicker();
  });

  onUnmounted(() => {
    stopBossAutoAttack();
    stopPowerBoostTimer();
    stopEffectsTicker();
  });

  const abilityButtons = computed(() => ABILITIES);

  return {
    player,
    boss,
    selectedBoss,
    battleLog,
    isBattleOver,
    winnerText,
    playerHpPercent,
    bossHpPercent,
    abilityButtons,
    isAbilityReady,
    abilityCooldownText,
    cooldownLeftMs,
    ownCooldownLeftMs,
    handleAbility,
    resetBattle,
    powerBoostLeftMs,
    powerBoostValue,
    playerPower,
    loot,
    showLoot,
    takeLootItem,
    playerBuffs,
    playerDebuffs,
    bossBuffs,
    bossDebuffs,
  };
}
