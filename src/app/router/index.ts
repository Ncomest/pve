import type { RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/boss-select",
    name: "boss-select",
    component: () => import("@/pages/BossSelect/BossSelectPage.vue"),
  },
  {
    path: "/battle/:bossId",
    name: "battle",
    component: () => import("@/pages/Battle/BattlePage.vue"),
    props: true,
  },
  {
    path: "/",
    name: "character",
    component: () => import("@/pages/Character/CharacterPage.vue"),
  },
  {
    path: "/merchant",
    name: "merchant",
    component: () => import("@/pages/Merchant/MerchantPage.vue"),
  },
  {
    path: "/skills",
    name: "skills",
    component: () => import("@/pages/Skills/SkillsPage.vue"),
  },
  {
    path: "/update",
    name: "update",
    component: () => import("@/pages/Update/UpdatePage.vue"),
  },
  {
    path: "/info",
    name: "info",
    component: () => import("@/pages/Info/InfoPage.vue"),
  },
  {
    path: "/craft",
    name: "craft",
    component: () => import("@/pages/Craft/CraftPage.vue"),
  },
];
