import type { RouteRecordRaw } from "vue-router";
import BossSelectPage from "@/pages/BossSelect/BossSelectPage.vue";
import BattlePage from "@/pages/Battle/BattlePage.vue";
import CharacterPage from "@/pages/Character/CharacterPage.vue";
import MerchantPage from "@/pages/Merchant/MerchantPage.vue";
import SkillsPage from "@/pages/Skills/SkillsPage.vue";
import CraftPage from "@/pages/Craft/CraftPage.vue";
import UpdatePage from "@/pages/Update/UpdatePage.vue";
import InfoPage from "@/pages/Info/InfoPage.vue";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "boss-select",
    component: BossSelectPage,
  },
  {
    path: "/battle/:bossId",
    name: "battle",
    component: BattlePage,
    props: true,
  },
  {
    path: "/character",
    name: "character",
    component: CharacterPage,
  },
  {
    path: "/merchant",
    name: "merchant",
    component: MerchantPage,
  },
  {
    path: "/skills",
    name: "skills",
    component: SkillsPage,
  },
  {
    path: "/update",
    name: "update",
    component: UpdatePage,
  },
  {
    path: "/info",
    name: "info",
    component: InfoPage,
  },
  {
    path: "/craft",
    name: "craft",
    component: CraftPage,
  },
];

