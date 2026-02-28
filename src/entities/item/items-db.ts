import type { Item } from "@/entities/item/model";

export const ITEMS_DB: Record<string, Item> = {
  // Оружие
  "weapon-wooden-sword": {
    id: "weapon-wooden-sword",
    name: "Деревянный меч",
    slot: "weapon",
    rarity: "common",
    stats: { power: 5 },
  },
  "weapon-iron-sword": {
    id: "weapon-iron-sword",
    name: "Железный меч",
    slot: "weapon",
    rarity: "rare",
    stats: { power: 12, chanceCrit: 0.05 },
  },
  "weapon-legendary-blade": {
    id: "weapon-legendary-blade",
    name: "Легендарный клинок",
    slot: "weapon",
    rarity: "legendary",
    stats: { power: 25, chanceCrit: 0.15 },
  },

  // Щиты
  "shield-wooden": {
    id: "shield-wooden",
    name: "Деревянный щит",
    slot: "shield",
    rarity: "common",
    stats: { hp: 20, evasion: 0.03 },
  },
  "shield-iron": {
    id: "shield-iron",
    name: "Железный щит",
    slot: "shield",
    rarity: "rare",
    stats: { hp: 50, evasion: 0.08 },
  },
  "shield-dragon": {
    id: "shield-dragon",
    name: "Драконий щит",
    slot: "shield",
    rarity: "epic",
    stats: { hp: 100, evasion: 0.12 },
  },

  // Шлемы
  "helmet-leather": {
    id: "helmet-leather",
    name: "Кожаный шлем",
    slot: "helmet",
    rarity: "common",
    stats: { hp: 15 },
  },
  "helmet-iron": {
    id: "helmet-iron",
    name: "Железный шлем",
    slot: "helmet",
    rarity: "rare",
    stats: { hp: 35, evasion: 0.02 },
  },
  "helmet-royal": {
    id: "helmet-royal",
    name: "Королевский шлем",
    slot: "helmet",
    rarity: "epic",
    stats: { hp: 70, power: 5, evasion: 0.05 },
  },

  // Нагрудники
  "chest-leather": {
    id: "chest-leather",
    name: "Кожаная кираса",
    slot: "chest",
    rarity: "common",
    stats: { hp: 30 },
  },
  "chest-iron": {
    id: "chest-iron",
    name: "Железная кираса",
    slot: "chest",
    rarity: "rare",
    stats: { hp: 70, evasion: 0.03 },
  },
  "chest-dragon": {
    id: "chest-dragon",
    name: "Драконья броня",
    slot: "chest",
    rarity: "legendary",
    stats: { hp: 150, power: 8, evasion: 0.08 },
  },

  // Серьги
  "earring-bronze": {
    id: "earring-bronze",
    name: "Бронзовая серьга",
    slot: "earring",
    rarity: "common",
    stats: { chanceCrit: 0.03 },
  },
  "earring-silver": {
    id: "earring-silver",
    name: "Серебряная серьга",
    slot: "earring",
    rarity: "rare",
    stats: { chanceCrit: 0.08, power: 3 },
  },
  "earring-emerald": {
    id: "earring-emerald",
    name: "Изумрудная серьга",
    slot: "earring",
    rarity: "epic",
    stats: { chanceCrit: 0.15, power: 8 },
  },

  // Кольца
  "ring-copper": {
    id: "ring-copper",
    name: "Медное кольцо",
    slot: "ring",
    rarity: "common",
    stats: { hp: 10 },
  },
  "ring-silver": {
    id: "ring-silver",
    name: "Серебряное кольцо",
    slot: "ring",
    rarity: "rare",
    stats: { hp: 25, chanceCrit: 0.05 },
  },
  "ring-mystic": {
    id: "ring-mystic",
    name: "Мистическое кольцо",
    slot: "ring",
    rarity: "legendary",
    stats: { hp: 60, power: 10, chanceCrit: 0.1 },
  },

  // Пояса
  "belt-leather": {
    id: "belt-leather",
    name: "Кожаный пояс",
    slot: "belt",
    rarity: "common",
    stats: { armor: 5, hp: 10 },
  },
  "belt-iron": {
    id: "belt-iron",
    name: "Железный пояс",
    slot: "belt",
    rarity: "rare",
    stats: { armor: 15, hp: 25 },
  },
  "belt-dragonscale": {
    id: "belt-dragonscale",
    name: "Пояс из чешуи дракона",
    slot: "belt",
    rarity: "epic",
    stats: { armor: 30, hp: 50, evasion: 0.03 },
  },

  // Штаны
  "pants-leather": {
    id: "pants-leather",
    name: "Кожаные штаны",
    slot: "pants",
    rarity: "common",
    stats: { armor: 8, speed: 2 },
  },
  "pants-chainmail": {
    id: "pants-chainmail",
    name: "Кольчужные штаны",
    slot: "pants",
    rarity: "rare",
    stats: { armor: 20, hp: 20, speed: 1 },
  },
  "pants-shadow": {
    id: "pants-shadow",
    name: "Штаны тени",
    slot: "pants",
    rarity: "epic",
    stats: { armor: 12, speed: 6, evasion: 0.06 },
  },

  // Ботинки
  "boots-leather": {
    id: "boots-leather",
    name: "Кожаные ботинки",
    slot: "boots",
    rarity: "common",
    stats: { speed: 3 },
  },
  "boots-iron": {
    id: "boots-iron",
    name: "Железные сапоги",
    slot: "boots",
    rarity: "rare",
    stats: { armor: 12, speed: 2 },
  },
  "boots-wind": {
    id: "boots-wind",
    name: "Сапоги ветра",
    slot: "boots",
    rarity: "legendary",
    stats: { speed: 12, accuracy: 0.08, evasion: 0.1 },
  },

  // Ожерелья (шея)
  "necklace-bone": {
    id: "necklace-bone",
    name: "Костяное ожерелье",
    slot: "necklace",
    rarity: "common",
    stats: { accuracy: 0.03 },
  },
  "necklace-silver": {
    id: "necklace-silver",
    name: "Серебряная цепочка",
    slot: "necklace",
    rarity: "rare",
    stats: { accuracy: 0.07, power: 4 },
  },
  "necklace-amulet": {
    id: "necklace-amulet",
    name: "Амулет мудреца",
    slot: "necklace",
    rarity: "legendary",
    stats: { accuracy: 0.15, chanceCrit: 0.08, power: 10 },
  },
};

export const getItem = (id: string): Item | null => ITEMS_DB[id] ?? null;
