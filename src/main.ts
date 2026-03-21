import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./app/App.vue";
import { routes } from "./app/router";
import { pinia } from "./app/store";
import { useElixirsStore } from "./features/elixirs/model/useElixirsStore";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faHeart,
  faBolt,
  faShieldHalved,
  faPersonRunning,
} from "@fortawesome/free-solid-svg-icons";
import "./app/_reset.scss";
import "./style.css";

library.add(faHeart, faBolt, faShieldHalved, faPersonRunning);

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0, left: 0 }),
});

const app = createApp(App);
app.use(pinia);
useElixirsStore().clearExpiredElixirIfNeeded();
app.use(router).component("FontAwesomeIcon", FontAwesomeIcon).mount("#app");
