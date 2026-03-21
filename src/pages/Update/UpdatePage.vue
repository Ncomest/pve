<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import commitsData from "@/pages/Update/commits.json";

interface CommitEntry {
  hash?: string;
  shortHash?: string;
  date: string;
  author?: string;
  message: string;
}

const commitsRaw = commitsData as CommitEntry[];
const COMMITS_PAGE_SIZE = 10;
const visibleCount = ref(COMMITS_PAGE_SIZE);
const loadMoreTrigger = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const commits = computed(() =>
  commitsRaw.map((commit) => ({
    ...commit,
    // На некоторых местах git log мог вернуть BOM в начале строки
    message: (commit.message ?? "").replace(/^\uFEFF/, ""),
  })),
);

const visibleCommits = computed(() => commits.value.slice(0, visibleCount.value));
const hasMoreCommits = computed(() => visibleCount.value < commits.value.length);

function loadMoreCommits(): void {
  if (!hasMoreCommits.value) return;
  visibleCount.value += COMMITS_PAGE_SIZE;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(() => {
  if (!loadMoreTrigger.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      loadMoreCommits();
    },
    {
      root: null,
      rootMargin: "120px 0px",
      threshold: 0,
    },
  );

  observer.observe(loadMoreTrigger.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div class="update-page">
    <h1 class="update-page__title">Обновление</h1>
    <p class="update-page__subtitle">
      Краткая справка по бою и луту — ниже. История изменений проекта (git-коммиты) — под справкой.
    </p>

    <section class="update-page__guide" aria-labelledby="update-guide-title">
      <h2 id="update-guide-title" class="update-page__guide-title">Справка по характеристикам, бою и вещам</h2>

      <div class="update-page__guide-block">
        <h3 class="update-page__guide-h3">Босс выше уровня героя</h3>
        <p class="update-page__guide-p">
          Если у босса уровень больше вашего, бой становится сложнее: босс наносит вам больше урона, а ваш урон по боссу снижается.
        </p>
        <ul class="update-page__guide-list">
          <li><strong>На 1 уровень выше:</strong> урон босса по вам ×1,25; ваш урон по боссу ×0,75 (ко всем видам атак и способностей).</li>
          <li><strong>На 2 и более уровней выше:</strong> урон босса по вам ×1,4; ваш урон по боссу ×0,6.</li>
        </ul>
      </div>

      <div class="update-page__guide-block">
        <h3 class="update-page__guide-h3">Лут и качество вещей</h3>
        <p class="update-page__guide-p">
          С обычных боссов за победу выпадает <strong>две</strong> случайные вещи. С боссов-ресурсов (элементали и т.п.) падают
          <strong>только ресурсы</strong> — один случайный ресурс за бой, без экипировки.
        </p>
        <p class="update-page__guide-p">
          <strong>Уровень вещи</strong> при дропе: <code class="update-page__code">1 + уровень_босса × 3</code>. От него считается множитель статов:
          <code class="update-page__code">1 + (уровень_вещи − 1) × 0,1</code> — чем выше уровень вещи, тем больше цифры на ней.
        </p>
        <p class="update-page__guide-p">
          У каждой выпавшей вещи случайно определяется <strong>редкость</strong> (одинаковые шансы при дропе и при обновлении витрины торговца):
        </p>
        <ul class="update-page__guide-list">
          <li>Обычная (белая) — 90%</li>
          <li>Необычная (зелёная) — 4%</li>
          <li>Редкая (синяя) — 3%</li>
          <li>Эпическая (фиолетовая) — 2%</li>
          <li>Уникальная (жёлтая) — 1%</li>
        </ul>
        <p class="update-page__guide-p">
          <strong>Сила параметров</strong> на вещи (насколько «раскрыт» дроп от базовых единиц) зависит от редкости — случайный процент в диапазоне:
        </p>
        <ul class="update-page__guide-list">
          <li>Белая: 10–20%</li>
          <li>Зелёная: 21–40%</li>
          <li>Синяя: 41–60%</li>
          <li>Эпическая: 61–80%</li>
          <li>Уникальная: 81–100%</li>
        </ul>
        <p class="update-page__guide-p">
          Базовые единицы по типам стата (к ним применяется процент силы и множитель уровня вещи) заданы в коде: например, здоровье, атака, броня, очки крита, уклонения, скорости, духа, меткости и т.д. Итоговые значения на предмете округляются.
        </p>
      </div>

      <div class="update-page__guide-block">
        <h3 class="update-page__guide-h3">Сколько характеристик на вещи по редкости</h3>
        <p class="update-page__guide-p">Набор линий статов (ветки «или» выбираются случайно):</p>
        <ul class="update-page__guide-list update-page__guide-list--compact">
          <li><strong>Обычная:</strong> 3 характеристики — броня или атака; дух или меткость; здоровье.</li>
          <li><strong>Необычная:</strong> 4 — броня или атака; дух или меткость; крит или скорость; здоровье.</li>
          <li><strong>Редкая:</strong> 5 — броня или атака; дух или меткость; крит или скорость; защита от крита или уклонение; здоровье.</li>
          <li><strong>Эпическая:</strong> 6 — то же, что редкая, плюс самоисцеление.</li>
          <li><strong>Уникальная:</strong> 7 — броня или атака; дух или меткость; крит; скорость; защита от крита или уклонение; самоисцеление; здоровье.</li>
        </ul>
      </div>
    </section>

    <h2 class="update-page__section-heading">История коммитов</h2>

    <section class="update-page__list">
      <article
        v-for="(commit, index) in visibleCommits"
        :key="commit.hash ?? `${commit.date}-${index}`"
        class="update-card"
      >
        <div class="update-card__meta">
          <span class="update-card__date">{{ formatDate(commit.date) }}</span>
          <span v-if="commit.author" class="update-card__author">{{ commit.author }}</span>
        </div>
        <div class="update-card__message">{{ commit.message }}</div>
        <div v-if="commit.shortHash" class="update-card__hash">{{ commit.shortHash }}</div>
      </article>

      <div ref="loadMoreTrigger" class="update-page__load-trigger" />
      <div v-if="hasMoreCommits" class="update-page__load-more-hint">Прокрути вниз, чтобы загрузить еще 10</div>
    </section>
  </div>
</template>

<style scoped>
.update-page {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.update-page__title {
  font-size: 1.6rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 0.35rem;
}

.update-page__subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5rem;
  line-height: 1.4;
}

.update-page__section-heading {
  font-size: 1.15rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  margin: 0 0 0.75rem;
}

.update-page__guide {
  margin-bottom: 2rem;
  padding: 1rem 1.1rem 1.15rem;
  border-radius: 14px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  background: rgba(99, 102, 241, 0.06);
}

.update-page__guide-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 1rem;
}

.update-page__guide-block {
  margin-bottom: 1.25rem;
}

.update-page__guide-block:last-child {
  margin-bottom: 0;
}

.update-page__guide-h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(196, 210, 254, 0.98);
  margin: 0 0 0.5rem;
}

.update-page__guide-p {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.55;
  margin: 0 0 0.55rem;
}

.update-page__guide-p:last-child {
  margin-bottom: 0;
}

.update-page__guide-list {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
  margin: 0.35rem 0 0;
  padding-left: 1.25rem;
}

.update-page__guide-list--compact li {
  margin-bottom: 0.35rem;
}

.update-page__code {
  font-family: ui-monospace, monospace;
  font-size: 0.84em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(226, 232, 240, 0.95);
}

.update-page__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.update-page__load-trigger {
  width: 100%;
  height: 1px;
}

.update-page__load-more-hint {
  padding: 0.25rem 0 0.5rem;
  font-size: 0.82rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
}

.update-card {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.update-card__meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: baseline;
  margin-bottom: 6px;
}

.update-card__date {
  font-size: 0.82rem;
  color: rgba(147, 197, 253, 0.95);
  font-weight: 600;
}

.update-card__author {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.55);
}

.update-card__message {
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.update-card__hash {
  margin-top: 8px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.45);
}
</style>

