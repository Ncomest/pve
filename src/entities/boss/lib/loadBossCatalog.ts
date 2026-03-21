import type { Boss } from "@/entities/boss/model";

let bossesPromise: Promise<Boss[]> | null = null;
let resourcesPromise: Promise<Boss[]> | null = null;

function loadBossesJson(): Promise<Boss[]> {
  if (!bossesPromise) {
    bossesPromise = import("@/entities/boss/bosses.json").then(
      (m) => m.default as Boss[],
    );
  }
  return bossesPromise;
}

function loadResourcesJson(): Promise<Boss[]> {
  if (!resourcesPromise) {
    resourcesPromise = import("@/entities/boss/resources.json").then(
      (m) => m.default as Boss[],
    );
  }
  return resourcesPromise;
}

/**
 * Загружает каталог боссов и ресурсов (отдельный чанк, кеш на сессию).
 * Используется на экране выбора и в бою.
 */
export async function loadBossCatalog(): Promise<{
  bosses: Boss[];
  resources: Boss[];
  allBosses: Boss[];
  resourceBossIdSet: Set<string>;
}> {
  const [bosses, resources] = await Promise.all([
    loadBossesJson(),
    loadResourcesJson(),
  ]);
  return {
    bosses,
    resources,
    allBosses: [...bosses, ...resources],
    resourceBossIdSet: new Set(resources.map((b) => b.id)),
  };
}
