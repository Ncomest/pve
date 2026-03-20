<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { useSkillsStore } from "@/app/store/skills";
  import {
    ABILITIES,
    BLADE_AND_POISON_ABILITIES,
    ALL_ABILITIES,
  } from "@/features/abilities/model/abilities";
  import type { Ability } from "@/features/abilities/model/types";
  import SkillBarSlot from "@/features/skills/ui/SkillBarSlot.vue";
  import { AbilityTooltip } from "@/shared/ui/AbilityTooltip";
  import * as Icons from "@/shared/ui/icons";
  import "./SkillsPage.scss";

  const skillsStore = useSkillsStore();
  const selectedAbilityId = ref<string | null>(null);

  const activeAbilitiesTab = ref<"general" | "class">("general");
  const expandedAbilityId = ref<string | null>(null);
  const isMobile = ref(false);
  let mq: MediaQueryList | null = null;

  const abilityById = (id: string): Ability | undefined =>
    ALL_ABILITIES.find((a) => a.id === id);

  /** Все иконки способностей из shared/ui/icons — подставляются по ability.icon */
  const iconComponents = Icons as Record<
    string,
    (typeof Icons)[keyof typeof Icons]
  >;

  function assignToSlot(panelIndex: number, slotIndex: number) {
    if (selectedAbilityId.value) {
      skillsStore.setAbility(panelIndex, slotIndex, selectedAbilityId.value);
      selectedAbilityId.value = null;
    }
  }

  function clearSlot(panelIndex: number, slotIndex: number) {
    skillsStore.clearSlot(panelIndex, slotIndex);
  }

  function setHotkey(
    panelIndex: number,
    slotIndex: number,
    hotkey: string,
  ) {
    skillsStore.setHotkey(panelIndex, slotIndex, hotkey);
  }

  function selectAbility(ability: Ability) {
    selectedAbilityId.value =
      selectedAbilityId.value === ability.id ? null : ability.id;
  }

  function toggleMobileAccordion(abilityId: string) {
    expandedAbilityId.value =
      expandedAbilityId.value === abilityId ? null : abilityId;
  }

  function handleAssignFromAccordion(ability: Ability) {
    selectAbility(ability);
    expandedAbilityId.value = null;
  }

  function abilityTypeLabel(type: Ability["type"]): string {
    const map: Record<Ability["type"], string> = {
      damage: "Урон",
      heal: "Лечение",
      buff: "Усиление",
      evidence: "Избегание урона",
      control: "Контроль",
    };
    return map[type];
  }

  const activeAbilities = computed(() =>
    activeAbilitiesTab.value === "general"
      ? ABILITIES
      : BLADE_AND_POISON_ABILITIES,
  );

  const mobileDescriptions = computed(() => {
    if (activeAbilitiesTab.value === "general") {
      return "Эти способности позволяют выполнять механику боя с боссом — уклоняться от атак, прерывать врага, очищать дебаффы и восстанавливать здоровье.";
    }

    return "Способности класса «Клинок и Яд» для нанесения урона, управления и усиления комбинаций.";
  });

  watch(activeAbilitiesTab, () => {
    expandedAbilityId.value = null;
  });

  const updateIsMobile = () => {
    if (!mq) return;
    isMobile.value = mq.matches;
    // На смене режима закрываем аккордеон, чтобы не оставалось "висящего" контента.
    if (!mq.matches) expandedAbilityId.value = null;
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    mq = window.matchMedia("(max-width: 600px)");
    updateIsMobile();

    // Safari/старые браузеры могут не поддерживать addEventListener на MediaQueryList
    if (mq.addEventListener) {
      mq.addEventListener("change", updateIsMobile);
    } else {
      // eslint-disable-next-line deprecation/deprecation
      mq.addListener(updateIsMobile);
    }
  });

  onUnmounted(() => {
    if (!mq) return;
    if (mq.removeEventListener) {
      mq.removeEventListener("change", updateIsMobile);
    } else {
      // eslint-disable-next-line deprecation/deprecation
      mq.removeListener(updateIsMobile);
    }
  });
</script>

<template>
  <div class="skills-page">
    <h1 class="skills-page__title">Навыки</h1>
    <p class="skills-page__subtitle">
      Выберите способность из списка и нажмите на пустой слот, чтобы поставить
      её на панель. На мобильных устройствах назначение горячих клавиш
      отключено.
    </p>

    <div class="skills-page__panels">
      <div
        v-for="(bar, panelIndex) in skillsStore.panels"
        :key="panelIndex"
        class="skill-panel"
      >
        <span class="skill-panel__label">Панель {{ panelIndex + 1 }}</span>
        <div class="skill-panel__slots">
          <div
            v-for="(slot, slotIndex) in bar"
            :key="slotIndex"
            class="skill-panel__slot-wrap"
            :class="{
              'skill-panel__slot-wrap--has-ability':
                slot.abilityId && abilityById(slot.abilityId),
            }"
          >
            <SkillBarSlot
              :ability="
                slot.abilityId ? (abilityById(slot.abilityId) ?? null) : null
              "
              :hotkey="slot.hotkey"
              :editable="true"
              @assign="assignToSlot(panelIndex, slotIndex)"
              @clear="clearSlot(panelIndex, slotIndex)"
              @update:hotkey="setHotkey(panelIndex, slotIndex, $event)"
            />
            <div
              v-if="slot.abilityId && abilityById(slot.abilityId)"
              class="skill-panel__tooltip"
            >
              <AbilityTooltip :ability="abilityById(slot.abilityId)!" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="ability-list__hint">
      <template v-if="!isMobile">
        Нажмите на способность, чтобы выбрать её, затем кликните на пустой
        слот панели для назначения. Выбрано:
      </template>
      <template v-else>
        Нажмите на способность, чтобы открыть описание, затем нажмите
        «Назначить». Выбрано:
      </template>
      <strong v-if="selectedAbilityId">{{
        abilityById(selectedAbilityId)?.name ?? selectedAbilityId
      }}</strong>
      <span v-else>—</span>
    </p>

    <div class="abilities-tabs">
      <button
        type="button"
        class="abilities-tabs__tab"
        :class="{
          'abilities-tabs__tab--active': activeAbilitiesTab === 'general',
        }"
        @click="activeAbilitiesTab = 'general'"
      >
        Общие
      </button>
      <button
        type="button"
        class="abilities-tabs__tab"
        :class="{
          'abilities-tabs__tab--active': activeAbilitiesTab === 'class',
        }"
        @click="activeAbilitiesTab = 'class'"
      >
        Классовые
      </button>
    </div>

    <section class="ability-list">
      <h2 class="ability-list__title">
        {{
          activeAbilitiesTab === "general"
            ? "Общие способности"
            : "Способности класса"
        }}
      </h2>
      <p class="ability-list__description">{{ mobileDescriptions }}</p>

      <div class="ability-list__grid">
        <div
          v-for="ability in activeAbilities"
          :key="ability.id"
          class="ability-list__accordion-item"
        >
          <!-- Desktop: hover tooltip -->
          <button
            v-if="!isMobile"
            type="button"
            class="ability-card"
            :class="[
              `ability-card--${ability.type}`,
              { 'ability-card--selected': selectedAbilityId === ability.id },
            ]"
            @click="selectAbility(ability)"
          >
            <span class="ability-card__icon-wrap">
              <img
                v-if="
                  ability.icon &&
                  (ability.icon.startsWith('/') ||
                    ability.icon.startsWith('http'))
                "
                :src="ability.icon"
                :alt="ability.name"
              />
              <component
                v-else-if="ability.icon && iconComponents[ability.icon]"
                :is="iconComponents[ability.icon]"
              />
              <span class="ability-card__tooltip">
                <span class="ability-card__tooltip-title">{{
                  ability.name
                }}</span>
                <span
                  v-if="ability.cooldownMs > 0"
                  class="ability-card__detail-row"
                >
                  <span class="ability-card__detail-label"
                    >Перезарядка:</span
                  >
                  <span class="ability-card__detail-value"
                    >{{ (ability.cooldownMs / 1000).toFixed(0) }} сек</span
                  >
                </span>
                <span class="ability-card__detail-row">
                  <span class="ability-card__detail-label">Роль:</span>
                  <span class="ability-card__detail-value">{{
                    abilityTypeLabel(ability.type)
                  }}</span>
                </span>
                <span
                  v-if="ability.description"
                  class="ability-card__detail-row ability-card__detail-row--description"
                >
                  <span class="ability-card__detail-label">Описание:</span>
                  <span class="ability-card__detail-value">{{
                    ability.description
                  }}</span>
                </span>
              </span>
            </span>
            <span class="ability-card__name">{{ ability.name }}</span>
          </button>

          <!-- Mobile: accordion + "Назначить" -->
          <div v-else class="ability-accordion-item">
            <button
              type="button"
              class="ability-card ability-accordion-item__summary"
              :class="[
                `ability-card--${ability.type}`,
                { 'ability-card--selected': selectedAbilityId === ability.id },
              ]"
              @click="toggleMobileAccordion(ability.id)"
            >
              <span class="ability-card__icon-wrap">
                <img
                  v-if="
                    ability.icon &&
                    (ability.icon.startsWith('/') ||
                      ability.icon.startsWith('http'))
                  "
                  :src="ability.icon"
                  :alt="ability.name"
                />
                <component
                  v-else-if="ability.icon && iconComponents[ability.icon]"
                  :is="iconComponents[ability.icon]"
                />
              </span>
              <span class="ability-card__name">{{ ability.name }}</span>
            </button>

            <div
              v-if="expandedAbilityId === ability.id"
              class="ability-accordion-item__content"
            >
              <div class="ability-accordion-item__details">
                <div
                  v-if="ability.cooldownMs > 0"
                  class="ability-card__detail-row"
                >
                  <span class="ability-card__detail-label">Перезарядка:</span>
                  <span class="ability-card__detail-value"
                    >{{ (ability.cooldownMs / 1000).toFixed(0) }} сек</span
                  >
                </div>
                <div class="ability-card__detail-row">
                  <span class="ability-card__detail-label">Роль:</span>
                  <span class="ability-card__detail-value">{{
                    abilityTypeLabel(ability.type)
                  }}</span>
                </div>
                <div
                  v-if="ability.description"
                  class="ability-card__detail-row ability-card__detail-row--description"
                >
                  <span class="ability-card__detail-label">Описание:</span>
                  <span class="ability-card__detail-value">{{
                    ability.description
                  }}</span>
                </div>
              </div>

              <div class="ability-accordion-item__actions">
                <button
                  type="button"
                  class="ability-accordion-item__assign-btn"
                  @click.stop="handleAssignFromAccordion(ability)"
                >
                  Назначить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
