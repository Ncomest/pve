/**
 * Какой шаблон ресурса (resource-*) падает с конкретного босса-ресурса.
 * Один босс — один тип ресурса; два босса могут давать один и тот же ресурс (крафт одного слота).
 */
const RESOURCE_DROP_BY_BOSS_ID: Record<string, string> = {
  "fire-elemental": "resource-fire-essence",
  "earth-elemental": "resource-earth-essence",
  "water-elemental": "resource-water-essence",
  "air-elemental": "resource-air-essence",
  "earth-golem": "resource-golem-core",
  "fire-golem": "resource-flame-crystal",
  "water-golem": "resource-aqua-pearl",
  "earth-ethereal": "resource-stone-shard",
  "fire-ethereal": "resource-dust-fire",
  "air-ethereal": "resource-ether-air",
  /** Тот же ресурс, что у water-golem — крафт ожерелья. */
  "water-ethereal": "resource-aqua-pearl",
};

export function getResourceDropTemplateId(bossId: string): string | undefined {
  return RESOURCE_DROP_BY_BOSS_ID[bossId];
}
