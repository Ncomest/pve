import { computed, onUnmounted, reactive } from "vue";

type CooldownId = string;

export function useCooldowns() {
  const cooldownsLeftMs = reactive<Record<CooldownId, number>>({});
  let ticker: number | null = null;

  const start = () => {
    if (ticker !== null) return;
    let last = Date.now();
    ticker = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;

      for (const id of Object.keys(cooldownsLeftMs)) {
        const next = Math.max(0, (cooldownsLeftMs[id] ?? 0) - dt);
        cooldownsLeftMs[id] = next;
      }
    }, 100);
  };

  const stop = () => {
    if (ticker === null) return;
    window.clearInterval(ticker);
    ticker = null;
  };

  const setCooldown = (id: CooldownId, ms: number) => {
    cooldownsLeftMs[id] = Math.max(0, ms);
    if (cooldownsLeftMs[id] > 0) start();
  };

  const isReady = (id: CooldownId) => (cooldownsLeftMs[id] ?? 0) <= 0;

  const resetAll = () => {
    for (const id of Object.keys(cooldownsLeftMs)) {
      cooldownsLeftMs[id] = 0;
    }
    stop();
  };

  const anyActive = computed(() =>
    Object.values(cooldownsLeftMs).some((ms) => ms > 0),
  );

  onUnmounted(() => {
    stop();
  });

  return {
    cooldownsLeftMs,
    anyActive,
    setCooldown,
    isReady,
    resetAll,
    stop,
  };
}

