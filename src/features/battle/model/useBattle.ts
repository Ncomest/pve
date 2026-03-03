import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import type { Boss, Stats } from "@/entities/boss/model";
import type { ActiveEffect } from "@/shared/lib/effects/types";
import bossesData from "@/entities/boss/bosses.json";
import { PLAYER_CHARACTER } from "@/entities/character/model";
import { ABILITIES, ALL_ABILITIES } from "@/features/abilities/model/abilities";
import type { Ability } from "@/features/abilities/model/types";
import { applyEffects } from "@/features/battle/model/applyAbilityEffects";
import type { BattleEffectContext } from "@/features/battle/model/applyAbilityEffects";
import { useCooldowns } from "@/shared/lib/cooldowns/useCooldowns";
import { expGainedFromMonster } from "@/shared/lib/experience/experience";
import { usePlayerProgress } from "@/features/character/model/usePlayerProgress";
import { usePlayerHp } from "@/features/character/model/usePlayerHp";
import { useCharacterStore } from "@/app/store/character";
import { getItem } from "@/entities/item/items-db";
import type { Item } from "@/entities/item/model";
import { useDamageNumbers } from "@/shared/ui/DamageNumbers/useDamageNumbers";

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

/** Множитель урона при крите по умолчанию (150%) */
const DEFAULT_CRIT_MULTIPLIER = 1.5;

const calcHit = (attacker: Stats, defender: Stats, critMultiplier: number = DEFAULT_CRIT_MULTIPLIER) => {
  const isDodged = rng() < defender.evasion;
  if (isDodged) {
    return { damage: 0, isCrit: false, isDodged: true };
  }

  const isCrit = rng() < attacker.chanceCrit;
  const base = Math.floor(attacker.power * (0.9 + Math.random() * 0.2));
  const raw = Math.round(base * (isCrit ? critMultiplier : 1));
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

  const { numbers: bossDamageNumbers, spawnNumber: spawnBossDmg } = useDamageNumbers();
  const { numbers: playerDamageNumbers, spawnNumber: spawnPlayerDmg } = useDamageNumbers();

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

  /** Комбо-поинты (0–6) для класса «Клинок и Яд» и др. */
  const comboPoints = ref(0);
  const COMBO_POINTS_MAX = 6;

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
  /** DoT от Ядовитого укуса: интервал и таймер окончания */
  let poisonDotIntervalId: ReturnType<typeof setInterval> | null = null;
  let poisonDotEndTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // --- Защитные баффы игрока ---

  /** Бонус уклонения от «Ускользания» (добавляется к player.stats.evasion при атаке) */
  const playerEvasionBonus = ref(0);
  let evasionBonusTimerId: ReturnType<typeof setTimeout> | null = null;

  /** «Уворот»: следующая атака босса гарантированно промахнётся */
  const dodgeNextAttack = ref(false);
  let dodgeNextExpireTimerId: ReturnType<typeof setTimeout> | null = null;

  /** «Плащ теней»: снижение получаемого урона в долях (0.2 = 20%) */
  const damageReductionPercent = ref(0);
  let damageReductionTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Стаки усиления «Потрошение» (от «Размашистого удара», макс 4) */
  const eviscerateStacks = ref(0);
  const EVISERATE_STACKS_MAX = 4;
  /** Бонус крита от «Размашистого удара» */
  const sweepingCritBonus = ref(0);
  let sweepingCritTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Бафф «Коварство»: следующий «Коварный удар» наносит +100% урона */
  const cunningBuffActive = ref(false);
  let cunningBuffTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Таймеры, созданные системой эффектов (очищаются при сбросе боя) */
  const effectTimeoutIds = ref<number[]>([]);
  const effectIntervalIds = ref<number[]>([]);
  /** Состояние хода для applyEffects (spentCombo, cunningConsumed) */
  const effectTurnState = reactive<{ spentCombo?: number; cunningConsumed?: boolean }>({});

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
  const GCD_BASE_MS = 2000;
  const {
    cooldownsLeftMs: gcdLeftMs,
    setCooldown: setGcd,
    isReady: isGcdReady,
    resetAll: resetGcd,
  } = useCooldowns();

  const GCD_KEY = "__gcd__";

  /**
   * Коэффициент скорости: speed=2 → 1.0 (без изменений),
   * каждый +1 speed снижает кулдауны на 10%.
   * Минимум 0.3 (70% снижение при очень высокой скорости).
   */
  const speedFactor = computed(() => {
    const speed = player.stats.speed ?? 2;
    return Math.max(0.3, 1 - (speed - 2) * 0.1);
  });

  /** GCD с учётом скорости персонажа */
  const GCD_MS = computed(() => Math.round(GCD_BASE_MS * speedFactor.value));

  /** Применяет коэффициент скорости к кулдауну способности */
  const applySpeed = (ms: number): number => Math.max(0, Math.round(ms * speedFactor.value));

  const isAbilityReady = (id: string) => {
    if (!isReady(id) || !isGcdReady(GCD_KEY)) return false;
    // Финишер недоступен, если накоплено меньше минимума комбо-поинтов
    const ability = ALL_ABILITIES.find((a) => a.id === id);
    if (ability?.role === "finisher" && ability.comboCostMin !== undefined) {
      return comboPoints.value >= ability.comboCostMin;
    }
    return true;
  };

  /**
   * Возвращает оставшийся кулдаун для способности с учётом GCD.
   * Если GCD > собственного кулдауна способности — возвращает GCD.
   */
  const cooldownLeftMs = (id: string): number =>
    Math.max(cooldownsLeftMs[id] ?? 0, gcdLeftMs[GCD_KEY] ?? 0);

  /** Собственный кулдаун способности без учёта GCD */
  const ownCooldownLeftMs = (id: string): number => cooldownsLeftMs[id] ?? 0;

  /**
   * Эффективный максимум кулдауна для отображения прогресса (с учётом скорости).
   * Используется в UI, чтобы анимация затемнения всегда начиналась с верха иконки.
   */
  const effectiveMaxCooldownMs = (abilityId: string): number => {
    const own = cooldownsLeftMs[abilityId] ?? 0;
    if (own > 0) {
      const ability = ALL_ABILITIES.find((a) => a.id === abilityId);
      return ability ? applySpeed(ability.cooldownMs) : GCD_MS.value;
    }
    return GCD_MS.value;
  };

  const abilityCooldownText = (id: string) => formatCooldown(cooldownLeftMs(id));

  /**
   * Ставит кулдаун на способность + запускает GCD для всех прочих.
   * Оба значения масштабируются на speedFactor персонажа.
   */
  const triggerCooldowns = (id: string, ms: number) => {
    setCooldown(id, applySpeed(ms));
    setGcd(GCD_KEY, GCD_MS.value);
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

  const clearPoisonDot = (abilityId: string) => {
    if (poisonDotIntervalId !== null) {
      clearInterval(poisonDotIntervalId);
      poisonDotIntervalId = null;
    }
    if (poisonDotEndTimeoutId !== null) {
      clearTimeout(poisonDotEndTimeoutId);
      poisonDotEndTimeoutId = null;
    }
    bossDebuffs.value = bossDebuffs.value.filter((e) => e.id !== abilityId);
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

  /** Добавляет комбо-поинты, не превышая максимума */
  const gainCombo = (n: number) => {
    comboPoints.value = Math.min(COMBO_POINTS_MAX, comboPoints.value + n);
  };

  /** Тратит N комбо-поинтов (финишер), возвращает потраченное количество */
  const spendCombo = (): number => {
    const spent = comboPoints.value;
    comboPoints.value = 0;
    return spent;
  };

  const handleAbility = (ability: Ability) => {
    if (isBattleOver.value) return;
    if (!isAbilityReady(ability.id)) return;

    // --- Способности с композицией эффектов ---
    if (ability.effects?.length) {
      effectTurnState.spentCombo = undefined;
      effectTurnState.cunningConsumed = ability.id === "cunning-strike" && cunningBuffActive.value;
      if (effectTurnState.cunningConsumed) {
        cunningBuffActive.value = false;
        if (cunningBuffTimerId !== null) {
          clearTimeout(cunningBuffTimerId);
          cunningBuffTimerId = null;
        }
        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "cunning-buff");
      }
      const ctx: BattleEffectContext = {
        player,
        boss,
        getPlayerPower: () => playerPower.value,
        getEffectiveBossArmor: () =>
          bossArmorDebuff.value
            ? Math.max(0, boss.stats.armor - bossArmorDebuff.value.value)
            : boss.stats.armor,
        getEffectivePlayerCrit: () =>
          Math.min(1, player.stats.chanceCrit + sweepingCritBonus.value + (ability.chanceCrit ?? 0)),
        comboPoints,
        COMBO_POINTS_MAX,
        gainCombo,
        spendCombo,
        playerBuffs,
        bossDebuffs,
        eviscerateStacks,
        EVISERATE_STACKS_MAX,
        setPlayerEvasionBonus: (v) => { playerEvasionBonus.value = v; },
        setDodgeNextAttack: (v) => { dodgeNextAttack.value = v; },
        setDamageReductionPercent: (v) => { damageReductionPercent.value = v; },
        setSweepingCritBonus: (v) => { sweepingCritBonus.value = v; },
        setCunningBuffActive: (v) => { cunningBuffActive.value = v; },
        setEviscerateStacks: (v) => { eviscerateStacks.value = v; },
        bossBleed,
        setBossBleed: (v) => { bossBleed.value = v; },
        clearBossBleed,
        bossArmorDebuff,
        setBossArmorDebuff: (v) => { bossArmorDebuff.value = v; },
        clearBossArmorDebuff,
        pushLog,
        calcHit: (a, d) => calcHit(a, d, ability.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER),
        clampHp,
        isBattleOver: () => isBattleOver.value,
        addTimeoutId: (id) => { effectTimeoutIds.value.push(id); },
        addIntervalId: (id) => { effectIntervalIds.value.push(id); },
        startPowerBoost,
        spawnBossDmg,
        spawnPlayerDmg,
        turnState: effectTurnState,
      };
      applyEffects(ctx, { id: ability.id, name: ability.name, icon: ability.icon }, ability.effects);
      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

    // --- Генераторы комбо-поинтов ---
    if (ability.role === "generator" && ability.baseDamageX !== undefined) {
      const effectiveBossArmor = bossArmorDebuff.value
        ? Math.max(0, boss.stats.armor - bossArmorDebuff.value.value)
        : boss.stats.armor;
      const defenderStats: Stats = { ...boss.stats, armor: effectiveBossArmor };
      // Бонус крита от «Размашистого удара» + шанс крита способности
      const attacker: Stats = {
        ...player.stats,
        power: playerPower.value,
        chanceCrit: Math.min(1, player.stats.chanceCrit + sweepingCritBonus.value + (ability.chanceCrit ?? 0)),
      };
      const { damage, isCrit, isDodged } = calcHit(attacker, defenderStats, ability.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER);

      if (isDodged) {
        pushLog(`${ability.name}: босс уклонился.`);
      } else {
        // «Коварство»: Коварный удар наносит +100% урона
        let finalDamage = damage;
        let cunningNote = "";
        if (ability.id === "cunning-strike" && cunningBuffActive.value) {
          finalDamage = damage * 2;
          cunningBuffActive.value = false;
          if (cunningBuffTimerId !== null) { clearTimeout(cunningBuffTimerId); cunningBuffTimerId = null; }
          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "cunning-buff");
          cunningNote = " (×2 Коварство)";
        }

        boss.stats.hp -= finalDamage;
        clampHp(boss.stats);
        spawnBossDmg(finalDamage, "damage", isCrit);
        const gain = ability.comboGain ?? 1;
        gainCombo(gain);

        const logParts: string[] = [`${ability.name}: ${finalDamage} урона${isCrit ? " (крит)" : ""}${cunningNote}. Комбо: ${comboPoints.value}/${COMBO_POINTS_MAX}`];

        // «Размашистый удар»: стак Потрошения + бафф крита
        if (ability.eviscerateStacksGain) {
          eviscerateStacks.value = Math.min(EVISERATE_STACKS_MAX, eviscerateStacks.value + ability.eviscerateStacksGain);

          // Обновляем индикатор: находим существующий и меняем stacks реактивно,
          // либо добавляем новый если его ещё нет
          const existing = playerBuffs.value.find((e) => e.id === "eviserate-stacks");
          if (existing) {
            existing.stacks = eviscerateStacks.value;
            existing.name = `Потрошение (${eviscerateStacks.value}/${EVISERATE_STACKS_MAX})`;
          } else {
            playerBuffs.value = [...playerBuffs.value, {
              id: "eviserate-stacks",
              name: `Потрошение (${eviscerateStacks.value}/${EVISERATE_STACKS_MAX})`,
              icon: "IconBleed",
              durationSeconds: 0,
              stacks: eviscerateStacks.value,
            }];
          }

          logParts.push(`Стаки Потрошение: ${eviscerateStacks.value}/${EVISERATE_STACKS_MAX}`);
        }

        // «Размашистый удар»: бафф шанса крита на 3с
        if (ability.selfBuffCritPercent !== undefined && ability.selfBuffCritDurationMs !== undefined) {
          if (sweepingCritTimerId !== null) clearTimeout(sweepingCritTimerId);
          sweepingCritBonus.value = ability.selfBuffCritPercent;

          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "sweeping-crit");
          const critEndTime = Date.now() + ability.selfBuffCritDurationMs;
          playerBuffs.value = [...playerBuffs.value, {
            id: "sweeping-crit",
            name: `Крит +${Math.round(ability.selfBuffCritPercent * 100)}%`,
            icon: "IconPowerBoost",
            durationSeconds: ability.selfBuffCritDurationMs / 1000,
            endTime: critEndTime,
          }];

          sweepingCritTimerId = setTimeout(() => {
            sweepingCritBonus.value = 0;
            playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "sweeping-crit");
            sweepingCritTimerId = null;
          }, ability.selfBuffCritDurationMs);

          logParts.push(`+${Math.round(ability.selfBuffCritPercent * 100)}% крит на ${ability.selfBuffCritDurationMs / 1000}с`);
        }

        pushLog(logParts.join(". "));
      }

      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

    // --- Финишеры (расходуют комбо-поинты) ---
    if (ability.role === "finisher" && ability.baseDamageX !== undefined) {
      const costMin = ability.comboCostMin ?? 1;
      if (comboPoints.value < costMin) {
        pushLog(`${ability.name}: нужно минимум ${costMin} комбо-поинтов (сейчас ${comboPoints.value}).`);
        return;
      }

      const n = spendCombo();

      // Финишер с DoT (Ядовитый укус): мгновенный урон + яд
      if (ability.dotDurationMs !== undefined && ability.dotTickIntervalMs !== undefined && ability.dotTickDamageMultiplier !== undefined) {
        const instantRatio = ability.dotInstantDamageRatio ?? 0.5;
        const instantDmg = Math.round(ability.baseDamageX * playerPower.value * instantRatio);
        if (instantDmg > 0) {
          boss.stats.hp -= instantDmg;
          clampHp(boss.stats);
          spawnBossDmg(instantDmg, "damage");
        }

        const tickDmg = Math.round(ability.baseDamageX * ability.dotTickDamageMultiplier * playerPower.value * n);

        // Очищаем предыдущий DoT от той же способности (включая старые таймеры)
        clearPoisonDot(ability.id);

        const endTime = Date.now() + ability.dotDurationMs;
        bossDebuffs.value = [
          ...bossDebuffs.value,
          {
            id: ability.id,
            name: ability.name,
            icon: ability.icon ?? "IconBleed",
            durationSeconds: ability.dotDurationMs / 1000,
            endTime,
          },
        ];

        const procChance = ability.dotProcChance ?? 0;
        const procBuffDurationMs = ability.dotProcBuffDurationMs ?? 15_000;

        poisonDotIntervalId = setInterval(() => {
          if (isBattleOver.value || Date.now() >= endTime) {
            return;
          }
          boss.stats.hp -= tickDmg;
          clampHp(boss.stats);
          spawnBossDmg(tickDmg, "damage");

          // 15% шанс получить бафф «Коварство» (следующий Коварный удар +100% урона)
          if (procChance > 0 && rng() < procChance) {
            cunningBuffActive.value = true;
            if (cunningBuffTimerId !== null) clearTimeout(cunningBuffTimerId);

            playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "cunning-buff");
            const buffEndTime = Date.now() + procBuffDurationMs;
            playerBuffs.value = [...playerBuffs.value, {
              id: "cunning-buff",
              name: "Коварство",
              icon: "IconCunningStrike",
              durationSeconds: procBuffDurationMs / 1000,
              endTime: buffEndTime,
            }];

            cunningBuffTimerId = setTimeout(() => {
              cunningBuffActive.value = false;
              playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "cunning-buff");
              cunningBuffTimerId = null;
            }, procBuffDurationMs);

            pushLog(`Яд (${ability.name}): −${tickDmg} HP. Сработало «Коварство»!`);
          } else {
            pushLog(`Яд (${ability.name}): −${tickDmg} HP у босса.`);
          }
        }, ability.dotTickIntervalMs);

        poisonDotEndTimeoutId = setTimeout(() => {
          if (poisonDotIntervalId !== null) {
            clearInterval(poisonDotIntervalId);
            poisonDotIntervalId = null;
          }
          poisonDotEndTimeoutId = null;
          bossDebuffs.value = bossDebuffs.value.filter((e) => e.id !== ability.id);
        }, ability.dotDurationMs);

        pushLog(`${ability.name}: ${instantDmg} урона мгновенно + яд ${Math.round(ability.dotDurationMs / 1000)}с (${n} комбо). Комбо сброшено.`);
        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // Обычный финишер (Потрошение) — учитывает стаки усиления
      const stackBonus = eviscerateStacks.value * (ability.eviscerateStackBonusPercent ?? 0.15);
      const baseDmg = Math.round(ability.baseDamageX * playerPower.value * n * (1 + stackBonus));

      boss.stats.hp -= baseDmg;
      clampHp(boss.stats);
      spawnBossDmg(baseDmg, "damage");

      const stackNote = eviscerateStacks.value > 0
        ? ` (+${Math.round(stackBonus * 100)}% от ${eviscerateStacks.value} стак.)`
        : "";
      pushLog(`${ability.name}: ${baseDmg} урона${stackNote} (${n} комбо). Комбо сброшено.`);

      // Тратим все стаки «Потрошение»
      eviscerateStacks.value = 0;
      playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "eviserate-stacks");

      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

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
        spawnBossDmg(dmg, "damage");
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
          spawnBossDmg(tickDmg, "damage");
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
        spawnBossDmg(dmg, "damage");
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
      const attacker: Stats = {
        ...player.stats,
        power: playerPower.value,
        chanceCrit: Math.min(1, player.stats.chanceCrit + (ability.chanceCrit ?? 0)),
      };
      const { damage, isCrit, isDodged } = calcHit(attacker, defenderStats, ability.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER);
      if (isDodged) {
        spawnBossDmg("Уклон", "dodge");
        pushLog("Ты атаковал, но босс уклонился.");
      } else {
        boss.stats.hp -= damage;
        clampHp(boss.stats);
        spawnBossDmg(damage, "damage", isCrit);
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
      // --- Ускользание: +evasion на время ---
      if (ability.role === "defense" && ability.defenseEvasionPercent !== undefined && ability.defenseEvasionDurationMs !== undefined) {
        if (evasionBonusTimerId !== null) clearTimeout(evasionBonusTimerId);
        playerEvasionBonus.value = ability.defenseEvasionPercent;

        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
        const endTime = Date.now() + ability.defenseEvasionDurationMs;
        playerBuffs.value = [...playerBuffs.value, {
          id: ability.id,
          name: ability.name,
          icon: ability.icon ?? "IconFlee",
          durationSeconds: ability.defenseEvasionDurationMs / 1000,
          endTime,
        }];
        pushLog(`${ability.name}: уклонение +${Math.round(ability.defenseEvasionPercent * 100)}% на ${ability.defenseEvasionDurationMs / 1000}с.`);

        evasionBonusTimerId = setTimeout(() => {
          playerEvasionBonus.value = 0;
          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
          evasionBonusTimerId = null;
        }, ability.defenseEvasionDurationMs);

        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // --- Уворот: 100% уклонение от следующей атаки ---
      if (ability.role === "defense" && ability.defenseDodgeNext) {
        dodgeNextAttack.value = true;
        if (dodgeNextExpireTimerId !== null) clearTimeout(dodgeNextExpireTimerId);

        const expireMs = ability.defenseDodgeExpireMs ?? 5000;
        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
        const endTime = Date.now() + expireMs;
        playerBuffs.value = [...playerBuffs.value, {
          id: ability.id,
          name: ability.name,
          icon: ability.icon ?? "IconFlee",
          durationSeconds: expireMs / 1000,
          endTime,
        }];
        pushLog(`${ability.name}: следующая атака босса промажет (${expireMs / 1000}с).`);

        dodgeNextExpireTimerId = setTimeout(() => {
          dodgeNextAttack.value = false;
          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
          dodgeNextExpireTimerId = null;
        }, expireMs);

        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // --- Блок: блокирует особые атаки (помечены флагом isSpecial) ---
      // Реализация флага isSpecial — на стороне данных босса; здесь активируем бафф
      if (ability.role === "defense" && ability.defenseBlockSpecials) {
        const blockDuration = ability.durationMs ?? 5000;
        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
        const endTime = Date.now() + blockDuration;
        playerBuffs.value = [...playerBuffs.value, {
          id: ability.id,
          name: ability.name,
          icon: ability.icon ?? "IconArmorBreak",
          durationSeconds: blockDuration / 1000,
          endTime,
        }];
        pushLog(`${ability.name}: особые атаки босса заблокированы на ${blockDuration / 1000}с.`);

        setTimeout(() => {
          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
        }, blockDuration);

        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // --- Плащ теней: снижение входящего урона ---
      if (ability.role === "defense" && ability.defenseDamageReductionPercent !== undefined && ability.defenseDamageReductionDurationMs !== undefined) {
        if (damageReductionTimerId !== null) clearTimeout(damageReductionTimerId);
        damageReductionPercent.value = ability.defenseDamageReductionPercent;

        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
        const endTime = Date.now() + ability.defenseDamageReductionDurationMs;
        playerBuffs.value = [...playerBuffs.value, {
          id: ability.id,
          name: ability.name,
          icon: ability.icon ?? "IconPowerBoost",
          durationSeconds: ability.defenseDamageReductionDurationMs / 1000,
          endTime,
        }];
        pushLog(`${ability.name}: входящий урон −${Math.round(ability.defenseDamageReductionPercent * 100)}% на ${ability.defenseDamageReductionDurationMs / 1000}с.`);

        damageReductionTimerId = setTimeout(() => {
          damageReductionPercent.value = 0;
          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
          damageReductionTimerId = null;
        }, ability.defenseDamageReductionDurationMs);

        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // --- Усиление атаки (стандартный бафф силы) ---
      const duration = ability.durationMs ?? 0;
      startPowerBoost(ability.value, duration);
      pushLog(`Ты усилил атаку на +${ability.value} на ${(duration / 1000).toFixed(0)}с.`);
      triggerCooldowns(ability.id, ability.cooldownMs);

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
      setTimeout(() => {
        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
      }, duration);
    }
  };

  let bossAttackTimer: number | null = null;

  /** Единая скорость атаки босса: 3600мс (3.6с) */
  const BOSS_ATTACK_INTERVAL_MS = 3600;

  /** Кулдаун атаки босса для визуализации */
  const bossAttackCooldownLeft = ref(0);
  const bossAttackCooldownMax = BOSS_ATTACK_INTERVAL_MS;
  let bossAttackCooldownTickerId: number | null = null;

  const startBossAttackCooldownTicker = () => {
    if (bossAttackCooldownTickerId !== null) return;
    const startTime = Date.now();
    bossAttackCooldownLeft.value = BOSS_ATTACK_INTERVAL_MS;

    bossAttackCooldownTickerId = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      bossAttackCooldownLeft.value = Math.max(0, BOSS_ATTACK_INTERVAL_MS - elapsed);
      if (bossAttackCooldownLeft.value <= 0 && bossAttackCooldownTickerId !== null) {
        window.clearInterval(bossAttackCooldownTickerId);
        bossAttackCooldownTickerId = null;
      }
    }, 50);
  };

  const stopBossAttackCooldownTicker = () => {
    if (bossAttackCooldownTickerId !== null) {
      window.clearInterval(bossAttackCooldownTickerId);
      bossAttackCooldownTickerId = null;
    }
    bossAttackCooldownLeft.value = 0;
  };

  const stopBossAutoAttack = () => {
    if (bossAttackTimer === null) return;
    window.clearTimeout(bossAttackTimer);
    bossAttackTimer = null;
  };

  const scheduleNextBossAttack = () => {
    stopBossAutoAttack();
    if (isBattleOver.value) return;
    startBossAttackCooldownTicker();
    bossAttackTimer = window.setTimeout(() => {
      if (isBattleOver.value) return;

      const attacker: Stats = { ...boss.stats, power: bossPower.value };

      // «Уворот»: гарантированный промах от следующей атаки
      if (dodgeNextAttack.value) {
        dodgeNextAttack.value = false;
        if (dodgeNextExpireTimerId !== null) {
          clearTimeout(dodgeNextExpireTimerId);
          dodgeNextExpireTimerId = null;
        }
        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "dodge");
        pushLog("Босс атаковал — ты увернулся (Уворот)!");
        scheduleNextBossAttack();
        return;
      }

      // Считаем эффективное уклонение с бонусом от «Ускользания»
      const effectiveEvasion = Math.min(1, player.stats.evasion + playerEvasionBonus.value);
      const defenderStats: Stats = { ...player.stats, evasion: effectiveEvasion };
      const { damage, isCrit, isDodged } = calcHit(attacker, defenderStats);

      if (isDodged) {
        spawnPlayerDmg("Уклон", "dodge");
        pushLog("Босс атаковал, но ты уклонился.");
      } else {
        // «Плащ теней»: снижение получаемого урона
        const reduced = Math.round(damage * (1 - damageReductionPercent.value));
        const finalDmg = Math.max(1, reduced);
        player.stats.hp -= finalDmg;
        clampHp(player.stats);
        spawnPlayerDmg(finalDmg, "player-damage", isCrit);
        const reductionNote = damageReductionPercent.value > 0 ? ` (−${Math.round(damageReductionPercent.value * 100)}% Плащ)` : "";
        pushLog(`Босс нанёс ${finalDmg} урона${isCrit ? " (крит)" : ""}${reductionNote}.`);
      }

      scheduleNextBossAttack();
    }, BOSS_ATTACK_INTERVAL_MS);
  };

  const resetBattle = () => {
    stopBossAutoAttack();
    stopBossAttackCooldownTicker();
    stopPowerBoostTimer();
    effectTimeoutIds.value.forEach((id) => clearTimeout(id));
    effectTimeoutIds.value = [];
    effectIntervalIds.value.forEach((id) => clearInterval(id));
    effectIntervalIds.value = [];
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
    comboPoints.value = 0;

    eviscerateStacks.value = 0;
    playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "eviserate-stacks");
    sweepingCritBonus.value = 0;
    if (sweepingCritTimerId !== null) { clearTimeout(sweepingCritTimerId); sweepingCritTimerId = null; }
    cunningBuffActive.value = false;
    if (cunningBuffTimerId !== null) { clearTimeout(cunningBuffTimerId); cunningBuffTimerId = null; }

    playerEvasionBonus.value = 0;
    if (evasionBonusTimerId !== null) { clearTimeout(evasionBonusTimerId); evasionBonusTimerId = null; }

    dodgeNextAttack.value = false;
    if (dodgeNextExpireTimerId !== null) { clearTimeout(dodgeNextExpireTimerId); dodgeNextExpireTimerId = null; }

    damageReductionPercent.value = 0;
    if (damageReductionTimerId !== null) { clearTimeout(damageReductionTimerId); damageReductionTimerId = null; }

    battleLog.value = [];
    loot.value = [];
    showLoot.value = false;
    playerBuffs.value = [];
    playerDebuffs.value = [];
    bossBuffs.value = [];
    bossDebuffs.value = [];
    clearBossBleed();
    clearBossArmorDebuff();
    clearPoisonDot("poisonous-bite");

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
      clearPoisonDot("poisonous-bite");
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
    stopBossAttackCooldownTicker();
    stopPowerBoostTimer();
    stopEffectsTicker();
    if (sweepingCritTimerId !== null) clearTimeout(sweepingCritTimerId);
    if (cunningBuffTimerId !== null) clearTimeout(cunningBuffTimerId);
    if (evasionBonusTimerId !== null) clearTimeout(evasionBonusTimerId);
    if (dodgeNextExpireTimerId !== null) clearTimeout(dodgeNextExpireTimerId);
    if (damageReductionTimerId !== null) clearTimeout(damageReductionTimerId);
    if (poisonDotIntervalId !== null) clearInterval(poisonDotIntervalId);
    if (poisonDotEndTimeoutId !== null) clearTimeout(poisonDotEndTimeoutId);
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
    effectiveMaxCooldownMs,
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
    comboPoints,
    COMBO_POINTS_MAX,
    bossDamageNumbers,
    playerDamageNumbers,
    bossAttackCooldownLeft,
    bossAttackCooldownMax,
  };
}
