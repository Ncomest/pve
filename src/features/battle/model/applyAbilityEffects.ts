/**
 * Применение списка эффектов способности в бою.
 * Контекст передаётся из useBattle; каждый тип эффекта обрабатывается своим обработчиком.
 */
import type { Stats } from "@/entities/boss/model";
import type { ActiveEffect, AbilityEffect, DebuffType } from "@/shared/lib/effects/types";

export interface BattleEffectContext {
  player: { stats: Stats };
  boss: { stats: Stats };
  getPlayerPower(): number;
  getEffectiveBossArmor(): number;
  getEffectivePlayerCrit(): number;
  comboPoints: { value: number };
  COMBO_POINTS_MAX: number;
  gainCombo(n: number): void;
  spendCombo(): number;
  playerBuffs: { value: ActiveEffect[] };
  playerDebuffs: { value: ActiveEffect[] };
  bossBuffs: { value: ActiveEffect[] };
  bossDebuffs: { value: ActiveEffect[] };
  eviscerateStacks: { value: number };
  EVISERATE_STACKS_MAX: number;
  setPlayerEvasionBonus(v: number): void;
  setDodgeNextAttack(v: boolean): void;
  setDamageReductionPercent(v: number): void;
  setSweepingCritBonus(v: number): void;
  setCunningBuffActive(v: boolean): void;
  setEviscerateStacks(v: number): void;
  bossBleed: { value: { damagePerTick: number; endTime: number } | null };
  setBossBleed(v: { damagePerTick: number; endTime: number } | null): void;
  clearBossBleed(): void;
  bossArmorDebuff: { value: { value: number; endTime: number } | null };
  setBossArmorDebuff(v: { value: number; endTime: number } | null): void;
  clearBossArmorDebuff(): void;
  pushLog(msg: string): void;
  calcHit(attacker: Stats, defender: Stats): { damage: number; isCrit: boolean; isDodged: boolean };
  clampHp(stats: Stats): void;
  isBattleOver(): boolean;
  addTimeoutId(id: number): void;
  addIntervalId(id: number): void;
  startPowerBoost(value: number, durationMs: number): void;
  spawnBossDmg(value: number | string, type: "damage" | "dodge", isCrit?: boolean): void;
  spawnPlayerDmg(value: number | string, type: "player-damage" | "heal" | "dodge", isCrit?: boolean): void;
  /** Урон игрока по боссу: множитель уровня + самоисцеление */
  applyDamageToBoss(rawDamage: number): number;
  /** Для финишера: количество потраченных комбо (заполняется после spend_combo) */
  turnState: { spentCombo?: number; cunningConsumed?: boolean };
}

export interface AbilityMeta {
  id: string;
  name: string;
  icon?: string;
}

const rng = () => Math.random();

function addPlayerBuff(ctx: BattleEffectContext, effect: ActiveEffect) {
  ctx.playerBuffs.value = ctx.playerBuffs.value.filter((e) => e.id !== effect.id);
  ctx.playerBuffs.value = [...ctx.playerBuffs.value, effect];
}

function removePlayerBuff(ctx: BattleEffectContext, id: string) {
  ctx.playerBuffs.value = ctx.playerBuffs.value.filter((e) => e.id !== id);
}

function addBossDebuff(ctx: BattleEffectContext, effect: ActiveEffect) {
  ctx.bossDebuffs.value = ctx.bossDebuffs.value.filter((e) => e.id !== effect.id);
  ctx.bossDebuffs.value = [...ctx.bossDebuffs.value, effect];
}

function removeBossDebuff(ctx: BattleEffectContext, id: string) {
  ctx.bossDebuffs.value = ctx.bossDebuffs.value.filter((e) => e.id !== id);
}

function cleansePlayerDebuffs(
  ctx: BattleEffectContext,
  debuffTypes: DebuffType[] | undefined,
) {
  const before = ctx.playerDebuffs.value.length;
  if (!before) return 0;

  if (!debuffTypes || debuffTypes.length === 0) {
    ctx.playerDebuffs.value = [];
    return before;
  }

  const typeSet = new Set<DebuffType>(debuffTypes);
  const kept: ActiveEffect[] = [];
  let removed = 0;
  for (const effect of ctx.playerDebuffs.value) {
    const t = effect.debuffType;
    if (t && typeSet.has(t)) {
      removed += 1;
      continue;
    }
    kept.push(effect);
  }
  ctx.playerDebuffs.value = kept;
  return removed;
}

function dispelBossBuffs(ctx: BattleEffectContext) {
  const before = ctx.bossBuffs.value.length;
  if (!before) return 0;
  const kept: ActiveEffect[] = [];
  let removed = 0;
  for (const effect of ctx.bossBuffs.value) {
    if (effect.dispellable) {
      removed += 1;
      continue;
    }
    kept.push(effect);
  }
  ctx.bossBuffs.value = kept;
  return removed;
}

function applyOneEffect(
  ctx: BattleEffectContext,
  meta: AbilityMeta,
  effect: AbilityEffect,
): void {
  switch (effect.kind) {
    case "damage": {
      const armor = ctx.getEffectiveBossArmor();
      const defender: Stats = { ...ctx.boss.stats, armor };
      const power = effect.baseDamageX != null
        ? ctx.getPlayerPower() * effect.baseDamageX
        : (effect.value ?? 0);
      const n = ctx.turnState.spentCombo ?? 1;
      const mult = effect.baseDamageX != null && n > 1 ? n : 1;
      let stackBonus = 0;
      if (effect.eviscerateStackBonusPercent != null && ctx.turnState.spentCombo != null && ctx.eviscerateStacks.value > 0) {
        stackBonus = ctx.eviscerateStacks.value * effect.eviscerateStackBonusPercent;
        ctx.setEviscerateStacks(0);
        removePlayerBuff(ctx, "eviserate-stacks");
      }
      const powerWithStack = Math.round(power * (1 + stackBonus));
      const attackerScaled: Stats = {
        ...ctx.player.stats,
        power: powerWithStack * mult,
        chanceCrit: ctx.getEffectivePlayerCrit(),
      };
      const { damage, isCrit, isDodged } = ctx.calcHit(attackerScaled, defender);
      if (isDodged) {
        ctx.spawnBossDmg("Уклон", "dodge");
        ctx.pushLog(`${meta.name}: босс уклонился.`);
        return;
      }
      const cunningMult = ctx.turnState.cunningConsumed ? 2 : 1;
      const finalDamage = damage * cunningMult;
      const applied = ctx.applyDamageToBoss(finalDamage);
      ctx.spawnBossDmg(applied, "damage", isCrit);
      const cunningNote = ctx.turnState.cunningConsumed ? " (×2 Коварство)" : "";
      const stackNote = stackBonus > 0 ? ` (+${Math.round(stackBonus * 100)}% от стак.)` : "";
      ctx.pushLog(`${meta.name}: ${applied} урона${isCrit ? " (крит)" : ""}${cunningNote}${stackNote}.`);
      break;
    }

    case "heal": {
      const before = ctx.player.stats.hp;
      ctx.player.stats.hp += effect.value;
      ctx.clampHp(ctx.player.stats);
      const healed = ctx.player.stats.hp - before;
      ctx.spawnPlayerDmg(healed, "heal");
      ctx.pushLog(`Ты восстановил ${healed} HP.`);
      break;
    }

    case "gain_combo": {
      ctx.gainCombo(effect.amount);
      ctx.pushLog(`Комбо: ${ctx.comboPoints.value}/${ctx.COMBO_POINTS_MAX}`);
      break;
    }

    case "spend_combo": {
      if (ctx.comboPoints.value < effect.costMin) {
        ctx.pushLog(`${meta.name}: нужно минимум ${effect.costMin} комбо-поинтов (сейчас ${ctx.comboPoints.value}).`);
        return;
      }
      ctx.turnState.spentCombo = ctx.spendCombo();
      break;
    }

    case "self_buff_crit": {
      ctx.setSweepingCritBonus(effect.percent);
      const endTime = Date.now() + effect.durationMs;
      addPlayerBuff(ctx, {
        id: "sweeping-crit",
        name: `Крит +${Math.round(effect.percent * 100)}%`,
        icon: meta.icon ?? "IconPowerBoost",
        durationSeconds: effect.durationMs / 1000,
        endTime,
      });
      const critTimerId = window.setTimeout(() => {
        ctx.setSweepingCritBonus(0);
        removePlayerBuff(ctx, "sweeping-crit");
      }, effect.durationMs);
      ctx.addTimeoutId(critTimerId);
      break;
    }

    case "eviscerate_stacks": {
      const newStacks = Math.min(ctx.EVISERATE_STACKS_MAX, ctx.eviscerateStacks.value + effect.gain);
      ctx.setEviscerateStacks(newStacks);
      const existing = ctx.playerBuffs.value.find((e) => e.id === "eviserate-stacks");
      if (existing) {
        existing.stacks = newStacks;
        existing.name = `Потрошение (${newStacks}/${ctx.EVISERATE_STACKS_MAX})`;
      } else {
        addPlayerBuff(ctx, {
          id: "eviserate-stacks",
          name: `Потрошение (${newStacks}/${ctx.EVISERATE_STACKS_MAX})`,
          icon: "IconBleed",
          durationSeconds: 0,
          stacks: newStacks,
        });
      }
      break;
    }


    case "block_specials": {
      const blockDuration = effect.durationMs;
      const blockEndTime = Date.now() + blockDuration;
      addPlayerBuff(ctx, {
        id: meta.id,
        name: meta.name,
        icon: meta.icon ?? "IconArmorBreak",
        durationSeconds: blockDuration / 1000,
        endTime: blockEndTime,
      });
      const blockTimerId = window.setTimeout(() => removePlayerBuff(ctx, meta.id), blockDuration);
      ctx.addTimeoutId(blockTimerId);
      ctx.pushLog(`${meta.name}: особые атаки босса заблокированы на ${blockDuration / 1000}с.`);
      break;
    }

    case "cunning_buff": {
      ctx.setCunningBuffActive(true);
      const cunEndTime = Date.now() + effect.durationMs;
      addPlayerBuff(ctx, {
        id: "cunning-buff",
        name: "Коварство",
        icon: meta.icon ?? "IconSword",
        durationSeconds: effect.durationMs / 1000,
        endTime: cunEndTime,
      });
      const cunTimerId = window.setTimeout(() => {
        ctx.setCunningBuffActive(false);
        removePlayerBuff(ctx, "cunning-buff");
      }, effect.durationMs);
      ctx.addTimeoutId(cunTimerId);
      break;
    }

    case "interrupt":
      ctx.pushLog(`${meta.name}: прерывание способности цели.`);
      break;

    case "dot": {
      // DoT: мгновенный урон (опционально) + тики
      const power = ctx.getPlayerPower();
      const n = ctx.turnState.spentCombo ?? 1;
      if (effect.instantDamageRatio != null && effect.instantDamageRatio > 0) {
        const instantDmg = Math.round(power * effect.instantDamageRatio * n);
        if (instantDmg > 0) {
          const instAp = ctx.applyDamageToBoss(instantDmg);
          ctx.spawnBossDmg(instAp, "damage");
        }
      }
      const tickDmg = effect.damagePerTick != null
        ? effect.damagePerTick
        : Math.round(power * (effect.tickDamageMultiplier ?? 0.3) * n);
      removeBossDebuff(ctx, meta.id);
      const endTime = Date.now() + effect.durationMs;
      addBossDebuff(ctx, {
        id: meta.id,
        name: meta.name,
        icon: meta.icon ?? "IconBleed",
        durationSeconds: effect.durationMs / 1000,
        endTime,
      });
      const procChance = effect.procChance ?? 0;
      const procBuffDurationMs = effect.procBuffDurationMs ?? 15_000;
      const intervalId = window.setInterval(() => {
        if (ctx.isBattleOver() || Date.now() >= endTime) {
          return;
        }
        const tickAp = ctx.applyDamageToBoss(tickDmg);
        ctx.spawnBossDmg(tickAp, "damage");
        if (procChance > 0 && rng() < procChance && effect.procBuffId === "cunning") {
          ctx.setCunningBuffActive(true);
          const procEndTime = Date.now() + procBuffDurationMs;
          addPlayerBuff(ctx, {
            id: "cunning-buff",
            name: "Коварство",
            icon: "IconSword",
            durationSeconds: procBuffDurationMs / 1000,
            endTime: procEndTime,
          });
          const procTimerId = window.setTimeout(() => {
            ctx.setCunningBuffActive(false);
            removePlayerBuff(ctx, "cunning-buff");
          }, procBuffDurationMs);
          ctx.addTimeoutId(procTimerId);
          ctx.pushLog(`Яд (${meta.name}): −${tickAp} HP. Сработало «Коварство»!`);
        } else {
          ctx.pushLog(`Яд (${meta.name}): −${tickAp} HP у босса.`);
        }
      }, effect.tickIntervalMs);
      ctx.addIntervalId(intervalId);
      const clearId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        removeBossDebuff(ctx, meta.id);
      }, effect.durationMs);
      ctx.addTimeoutId(clearId);
      const comboNote = ctx.turnState.spentCombo != null ? ` (${n} комбо). Комбо сброшено` : "";
      ctx.pushLog(`${meta.name}: урон мгновенно + яд ${effect.durationMs / 1000}с${comboNote}.`);
      break;
    }

    case "cleanse": {
      const removed = cleansePlayerDebuffs(ctx, effect.debuffTypes);
      if (removed > 0) {
        const typeNote =
          effect.debuffTypes && effect.debuffTypes.length > 0
            ? ` (${effect.debuffTypes.join(", ")})`
            : "";
        ctx.pushLog(`${meta.name}: снято дебаффов с героя: ${removed}${typeNote}.`);
      } else {
        ctx.pushLog(`${meta.name}: на тебе нет подходящих дебаффов для снятия.`);
      }
      break;
    }

    case "dispel": {
      const removed = dispelBossBuffs(ctx);
      if (removed > 0) {
        ctx.pushLog(`${meta.name}: с босса снято бафов: ${removed}.`);
      } else {
        ctx.pushLog(`${meta.name}: на боссе нет бафов, которые можно развеять.`);
      }
      break;
    }

    default:
      break;
  }
}

/**
 * Применяет список эффектов способности в заданном порядке.
 * Контекст должен быть подготовлен в useBattle (refs, функции, turnState).
 */
export function applyEffects(
  ctx: BattleEffectContext,
  meta: AbilityMeta,
  effects: AbilityEffect[],
): void {
  ctx.turnState.spentCombo = undefined;
  ctx.turnState.cunningConsumed = undefined;
  for (const effect of effects) {
    if (ctx.isBattleOver()) return;
    applyOneEffect(ctx, meta, effect);
  }
}
