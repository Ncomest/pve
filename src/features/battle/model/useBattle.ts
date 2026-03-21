import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import type {
  Boss,
  BossAbility,
  BossAbilityConfig,
  Stats,
} from "@/entities/boss/model";
import type { ActiveEffect } from "@/shared/lib/effects/types";
import bossesData from "@/entities/boss/bosses.json";
import resourcesData from "@/entities/boss/resources.json";
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
import { useElixirsStore } from "@/features/elixirs/model/useElixirsStore";
import { SPIRIT_ELIXIR_BONUS_POINTS } from "@/features/elixirs/model/elixirs";
import {
  ALL_TEMPLATE_IDS,
  RESOURCE_TEMPLATE_IDS,
  getTemplate,
} from "@/entities/item/items-db";
import { getDisplayItem } from "@/entities/item/model";
import { createItemInstance } from "@/entities/item/lib/createInstance";
import type { ItemInstance } from "@/entities/item/model";
import { useDamageNumbers } from "@/shared/ui/DamageNumbers/useDamageNumbers";
import { armorPointsToFraction } from "@/entities/item/lib/statPoints";
import {
  buildPlayerCombatStats,
  cooldownFactorFromSpeed,
  applyElixirArmorPercentToArmorPoints,
  applyElixirSpeedPercentToSpeedTotal,
  playerSpeedBaseline,
  LEVEL_HP_PER_LEVEL,
} from "@/entities/character/lib/playerStatAggregation";

/** Тип записи лога боя для цветовой подсветки */
export type BattleLogEntryType = "player-damage" | "boss-damage" | "player-dodge" | "boss-dodge" | "other";
export interface BattleLogEntry {
  text: string;
  type: BattleLogEntryType;
}

const rng = () => Math.random();

const cloneStats = (stats: Stats): Stats => ({
  hp: stats.hp,
  maxHp: stats.maxHp,
  power: stats.power,
  chanceCrit: stats.chanceCrit,
  evasion: stats.evasion,
  speed: stats.speed ?? playerSpeedBaseline(),
  armor: stats.armor ?? 0,
  accuracy: stats.accuracy ?? 0,
  critDefense: stats.critDefense ?? 0,
  spirit: stats.spirit ?? 0,
  lifesteal: stats.lifesteal ?? 0,
});

const clampHp = (stats: Stats) => {
  stats.hp = Math.max(0, Math.min(stats.hp, stats.maxHp));
};

/** Множитель урона при крите по умолчанию (150%) */
const DEFAULT_CRIT_MULTIPLIER = 1.5;

const calcHit = (attacker: Stats, defender: Stats, critMultiplier: number = DEFAULT_CRIT_MULTIPLIER) => {
  const dodgeChance = Math.max(
    0,
    (defender.evasion ?? 0) - (attacker.accuracy ?? 0),
  );
  const isDodged = rng() < dodgeChance;
  if (isDodged) {
    return { damage: 0, isCrit: false, isDodged: true };
  }

  const critChance = Math.max(
    0,
    (attacker.chanceCrit ?? 0) - (defender.critDefense ?? 0),
  );
  const isCrit = rng() < critChance;
  const base = Math.floor(attacker.power * (0.9 + Math.random() * 0.2));
  // Бонус от силы: каждые 25 ед. power дают +1 урона (плоско)
  const flatFromPower = Math.floor((attacker.power ?? 0) / 25);
  const raw = Math.round(base * (isCrit ? critMultiplier : 1)) + flatFromPower;
  // Броня снижает урон в процентах: 50 брони = 1% снижения
  const armor = defender.armor ?? 0;
  const reduction = armorPointsToFraction(armor);
  const damage = Math.max(1, Math.round(raw * (1 - reduction)));
  return { damage, isCrit, isDodged: false };
};

const formatCooldown = (ms: number) => {
  if (ms <= 0) return "";
  return `${(ms / 1000).toFixed(1)}с`;
};

export function useBattle(bossId: () => string | undefined) {
  const allBosses = [...(bossesData as Boss[]), ...(resourcesData as Boss[])];
  const resourceBossIdSet = new Set((resourcesData as Boss[]).map((b) => b.id));
  const playerProgress = usePlayerProgress();
  const characterStore = useCharacterStore();
  const playerHp = usePlayerHp();
  const elixirsStore = useElixirsStore();

  const { numbers: bossDamageNumbers, spawnNumber: spawnBossDmg } = useDamageNumbers();
  const { numbers: playerDamageNumbers, spawnNumber: spawnPlayerDmg } = useDamageNumbers();

  const basePlayerStats = cloneStats(PLAYER_CHARACTER.stats);

  const buildPlayerStatsForLevel = (level: number): Stats =>
    buildPlayerCombatStats(basePlayerStats, characterStore.equipmentStats, level);

  const calcMaxHp = (level: number) => {
    const bonusHp = Math.max(0, level - 1) * LEVEL_HP_PER_LEVEL;
    return basePlayerStats.maxHp + bonusHp + characterStore.equipmentStats.hp;
  };

  const selectedBoss = computed(() => {
    const id = bossId();
    return allBosses.find((b) => b.id === id) ?? allBosses[0];
  });

  const basePlayerStatsForRevert = buildPlayerStatsForLevel(playerProgress.level.value);

  // Эликсиры могут менять maxHp/статы в бою.
  const healthPercentBonus = elixirsStore.activeHealthPercentBonusApplied;
  const regenWindow = elixirsStore.activeRegenWindow;
  const spiritElixirBonus = elixirsStore.activeSpiritElixirBonus;

  const initialStats = {
    ...basePlayerStatsForRevert,
    maxHp: basePlayerStatsForRevert.maxHp + healthPercentBonus,
    hp: basePlayerStatsForRevert.hp + healthPercentBonus,
  };
  playerHp.init(initialStats.maxHp, regenWindow, initialStats.spirit ?? 0, spiritElixirBonus);

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

  const battleLog = ref<BattleLogEntry[]>([]);
  const totalDamageDealtToBoss = ref(0);
  const totalDamageTakenFromBoss = ref(0);

  /** Комбо-поинты (0–6) для класса «Клинок и Яд» и др. */
  const comboPoints = ref(0);
  const COMBO_POINTS_MAX = 6;

  /** Баффы на персонаже игрока */
  const playerBuffs = ref<ActiveEffect[]>([]);
  /**
   * Применяем остальные стат-модификаторы активного эликсира (если он не истёк).
   * Эликсиры не стакуются: предыдущий баф заменяется новым.
   */
  const activeElixirDef = elixirsStore.activeElixirDef;
  const elixirEndAt = elixirsStore.activeElixirEndAt;
  let elixirRevertTimeoutId: ReturnType<typeof setTimeout> | null = null;
  if (activeElixirDef && elixirEndAt != null && Date.now() < elixirEndAt) {
    const remainingMs = elixirEndAt - Date.now();
    const effectId = `elixir-${activeElixirDef.id}`;

    playerBuffs.value = [
      ...playerBuffs.value.filter((e) => e.id !== effectId),
      {
        id: effectId,
        name: activeElixirDef.name,
        icon: activeElixirDef.icon,
        durationSeconds: remainingMs / 1000,
        endTime: elixirEndAt,
      },
    ];

    // Кэшируем базовые значения без баффа (для отката).
    const revert = () => {
      player.stats.power = basePlayerStatsForRevert.power;
      player.stats.armor = basePlayerStatsForRevert.armor;
      player.stats.chanceCrit = basePlayerStatsForRevert.chanceCrit;
      player.stats.evasion = basePlayerStatsForRevert.evasion;
      player.stats.speed = basePlayerStatsForRevert.speed;
      player.stats.accuracy = basePlayerStatsForRevert.accuracy;
      player.stats.critDefense = basePlayerStatsForRevert.critDefense;
      player.stats.spirit = basePlayerStatsForRevert.spirit;
      player.stats.lifesteal = basePlayerStatsForRevert.lifesteal;
      player.stats.maxHp = basePlayerStatsForRevert.maxHp;
      player.stats.hp = Math.min(player.stats.hp, player.stats.maxHp);
      playerBuffs.value = playerBuffs.value.filter((e) => e.id !== effectId);
    };

    if (elixirRevertTimeoutId !== null) clearTimeout(elixirRevertTimeoutId);
    elixirRevertTimeoutId = window.setTimeout(revert, remainingMs);

    switch (activeElixirDef.kind) {
      case "heal_flat":
        break;
      case "spirit_elixir":
        player.stats.spirit =
          (player.stats.spirit ?? 0) + (activeElixirDef.spiritBonus ?? SPIRIT_ELIXIR_BONUS_POINTS);
        break;
      case "power":
        player.stats.power += activeElixirDef.powerDelta ?? 0;
        break;
      case "armor_percent":
        player.stats.armor = applyElixirArmorPercentToArmorPoints(
          player.stats.armor ?? 0,
          activeElixirDef.armorPercentBonus ?? 0,
        );
        break;
      case "crit_percent":
        player.stats.chanceCrit = Math.min(
          1,
          player.stats.chanceCrit + (activeElixirDef.critPercentBonus ?? 0),
        );
        break;
      case "speed_percent":
        player.stats.speed = applyElixirSpeedPercentToSpeedTotal(
          player.stats.speed ?? playerSpeedBaseline(),
          activeElixirDef.speedPercentBonus ?? 0,
        );
        break;
      case "health_percent":
        // maxHp уже увеличен на этапе playerHp.init.
        break;
      case "evasion_percent":
        player.stats.evasion = Math.min(
          1,
          player.stats.evasion + (activeElixirDef.evasionPercentBonus ?? 0),
        );
        break;
      default:
        break;
    }
  }
  /** Дебаффы на персонаже игрока (яд, проклятья, огненная земля и т.п.) */
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
  /** DoT от Ядовитого укуса (игрока) по боссу: интервал и таймер окончания */
  let poisonDotIntervalId: ReturnType<typeof setInterval> | null = null;
  let poisonDotEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Яд от способности босса «Зараженный укус» по игроку */
  let infectedBiteIntervalId: ReturnType<typeof setInterval> | null = null;
  let infectedBiteEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Кровотечение от способности босса «Медвежья хватка» по игроку */
  let bearHugIntervalId: ReturnType<typeof setInterval> | null = null;
  let bearHugEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Укус стаи» (Волк) по игроку */
  let packBiteIntervalId: ReturnType<typeof setInterval> | null = null;
  let packBiteEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Ядовитый клинок» (Гоблин) по игроку */
  let poisonBladeIntervalId: ReturnType<typeof setInterval> | null = null;
  let poisonBladeEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Огненный болт» (Гоблин-арбалетчик) по игроку */
  let fireBoltIntervalId: ReturnType<typeof setInterval> | null = null;
  let fireBoltEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Огненный шар» (Гоблин-маг) по игроку */
  let fireballIntervalId: ReturnType<typeof setInterval> | null = null;
  let fireballEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Удар ятаганом» (Вождь гоблинов) по игроку */
  let yataganStrikeIntervalId: ReturnType<typeof setInterval> | null = null;
  let yataganStrikeEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Ядовитая колба» (Вождь гоблинов) по игроку */
  let poisonFlaskIntervalId: ReturnType<typeof setInterval> | null = null;
  let poisonFlaskEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Огненное дыхание» (Дракон) по игроку */
  let fireBreathIntervalId: ReturnType<typeof setInterval> | null = null;
  let fireBreathEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** DoT от способности «Липкая слизь» (Слизь) по игроку */
  let stickySlimeIntervalId: ReturnType<typeof setInterval> | null = null;
  let stickySlimeEndTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф босса от «Заострить клыки» (таймер жизни бафа) */
  let sharpenTusksTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф босса от «Рёв» (усиление урона на время) */
  let roarTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф босса от «Воющий клич» (усиление урона Волка) */
  let howlTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф босса от «Быстрая перезарядка» (усиление урона арбалетчика) */
  let rapidReloadTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф босса от «Боевой клич» вождя гоблинов */
  let warcryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф брони босса от «Тайный барьер» гоблина-мага */
  let arcaneShieldTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф брони босса от «Каменная кожа» голема */
  let stoneSkinTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Баф брони босса от «Чешуйчатая броня» дракона */
  let scaleArmorTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

  /** «Молниеносная вспышка»: бонус скорости в долях (0.15 = 15%) */
  const speedBonus = ref(0);
  let speedBonusTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Таймеры, созданные системой эффектов (очищаются при сбросе боя) */
  const effectTimeoutIds = ref<number[]>([]);
  const effectIntervalIds = ref<number[]>([]);
  /** Состояние хода для applyEffects (spentCombo, cunningConsumed) */
  const effectTurnState = reactive<{ spentCombo?: number; cunningConsumed?: boolean }>({});

  const pushLog = (line: string, type: BattleLogEntryType = "other") => {
    battleLog.value = [{ text: line, type }, ...battleLog.value].slice(0, 12);
  };

  /** Разница уровней: босс выше героя → штраф урона героя по боссу и бонус урона босса по герою. */
  const getBossLevelDelta = () =>
    Math.max(0, boss.level - playerProgress.level.value);

  const getDamageToBossMultiplier = (): number => {
    const d = getBossLevelDelta();
    if (d >= 2) return 0.6;
    if (d === 1) return 0.75;
    return 1;
  };

  const getDamageFromBossMultiplier = (): number => {
    const d = getBossLevelDelta();
    if (d >= 2) return 1.4;
    if (d === 1) return 1.25;
    return 1;
  };

  const applyDamageToBoss = (rawDamage: number): number => {
    const mult = getDamageToBossMultiplier();
    const scaled = Math.max(1, Math.round(rawDamage * mult));
    const before = boss.stats.hp;
    boss.stats.hp -= scaled;
    clampHp(boss.stats);
    const applied = Math.max(0, before - boss.stats.hp);
    totalDamageDealtToBoss.value += applied;

    const ls = player.stats.lifesteal ?? 0;
    if (ls > 0 && applied > 0) {
      const heal = Math.floor(applied * ls);
      if (heal > 0) {
        const hpBefore = player.stats.hp;
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
        const gained = player.stats.hp - hpBefore;
        if (gained > 0) {
          spawnPlayerDmg(gained, "heal");
        }
      }
    }
    return applied;
  };

  const applyDamageFromBoss = (rawDamage: number): number => {
    const mult = getDamageFromBossMultiplier();
    const scaled = Math.max(1, Math.round(rawDamage * mult));
    const before = player.stats.hp;
    player.stats.hp -= scaled;
    clampHp(player.stats);
    const applied = Math.max(0, before - player.stats.hp);
    totalDamageTakenFromBoss.value += applied;
    return applied;
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

  const loot = ref<ItemInstance[]>([]);
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
   * Коэффициент скорости для КД (см. `cooldownFactorFromSpeed` в playerStatAggregation).
   */
  const speedFactor = computed(() =>
    cooldownFactorFromSpeed(
      player.stats.speed ?? playerSpeedBaseline(),
      speedBonus.value,
    ),
  );

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

  /** Эффективный крит героя (база + бафф «Размашистый удар» и т.п.) для отображения в UI */
  const playerEffectiveCrit = computed(() =>
    Math.min(1, player.stats.chanceCrit + sweepingCritBonus.value),
  );
  /** Эффективное уклонение героя (база + бафф «Ускользание») для отображения в UI */
  const playerEffectiveEvasion = computed(() =>
    Math.min(1, player.stats.evasion + playerEvasionBonus.value),
  );
  /** Эффективная скорость героя (база × (1 + бонус), напр. «Молниеносная вспышка») для отображения */
  const playerEffectiveSpeed = computed(() => {
    const base = player.stats.speed ?? playerSpeedBaseline();
    return base * (1 + speedBonus.value);
  });
  /** Броня героя (пока без баффов) */
  const playerArmor = computed(() => player.stats.armor ?? 0);
  /** Эффективная броня босса с учётом бафов/дебаффов брони */
  const bossEffectiveArmor = computed(() => {
    const base = boss.stats.armor ?? 0;

    // Бафы брони от способностей босса
    let armorBuffPercent = 0;
    if (bossBuffs.value.some((e) => e.id === "arcane-shield")) {
      armorBuffPercent += 0.5;
    }
    if (bossBuffs.value.some((e) => e.id === "stone-skin-buff")) {
      armorBuffPercent += 0.6;
    }
    if (bossBuffs.value.some((e) => e.id === "scale-armor")) {
      armorBuffPercent += 0.5;
    }

    let effective = Math.round(base * (1 + armorBuffPercent));

    // Дебафф брони (срез брони от игрока)
    const debuff = bossArmorDebuff.value;
    if (!debuff) return effective;
    return Math.max(0, effective - debuff.value);
  });

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

  const clearInfectedBitePoison = () => {
    if (infectedBiteIntervalId !== null) {
      clearInterval(infectedBiteIntervalId);
      infectedBiteIntervalId = null;
    }
    if (infectedBiteEndTimeoutId !== null) {
      clearTimeout(infectedBiteEndTimeoutId);
      infectedBiteEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "infected-bite");
  };

  const clearBearHugBleed = () => {
    if (bearHugIntervalId !== null) {
      clearInterval(bearHugIntervalId);
      bearHugIntervalId = null;
    }
    if (bearHugEndTimeoutId !== null) {
      clearTimeout(bearHugEndTimeoutId);
      bearHugEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "bear-hug");
  };

  const clearPackBiteBleed = () => {
    if (packBiteIntervalId !== null) {
      clearInterval(packBiteIntervalId);
      packBiteIntervalId = null;
    }
    if (packBiteEndTimeoutId !== null) {
      clearTimeout(packBiteEndTimeoutId);
      packBiteEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "pack-bite");
  };

  const clearPoisonBladePoison = () => {
    if (poisonBladeIntervalId !== null) {
      clearInterval(poisonBladeIntervalId);
      poisonBladeIntervalId = null;
    }
    if (poisonBladeEndTimeoutId !== null) {
      clearTimeout(poisonBladeEndTimeoutId);
      poisonBladeEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "poison-blade");
  };

  const clearFireBoltBurn = () => {
    if (fireBoltIntervalId !== null) {
      clearInterval(fireBoltIntervalId);
      fireBoltIntervalId = null;
    }
    if (fireBoltEndTimeoutId !== null) {
      clearTimeout(fireBoltEndTimeoutId);
      fireBoltEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "fire-bolt");
  };

  const clearFireballBurn = () => {
    if (fireballIntervalId !== null) {
      clearInterval(fireballIntervalId);
      fireballIntervalId = null;
    }
    if (fireballEndTimeoutId !== null) {
      clearTimeout(fireballEndTimeoutId);
      fireballEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "fireball");
  };

  const clearYataganStrikeBleed = () => {
    if (yataganStrikeIntervalId !== null) {
      clearInterval(yataganStrikeIntervalId);
      yataganStrikeIntervalId = null;
    }
    if (yataganStrikeEndTimeoutId !== null) {
      clearTimeout(yataganStrikeEndTimeoutId);
      yataganStrikeEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "yatagan-strike");
  };

  const clearPoisonFlaskPoison = () => {
    if (poisonFlaskIntervalId !== null) {
      clearInterval(poisonFlaskIntervalId);
      poisonFlaskIntervalId = null;
    }
    if (poisonFlaskEndTimeoutId !== null) {
      clearTimeout(poisonFlaskEndTimeoutId);
      poisonFlaskEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "poison-flask");
  };

  const clearFireBreathBurn = () => {
    if (fireBreathIntervalId !== null) {
      clearInterval(fireBreathIntervalId);
      fireBreathIntervalId = null;
    }
    if (fireBreathEndTimeoutId !== null) {
      clearTimeout(fireBreathEndTimeoutId);
      fireBreathEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "fire-breath");
  };

  const clearStickySlimeDot = () => {
    if (stickySlimeIntervalId !== null) {
      clearInterval(stickySlimeIntervalId);
      stickySlimeIntervalId = null;
    }
    if (stickySlimeEndTimeoutId !== null) {
      clearTimeout(stickySlimeEndTimeoutId);
      stickySlimeEndTimeoutId = null;
    }
    playerDebuffs.value = playerDebuffs.value.filter((e) => e.id !== "sticky-slime");
  };

  const clearSharpenTusksBuff = () => {
    if (sharpenTusksTimeoutId !== null) {
      clearTimeout(sharpenTusksTimeoutId);
      sharpenTusksTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "sharpen-tusks");
  };

  const clearRoarBuff = () => {
    if (roarTimeoutId !== null) {
      clearTimeout(roarTimeoutId);
      roarTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "roar");
  };

  const clearHowlBuff = () => {
    if (howlTimeoutId !== null) {
      clearTimeout(howlTimeoutId);
      howlTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "howl");
  };

  const clearRapidReloadBuff = () => {
    if (rapidReloadTimeoutId !== null) {
      clearTimeout(rapidReloadTimeoutId);
      rapidReloadTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "rapid-reload");
  };

  const clearWarcryBuff = () => {
    if (warcryTimeoutId !== null) {
      clearTimeout(warcryTimeoutId);
      warcryTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "warcry");
  };

  const clearArcaneShieldBuff = () => {
    if (arcaneShieldTimeoutId !== null) {
      clearTimeout(arcaneShieldTimeoutId);
      arcaneShieldTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "arcane-shield");
  };

  const clearStoneSkinBuff = () => {
    if (stoneSkinTimeoutId !== null) {
      clearTimeout(stoneSkinTimeoutId);
      stoneSkinTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "stone-skin-buff");
  };

  const clearScaleArmorBuff = () => {
    if (scaleArmorTimeoutId !== null) {
      clearTimeout(scaleArmorTimeoutId);
      scaleArmorTimeoutId = null;
    }
    bossBuffs.value = bossBuffs.value.filter((e) => e.id !== "scale-armor");
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

    // Прерывание текущего каста босса способностями с флагом interrupt (например, Укор)
    if (
      ability.interrupt &&
      bossCastState.value === "casting" &&
      currentBossAbility.value?.canBeInterrupted &&
      currentBossAbility.value?.category !== "uninterruptible"
    ) {
      interruptBossCast(ability.name);
    }
    // Укор и другие способности только с interrupt — всегда ставим кулдаун и выходим
    if (ability.interrupt && !ability.effects?.length && ability.role === "control") {
      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

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
        playerDebuffs,
        bossBuffs,
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
        applyDamageToBoss,
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
        pushLog(`${ability.name}: босс уклонился.`, "boss-dodge");
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

        const appliedToBoss = applyDamageToBoss(finalDamage);
        spawnBossDmg(appliedToBoss, "damage", isCrit);
        const gain = ability.comboGain ?? 1;
        gainCombo(gain);

        const logParts: string[] = [`${ability.name}: ${appliedToBoss} урона${isCrit ? " (крит)" : ""}${cunningNote}. Комбо: ${comboPoints.value}/${COMBO_POINTS_MAX}`];

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

        pushLog(logParts.join(". "), "player-damage");
      }

      triggerCooldowns(ability.id, ability.cooldownMs);
      return;
    }

    // --- Финишеры (расходуют комбо-поинты) ---
    if (ability.role === "finisher" && ability.baseDamageX !== undefined) {
      const costMin = ability.comboCostMin ?? 1;
      if (comboPoints.value < costMin) {
        pushLog(`${ability.name}: нужно минимум ${costMin} комбо-поинтов (сейчас ${comboPoints.value}).`, "other");
        return;
      }

      const n = spendCombo();

      // Финишер с DoT (Ядовитый укус): мгновенный урон + яд
      if (ability.dotDurationMs !== undefined && ability.dotTickIntervalMs !== undefined && ability.dotTickDamageMultiplier !== undefined) {
        const instantRatio = ability.dotInstantDamageRatio ?? 0.5;
        const instantDmg = Math.round(ability.baseDamageX * playerPower.value * instantRatio);
        let instAppliedLog = 0;
        if (instantDmg > 0) {
          instAppliedLog = applyDamageToBoss(instantDmg);
          spawnBossDmg(instAppliedLog, "damage");
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
          const tickApplied = applyDamageToBoss(tickDmg);
          spawnBossDmg(tickApplied, "damage");

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

            pushLog(`Яд (${ability.name}): −${tickApplied} HP. Сработало «Коварство»!`, "player-damage");
          } else {
            pushLog(`Яд (${ability.name}): −${tickApplied} HP у босса.`, "player-damage");
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

        pushLog(
          `${ability.name}: ${instAppliedLog} урона мгновенно + яд ${Math.round(ability.dotDurationMs / 1000)}с (${n} комбо). Комбо сброшено.`,
          "player-damage",
        );
        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // Обычный финишер (Потрошение) — учитывает стаки усиления
      const stackBonus = eviscerateStacks.value * (ability.eviscerateStackBonusPercent ?? 0.15);
      const baseDmg = Math.round(ability.baseDamageX * playerPower.value * n * (1 + stackBonus));

      const finisherApplied = applyDamageToBoss(baseDmg);
      spawnBossDmg(finisherApplied, "damage");

      const stackNote = eviscerateStacks.value > 0
        ? ` (+${Math.round(stackBonus * 100)}% от ${eviscerateStacks.value} стак.)`
        : "";
      pushLog(`${ability.name}: ${finisherApplied} урона${stackNote} (${n} комбо). Комбо сброшено.`, "player-damage");

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
        const bleedFirst = applyDamageToBoss(dmg);
        spawnBossDmg(bleedFirst, "damage");
        pushLog(`Ты нанёс ${bleedFirst} урона и наложил кровотечение.`, "player-damage");

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
          const bleedTickApplied = applyDamageToBoss(tickDmg);
          spawnBossDmg(bleedTickApplied, "damage");
          pushLog(`Кровотечение: −${bleedTickApplied} HP у босса.`, "player-damage");
        }, ability.bleedTickIntervalMs);
        bleedEndTimeoutId = setTimeout(clearBossBleed, ability.bleedDurationMs);
        triggerCooldowns(ability.id, ability.cooldownMs);
        return;
      }

      // Способность с дебаффом брони: плоский урон + снижение брони
      if (ability.armorDebuff !== undefined && ability.armorDebuffDurationMs !== undefined) {
        const dmg = ability.value;
        const armorBreakApplied = applyDamageToBoss(dmg);
        spawnBossDmg(armorBreakApplied, "damage");
        pushLog(`Ты нанёс ${armorBreakApplied} урона и снизил броню босса на ${ability.armorDebuff}.`, "player-damage");

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
        pushLog("Ты атаковал, но босс уклонился.", "boss-dodge");
      } else {
        const atkApplied = applyDamageToBoss(damage);
        spawnBossDmg(atkApplied, "damage", isCrit);
        pushLog(`Ты нанёс ${atkApplied} урона${isCrit ? " (крит)" : ""}.`, "player-damage");
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

    // Защита, мобильность и контроль: по role, не только type "buff" (Уворот/Блок — type "evidence", Укор — "control")
    if (ability.type === "buff" || ability.type === "evidence" || ability.type === "control") {
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

      // --- Молниеносная вспышка: увеличение скорости ---
      if (ability.role === "mobility" && ability.speedPercent !== undefined && ability.speedDurationMs !== undefined) {
        if (speedBonusTimerId !== null) clearTimeout(speedBonusTimerId);
        speedBonus.value = ability.speedPercent;

        playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
        const endTime = Date.now() + ability.speedDurationMs;
        playerBuffs.value = [...playerBuffs.value, {
          id: ability.id,
          name: ability.name,
          icon: ability.icon ?? "IconPowerBoost",
          durationSeconds: ability.speedDurationMs / 1000,
          endTime,
        }];
        pushLog(`${ability.name}: скорость +${Math.round(ability.speedPercent * 100)}% на ${ability.speedDurationMs / 1000}с.`);

        speedBonusTimerId = setTimeout(() => {
          speedBonus.value = 0;
          playerBuffs.value = playerBuffs.value.filter((e) => e.id !== ability.id);
          speedBonusTimerId = null;
        }, ability.speedDurationMs);

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

  // --- Активные способности босса (кастуемые) ---

  const bossAbilities = computed<BossAbility[]>(() => selectedBoss.value?.bossAbilities ?? []);
  const bossAbilityConfig = computed<BossAbilityConfig | undefined>(
    () => selectedBoss.value?.abilityConfig,
  );

  const currentBossAbility = ref<BossAbility | null>(null);
  const bossCastState = ref<"idle" | "casting">("idle");
  const bossCastTimeLeftMs = ref(0);
  const bossCastTotalMs = ref(0);
  let bossCastTimerId: number | null = null;

  const lastBossAbilityId = ref<string | null>(null);
  /** Хранит «ход» последнего использования способности (для чередования) */
  let bossAbilityLastUsedTurn: Record<string, number> = {};
  let bossAbilityTurnCounter = 0;
  let nextBossAbilityTimeoutId: number | null = null;

  const clearBossCastTimer = () => {
    if (bossCastTimerId !== null) {
      window.clearInterval(bossCastTimerId);
      bossCastTimerId = null;
    }
  };

  const interruptBossCast = (sourceAbilityName?: string) => {
    if (bossCastState.value !== "casting" || !currentBossAbility.value) return;

    const interrupted = currentBossAbility.value;
    clearBossCastTimer();
    bossCastState.value = "idle";
    currentBossAbility.value = null;
    lastBossAbilityId.value = interrupted.id;

    const msgBase = `Каст босса «${interrupted.name}» прерван.`;
    const msg = sourceAbilityName
      ? `${sourceAbilityName}: ${msgBase}`
      : msgBase;
    pushLog(msg);

    // После прерывания возобновляем цикл автоатак и планируем следующую способность
    scheduleNextBossAttack();
    scheduleNextBossAbility();
  };

  const getBossEffectivePower = () => {
    let mult = 1;

    // Усиления урона от различных бафов босса.
    if (bossBuffs.value.some((e) => e.id === "sharpen-tusks")) {
      mult *= 2;
    }
    if (bossBuffs.value.some((e) => e.id === "roar")) {
      mult *= 1.4;
    }
    if (bossBuffs.value.some((e) => e.id === "howl")) {
      mult *= 1.5;
    }
    if (bossBuffs.value.some((e) => e.id === "rapid-reload")) {
      mult *= 1.3;
    }
    if (bossBuffs.value.some((e) => e.id === "warcry")) {
      mult *= 1.5;
    }

    return boss.stats.power * mult;
  };

  const scheduleNextBossAbility = (delayMs?: number) => {
    if (!bossAbilityConfig.value || bossAbilities.value.length === 0) return;
    if (nextBossAbilityTimeoutId !== null) {
      window.clearTimeout(nextBossAbilityTimeoutId);
      nextBossAbilityTimeoutId = null;
    }
    const baseDelay = delayMs ?? bossAbilityConfig.value.minAbilityIntervalMs;
    nextBossAbilityTimeoutId = window.setTimeout(() => {
      if (isBattleOver.value) return;
      // Не кастуем, если уже идёт каст
      if (bossCastState.value === "casting") return;

      let pool = bossAbilities.value.filter(
        (a) => !bossAbilityConfig.value?.preventConsecutiveRepeat || a.id !== lastBossAbilityId.value,
      );
      if (!pool.length) {
        pool = [...bossAbilities.value];
      }
      // Выбираем способность, которую дольше всего не использовали (чередование)
      const minTurn = Math.min(
        ...pool.map((a) => bossAbilityLastUsedTurn[a.id] ?? -1),
      );
      const leastUsed = pool.filter(
        (a) => (bossAbilityLastUsedTurn[a.id] ?? -1) === minTurn,
      );
      const ability = leastUsed[Math.floor(Math.random() * leastUsed.length)];
      if (!ability) return;

      // Старт каста: останавливаем автоатаку
      stopBossAutoAttack();
      stopBossAttackCooldownTicker();

      currentBossAbility.value = ability;
      bossCastState.value = "casting";
      bossCastTotalMs.value = ability.castTimeMs;
      bossCastTimeLeftMs.value = ability.castTimeMs;

      pushLog(`Босс начинает применять: ${ability.name}.`);

      const startedAt = Date.now();
      clearBossCastTimer();
      bossCastTimerId = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        bossCastTimeLeftMs.value = Math.max(0, ability.castTimeMs - elapsed);
        if (bossCastTimeLeftMs.value <= 0) {
          clearBossCastTimer();
          // Каст завершён успешно
          const finished = currentBossAbility.value;
          bossCastState.value = "idle";
          currentBossAbility.value = null;
          if (!finished || isBattleOver.value) return;

          lastBossAbilityId.value = finished.id;
          applyBossAbilityEffects(finished);
          scheduleNextBossAttack();
          scheduleNextBossAbility();
        }
      }, 50);
    }, baseDelay);
  };

  const hasDefensiveTag = (tag: BossAbility["requiredDefensiveTag"]): boolean => {
    if (!tag) return false;
    if (tag === "block") {
      return playerBuffs.value.some((e) => e.id === "block");
    }
    if (tag === "ice-wall") {
      return playerBuffs.value.some((e) => e.id === "ice-wall");
    }
    if (tag === "heavy-mitigation") {
      return damageReductionPercent.value > 0;
    }
    return false;
  };

  const applyBossAbilityHit = (ability: BossAbility): { hit: boolean } => {
    if (isBattleOver.value) return { hit: false };

    // «Уворот»: гарантированный промах только от особых атак,
    // которые помечены requiredDefensiveTag: "full-dodge"
    if (dodgeNextAttack.value && ability.requiredDefensiveTag === "full-dodge") {
      dodgeNextAttack.value = false;
      if (dodgeNextExpireTimerId !== null) {
        clearTimeout(dodgeNextExpireTimerId);
        dodgeNextExpireTimerId = null;
      }
      playerBuffs.value = playerBuffs.value.filter((e) => e.id !== "dodge");
      pushLog(`Босс применяет ${ability.name}, но ты увернулся (Уворот)!`, "player-dodge");
      return { hit: false };
    }

    // Уклонение от статов и «Ускользание» не действуют против кастуемых способностей босса
    // (только автоатака босса проверяется через evasion). У приёмов с full-dodge уклонение —
    // только через способность «Уворот» (ветка выше).
    const defenderStats: Stats = { ...player.stats, evasion: 0 };
    const attacker: Stats = {
      ...boss.stats,
      power: getBossEffectivePower() * (ability.baseDamageX ?? 1),
    };
    const { damage, isCrit, isDodged } = calcHit(attacker, defenderStats);

    if (isDodged) {
      spawnPlayerDmg("Уклон", "dodge");
      pushLog(`Босс применил ${ability.name}, но ты уклонился.`, "player-dodge");
      return { hit: false };
    }

    let finalDamage = damage;
    let defenseNote = "";

    const tag = ability.requiredDefensiveTag;
    if (tag && tag !== "full-dodge") {
      if (hasDefensiveTag(tag)) {
        if (tag === "block" || tag === "ice-wall") {
          const mitigated = Math.max(1, Math.round(finalDamage * 0.1));
          defenseNote =
            tag === "block"
              ? " (урон сильно снижен Блоком)"
              : " (урон сильно снижен Стеной льда)";
          finalDamage = mitigated;
        } else if (tag === "heavy-mitigation") {
          const mitigated = Math.max(1, Math.round(finalDamage * 0.3));
          defenseNote = " (урон снижен сильной защитой)";
          finalDamage = mitigated;
        }
      }
    }

    const reduced = Math.round(finalDamage * (1 - damageReductionPercent.value));
    const finalDmg = Math.max(1, reduced);
    applyDamageFromBoss(finalDmg);
    spawnPlayerDmg(finalDmg, "player-damage", isCrit);
    const reductionNote =
      damageReductionPercent.value > 0
        ? ` (−${Math.round(damageReductionPercent.value * 100)}% Плащ)`
        : "";
    pushLog(
      `${ability.name}: босс нанёс ${finalDmg} урона${
        isCrit ? " (крит)" : ""
      }${defenseNote}${reductionNote}.`,
      "boss-damage",
    );
    return { hit: true };
  };

  const applyBossAbilityEffects = (ability: BossAbility) => {
    if (isBattleOver.value) return;

    bossAbilityTurnCounter += 1;
    bossAbilityLastUsedTurn[ability.id] = bossAbilityTurnCounter;

    switch (ability.id) {
      case "sharpen-tusks": {
        if (
          ability.selfBuffType === "damage" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearSharpenTusksBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "sharpen-tusks"),
            {
              id: "sharpen-tusks",
              name: ability.name,
              icon: ability.icon ?? "IconPowerBoost",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          sharpenTusksTimeoutId = window.setTimeout(() => {
            clearSharpenTusksBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: босс заостряет клыки — его урон увеличен в 2 раза на ${
              durationMs / 1000
            }с.`,
          );
        }
        break;
      }
      case "roar": {
        if (
          ability.selfBuffType === "damage" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearRoarBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "roar"),
            {
              id: "roar",
              name: ability.name,
              icon: ability.icon ?? "IconPowerBoost",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          roarTimeoutId = window.setTimeout(() => {
            clearRoarBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: урон босса увеличен на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "howl": {
        if (
          ability.selfBuffType === "damage" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearHowlBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "howl"),
            {
              id: "howl",
              name: ability.name,
              icon: ability.icon ?? "IconPowerBoost",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          howlTimeoutId = window.setTimeout(() => {
            clearHowlBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: урон босса увеличен на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "rapid-reload": {
        if (
          ability.selfBuffType === "damage" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearRapidReloadBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "rapid-reload"),
            {
              id: "rapid-reload",
              name: ability.name,
              icon: ability.icon ?? "IconPowerBoost",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          rapidReloadTimeoutId = window.setTimeout(() => {
            clearRapidReloadBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: урон босса увеличен на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "warcry": {
        if (
          ability.selfBuffType === "damage" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearWarcryBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "warcry"),
            {
              id: "warcry",
              name: ability.name,
              icon: ability.icon ?? "IconPowerBoost",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          warcryTimeoutId = window.setTimeout(() => {
            clearWarcryBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: урон босса увеличен на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "infected-bite": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick
        ) {
          clearInfectedBitePoison();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "infected-bite"),
            {
              id: "infected-bite",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: "poison",
            },
          ];

          infectedBiteIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearInfectedBitePoison();
              return;
            }
            const debuffActive = playerDebuffs.value.some(
              (e) => e.id === "infected-bite",
            );
            if (!debuffActive || Date.now() >= endTime) {
              clearInfectedBitePoison();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Яд (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          infectedBiteEndTimeoutId = window.setTimeout(() => {
            clearInfectedBitePoison();
          }, durationMs);

          pushLog(
            `${ability.name}: яд будет наносить ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с. Снимайте Cleanse.`,
          );
        }
        break;
      }
      case "bear-hug": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearBearHugBleed();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "bear-hug"),
            {
              id: "bear-hug",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "other",
            },
          ];

          bearHugIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearBearHugBleed();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "bear-hug");
            if (!debuffActive || Date.now() >= endTime) {
              clearBearHugBleed();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Кровотечение (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          bearHugEndTimeoutId = window.setTimeout(() => {
            clearBearHugBleed();
          }, durationMs);

          pushLog(
            `${ability.name}: кровотечение наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "pack-bite": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearPackBiteBleed();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "pack-bite"),
            {
              id: "pack-bite",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "bleed",
            },
          ];

          packBiteIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearPackBiteBleed();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "pack-bite");
            if (!debuffActive || Date.now() >= endTime) {
              clearPackBiteBleed();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Кровотечение (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          packBiteEndTimeoutId = window.setTimeout(() => {
            clearPackBiteBleed();
          }, durationMs);

          pushLog(
            `${ability.name}: кровотечение наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "poison-blade": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearPoisonBladePoison();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "poison-blade"),
            {
              id: "poison-blade",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "poison",
            },
          ];

          poisonBladeIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearPoisonBladePoison();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "poison-blade");
            if (!debuffActive || Date.now() >= endTime) {
              clearPoisonBladePoison();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Яд (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          poisonBladeEndTimeoutId = window.setTimeout(() => {
            clearPoisonBladePoison();
          }, durationMs);

          pushLog(
            `${ability.name}: яд наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с. Снимайте Cleanse.`,
          );
        }
        break;
      }
      case "fire-bolt": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearFireBoltBurn();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "fire-bolt"),
            {
              id: "fire-bolt",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "burn",
            },
          ];

          fireBoltIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearFireBoltBurn();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "fire-bolt");
            if (!debuffActive || Date.now() >= endTime) {
              clearFireBoltBurn();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Горение (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          fireBoltEndTimeoutId = window.setTimeout(() => {
            clearFireBoltBurn();
          }, durationMs);

          pushLog(
            `${ability.name}: горение наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с. Снимайте Cleanse.`,
          );
        }
        break;
      }
      case "fireball": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearFireballBurn();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "fireball"),
            {
              id: "fireball",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "burn",
            },
          ];

          fireballIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearFireballBurn();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "fireball");
            if (!debuffActive || Date.now() >= endTime) {
              clearFireballBurn();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Горение (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          fireballEndTimeoutId = window.setTimeout(() => {
            clearFireballBurn();
          }, durationMs);

          pushLog(
            `${ability.name}: горение наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с. Снимайте Cleanse.`,
          );
        }
        break;
      }
      case "yatagan-strike": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearYataganStrikeBleed();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "yatagan-strike"),
            {
              id: "yatagan-strike",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "bleed",
            },
          ];

          yataganStrikeIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearYataganStrikeBleed();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "yatagan-strike");
            if (!debuffActive || Date.now() >= endTime) {
              clearYataganStrikeBleed();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Кровотечение (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          yataganStrikeEndTimeoutId = window.setTimeout(() => {
            clearYataganStrikeBleed();
          }, durationMs);

          pushLog(
            `${ability.name}: кровотечение наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "poison-flask": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearPoisonFlaskPoison();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "poison-flask"),
            {
              id: "poison-flask",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "poison",
            },
          ];

          poisonFlaskIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearPoisonFlaskPoison();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "poison-flask");
            if (!debuffActive || Date.now() >= endTime) {
              clearPoisonFlaskPoison();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Яд (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          poisonFlaskEndTimeoutId = window.setTimeout(() => {
            clearPoisonFlaskPoison();
          }, durationMs);

          pushLog(
            `${ability.name}: яд наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с. Снимайте Cleanse.`,
          );
        }
        break;
      }
      case "fire-breath": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearFireBreathBurn();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "fire-breath"),
            {
              id: "fire-breath",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "burn",
            },
          ];

          fireBreathIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearFireBreathBurn();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "fire-breath");
            if (!debuffActive || Date.now() >= endTime) {
              clearFireBreathBurn();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Горение (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          fireBreathEndTimeoutId = window.setTimeout(() => {
            clearFireBreathBurn();
          }, durationMs);

          pushLog(
            `${ability.name}: горение наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с. Снимайте Cleanse.`,
          );
        }
        break;
      }
      case "sticky-slime": {
        const result = applyBossAbilityHit(ability);
        if (!result.hit) return;

        if (
          ability.dotDurationMs &&
          ability.dotTickIntervalMs &&
          ability.dotDamagePerTick != null
        ) {
          clearStickySlimeDot();
          const durationMs = ability.dotDurationMs;
          const tickMs = ability.dotTickIntervalMs;
          const damagePerTick = ability.dotDamagePerTick;
          const endTime = Date.now() + durationMs;

          playerDebuffs.value = [
            ...playerDebuffs.value.filter((e) => e.id !== "sticky-slime"),
            {
              id: "sticky-slime",
              name: ability.name,
              icon: ability.icon ?? "IconBleed",
              durationSeconds: durationMs / 1000,
              endTime,
              debuffType: ability.debuffType ?? "other",
            },
          ];

          stickySlimeIntervalId = window.setInterval(() => {
            if (isBattleOver.value) {
              clearStickySlimeDot();
              return;
            }
            const debuffActive = playerDebuffs.value.some((e) => e.id === "sticky-slime");
            if (!debuffActive || Date.now() >= endTime) {
              clearStickySlimeDot();
              return;
            }
            applyDamageFromBoss(damagePerTick);
            spawnPlayerDmg(damagePerTick, "player-damage");
            pushLog(`Эффект (${ability.name}): −${damagePerTick} HP у героя.`, "boss-damage");
          }, tickMs);

          stickySlimeEndTimeoutId = window.setTimeout(() => {
            clearStickySlimeDot();
          }, durationMs);

          pushLog(
            `${ability.name}: эффект наносит ${damagePerTick} урона каждые ${
              tickMs / 1000
            }с в течение ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "arcane-shield": {
        if (
          ability.selfBuffType === "armor" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearArcaneShieldBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "arcane-shield"),
            {
              id: "arcane-shield",
              name: ability.name,
              icon: ability.icon ?? "IconArmorBreak",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          arcaneShieldTimeoutId = window.setTimeout(() => {
            clearArcaneShieldBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: броня босса увеличена на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "stone-skin-buff": {
        if (
          ability.selfBuffType === "armor" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearStoneSkinBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "stone-skin-buff"),
            {
              id: "stone-skin-buff",
              name: ability.name,
              icon: ability.icon ?? "IconArmorBreak",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          stoneSkinTimeoutId = window.setTimeout(() => {
            clearStoneSkinBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: броня босса увеличена на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "scale-armor": {
        if (
          ability.selfBuffType === "armor" &&
          ability.selfBuffDurationMs &&
          ability.selfBuffValue != null
        ) {
          clearScaleArmorBuff();
          const durationMs = ability.selfBuffDurationMs;
          const endTime = Date.now() + durationMs;
          bossBuffs.value = [
            ...bossBuffs.value.filter((e) => e.id !== "scale-armor"),
            {
              id: "scale-armor",
              name: ability.name,
              icon: ability.icon ?? "IconArmorBreak",
              durationSeconds: durationMs / 1000,
              endTime,
              dispellable: ability.dispellable ?? true,
            },
          ];
          scaleArmorTimeoutId = window.setTimeout(() => {
            clearScaleArmorBuff();
          }, durationMs);
          pushLog(
            `${ability.name}: броня босса увеличена на ${Math.round(
              (ability.selfBuffValue ?? 0) * 100,
            )}% на ${durationMs / 1000}с.`,
          );
        }
        break;
      }
      case "furious-charge":
      case "snout-slam":
      case "hooves-between-eyes": {
        applyBossAbilityHit(ability);
        break;
      }
      default: {
        if (ability.type === "heal" && (ability.value ?? 0) > 0) {
          const healAmount = ability.value ?? 0;
          const before = boss.stats.hp;
          boss.stats.hp += healAmount;
          clampHp(boss.stats);
          const healed = boss.stats.hp - before;
          if (healed > 0) {
            pushLog(`${ability.name}: босс восстанавливает ${healed} HP.`);
          }
          break;
        }
        if (ability.type === "damage" && ability.baseDamageX != null) {
          applyBossAbilityHit(ability);
        }
        break;
      }
    }
  };

  /** Таймер боя: время с начала битвы в миллисекундах */
  const battleTimeMs = ref(0);
  let battleTimeTickerId: number | null = null;
  let battleStartTime = 0;

  const startBattleTimer = () => {
    if (battleTimeTickerId !== null) return;
    battleStartTime = Date.now();
    battleTimeMs.value = 0;

    battleTimeTickerId = window.setInterval(() => {
      battleTimeMs.value = Date.now() - battleStartTime;
    }, 100);
  };

  const stopBattleTimer = () => {
    if (battleTimeTickerId !== null) {
      window.clearInterval(battleTimeTickerId);
      battleTimeTickerId = null;
    }
  };

  /** Форматированное время боя (MM:SS) */
  const battleTimeFormatted = computed(() => {
    const totalSeconds = Math.floor(battleTimeMs.value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  const playerDps = computed(() => {
    if (battleTimeMs.value <= 0) return 0;
    return totalDamageDealtToBoss.value / (battleTimeMs.value / 1000);
  });

  const incomingDps = computed(() => {
    if (battleTimeMs.value <= 0) return 0;
    return totalDamageTakenFromBoss.value / (battleTimeMs.value / 1000);
  });

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

      const attacker: Stats = { ...boss.stats, power: getBossEffectivePower() };

      // Считаем эффективное уклонение с бонусом от «Ускользания»
      const effectiveEvasion = Math.min(1, player.stats.evasion + playerEvasionBonus.value);
      const defenderStats: Stats = { ...player.stats, evasion: effectiveEvasion };
      const { damage, isCrit, isDodged } = calcHit(attacker, defenderStats);

      if (isDodged) {
        spawnPlayerDmg("Уклон", "dodge");
        pushLog("Босс атаковал, но ты уклонился.", "player-dodge");
      } else {
        // «Плащ теней»: снижение получаемого урона
        const reduced = Math.round(damage * (1 - damageReductionPercent.value));
        const finalDmg = Math.max(1, reduced);
        applyDamageFromBoss(finalDmg);
        spawnPlayerDmg(finalDmg, "player-damage", isCrit);
        const reductionNote = damageReductionPercent.value > 0 ? ` (−${Math.round(damageReductionPercent.value * 100)}% Плащ)` : "";
        pushLog(`Босс нанёс ${finalDmg} урона${isCrit ? " (крит)" : ""}${reductionNote}.`, "boss-damage");
      }

      scheduleNextBossAttack();
    }, BOSS_ATTACK_INTERVAL_MS);
  };

  const resetBattle = () => {
    stopBossAutoAttack();
    stopBossAttackCooldownTicker();
    stopBattleTimer();
    stopPowerBoostTimer();
    clearBossCastTimer();
    if (nextBossAbilityTimeoutId !== null) {
      window.clearTimeout(nextBossAbilityTimeoutId);
      nextBossAbilityTimeoutId = null;
    }
    if (elixirRevertTimeoutId !== null) {
      clearTimeout(elixirRevertTimeoutId);
      elixirRevertTimeoutId = null;
    }
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

    speedBonus.value = 0;
    if (speedBonusTimerId !== null) { clearTimeout(speedBonusTimerId); speedBonusTimerId = null; }

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
    clearInfectedBitePoison();
    clearBearHugBleed();
    clearSharpenTusksBuff();
    clearRoarBuff();
    clearHowlBuff();
    clearRapidReloadBuff();
    clearWarcryBuff();
    clearArcaneShieldBuff();
    clearStoneSkinBuff();
    clearScaleArmorBuff();

    bossAbilityLastUsedTurn = {};
    bossAbilityTurnCounter = 0;
    battleTimeMs.value = 0;
    totalDamageDealtToBoss.value = 0;
    totalDamageTakenFromBoss.value = 0;
    scheduleNextBossAttack();
    startBattleTimer();
    if (bossAbilityConfig.value) {
      scheduleNextBossAbility(bossAbilityConfig.value.startDelayMs);
    }
  };

  const takeLootItem = (instance: ItemInstance) => {
    const success = characterStore.addItemToInventory(instance);
    if (success) {
      loot.value = loot.value.filter((i) => i.instanceId !== instance.instanceId);
      const display = getDisplayItem(instance, getTemplate);
      pushLog(`Получен предмет: ${display?.name ?? "?"}`);
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
      clearInfectedBitePoison();
      clearBearHugBleed();
      clearSharpenTusksBuff();
      clearRoarBuff();
      clearHowlBuff();
      clearRapidReloadBuff();
      clearWarcryBuff();
      clearArcaneShieldBuff();
      clearStoneSkinBuff();
      clearScaleArmorBuff();
      clearPackBiteBleed();
      clearPoisonBladePoison();
      clearFireBoltBurn();
      clearFireballBurn();
      clearYataganStrikeBleed();
      clearPoisonFlaskPoison();
      clearFireBreathBurn();
      clearStickySlimeDot();
      clearHowlBuff();
      clearRapidReloadBuff();
      clearWarcryBuff();
      clearArcaneShieldBuff();
      clearStoneSkinBuff();
      clearScaleArmorBuff();
      stopBattleTimer();
      if (elixirRevertTimeoutId !== null) {
        clearTimeout(elixirRevertTimeoutId);
        elixirRevertTimeoutId = null;
      }
      // Сохраняем финальное HP сразу после окончания боя
      playerHp.saveHp();

      if (boss.stats.hp <= 0 && player.stats.hp > 0) {
        const monsterLevel = boss.level;
        const xp = expGainedFromMonster(monsterLevel);
        if (xp > 0) {
          playerProgress.addXp(xp);
          pushLog(`Ты получаешь ${xp} опыта.`);
        }

        const bossLevel = selectedBoss.value?.level ?? 1;
        const itemLevel = 1 + bossLevel * 3;
        const bossId = selectedBoss.value?.id ?? "";

        if (resourceBossIdSet.has(bossId) && RESOURCE_TEMPLATE_IDS.length > 0) {
          const rIdx = Math.floor(rng() * RESOURCE_TEMPLATE_IDS.length);
          const resId = RESOURCE_TEMPLATE_IDS[rIdx]!;
          loot.value = [createItemInstance(resId, itemLevel)];
        } else {
          const pool = [...ALL_TEMPLATE_IDS];
          const chosen: string[] = [];
          for (let i = 0; i < 2 && pool.length > 0; i++) {
            const idx = Math.floor(rng() * pool.length);
            chosen.push(pool[idx]!);
            pool.splice(idx, 1);
          }
          loot.value = chosen.map((templateId) => createItemInstance(templateId, itemLevel));
        }

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
    startBattleTimer();
    if (bossAbilityConfig.value) {
      scheduleNextBossAbility(bossAbilityConfig.value.startDelayMs);
    }
  });

  onUnmounted(() => {
    stopBossAutoAttack();
    stopBossAttackCooldownTicker();
    stopBattleTimer();
    stopPowerBoostTimer();
    if (elixirRevertTimeoutId !== null) {
      clearTimeout(elixirRevertTimeoutId);
      elixirRevertTimeoutId = null;
    }
    stopEffectsTicker();
    if (sweepingCritTimerId !== null) clearTimeout(sweepingCritTimerId);
    if (cunningBuffTimerId !== null) clearTimeout(cunningBuffTimerId);
    if (evasionBonusTimerId !== null) clearTimeout(evasionBonusTimerId);
    if (dodgeNextExpireTimerId !== null) clearTimeout(dodgeNextExpireTimerId);
    if (damageReductionTimerId !== null) clearTimeout(damageReductionTimerId);
    if (speedBonusTimerId !== null) clearTimeout(speedBonusTimerId);
    if (poisonDotIntervalId !== null) clearInterval(poisonDotIntervalId);
    if (poisonDotEndTimeoutId !== null) clearTimeout(poisonDotEndTimeoutId);
    clearInfectedBitePoison();
    clearBearHugBleed();
      clearSharpenTusksBuff();
      clearRoarBuff();
      clearHowlBuff();
      clearRapidReloadBuff();
      clearWarcryBuff();
      clearArcaneShieldBuff();
      clearStoneSkinBuff();
      clearScaleArmorBuff();
    clearHowlBuff();
    clearRapidReloadBuff();
    clearWarcryBuff();
    clearArcaneShieldBuff();
    clearStoneSkinBuff();
    clearScaleArmorBuff();
    clearBossCastTimer();
    if (nextBossAbilityTimeoutId !== null) {
      window.clearTimeout(nextBossAbilityTimeoutId);
    }
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
    playerEffectiveCrit,
    playerEffectiveEvasion,
    playerEffectiveSpeed,
    playerArmor,
    bossEffectiveArmor,
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
    battleTimeFormatted,
    playerDps,
    incomingDps,
    currentBossAbility,
    bossCastState,
    bossCastTimeLeftMs,
    bossCastTotalMs,
  };
}
