<script setup lang="ts">
import { computed } from "vue";
import commitsData from "@/pages/Update/commits.json";

interface CommitEntry {
  hash: string;
  shortHash: string;
  date: string;
  author: string;
  message: string;
}

const commitsRaw = commitsData as CommitEntry[];

const commits = computed(() =>
  commitsRaw.map((commit) => ({
    ...commit,
    // На некоторых местах git log мог вернуть BOM в начале строки
    message: (commit.message ?? "").replace(/^\uFEFF/, ""),
  })),
);

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
</script>

<template>
  <div class="update-page">
    <h1 class="update-page__title">Обновление</h1>
    <p class="update-page__subtitle">История изменений проекта (git-коммиты).</p>

    <section class="update-page__list">
      <article v-for="commit in commits" :key="commit.hash" class="update-card">
        <div class="update-card__meta">
          <span class="update-card__date">{{ formatDate(commit.date) }}</span>
          <span class="update-card__author">{{ commit.author }}</span>
        </div>
        <div class="update-card__message">{{ commit.message }}</div>
        <div class="update-card__hash">{{ commit.shortHash }}</div>
      </article>
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

.update-page__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

