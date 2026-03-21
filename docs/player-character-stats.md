# Статы героя: где считается что

Одна точка входа для **сложения базы, уровня и экипировки**, а также для **эликсиров «+X% к броне / скорости»** и **множителя кулдаунов от скорости**:

**`src/entities/character/lib/playerStatAggregation.ts`**

Там же константы:

- `LEVEL_HP_PER_LEVEL`, `LEVEL_POWER_PER_LEVEL` — прирост за уровень персонажа (не путать с уровнем вещи);
- `MAX_COOLDOWN_REDUCTION_FROM_SPEED` — потолок ускорения перезарядки от скорости;
- `playerSpeedBaseline()` — опорное значение стата скорости без экипировки (берётся из `PLAYER_CHARACTER` в `model.ts`).

Функции:

- `aggregateEquipmentBonuses` — сумма эффективных статов с предметов (очки → доли для крита, уклонения, меткости, защиты от крита, самоисцеления);
- `buildPlayerCombatStats` — итоговые статы для боя;
- `cooldownFactorFromSpeed` — множитель длительности кулдаунов;
- `applyElixirArmorPercentToArmorPoints` / `applyElixirSpeedPercentToSpeedTotal` — логика эликсиров брони и скорости.

Pinia-стор **`src/app/store/character.ts`** в геттере `equipmentStats` только собирает `ItemStats[]` с экипировки и вызывает `aggregateEquipmentBonuses` — без дублирования формул.

---

## Связанные файлы (коэффициенты и данные, не дублировать логику)

| Что менять | Файл |
|------------|------|
| Коэффициенты «очки → доля» (крит, уклонение, скорость, броня, …) | `src/entities/item/lib/statPoints.ts` |
| Стартовые статы героя | `src/entities/character/model.ts` (`PLAYER_CHARACTER`) |
| Имена/slot/id шаблонов экипировки (без числовых статов — они с процедурного лута) | `src/entities/item/items-db.ts` |
| Процедурный лут (PROC_BASE) | `src/entities/item/lib/itemGeneration.ts` |
| Рост статов от **уровня вещи** | `src/entities/item/lib/itemLevel.ts` |
| Формулы урона в бою | `src/features/battle/model/useBattle.ts` (`calcHit` и т.д.) |

См. также `docs/balance-items.md`.
