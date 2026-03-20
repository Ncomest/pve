import { ref } from "vue";

const STORAGE_KEY = "hero-avatar";

const HERO_AVATARS = [
  { id: "1", label: "Герой 1", src: "/images/hero/1.jpg" },
  { id: "2", label: "Герой 2", src: "/images/hero/2.jpg" },
  { id: "3", label: "Герой 3", src: "/images/hero/3.jpg" },
  { id: "4", label: "Герой 4", src: "/images/hero/4.jpg" },
  { id: "5", label: "Герой 5", src: "/images/hero/5.jpg" },
  { id: "6", label: "Герой 6", src: "/images/hero/6.jpg" },
  { id: "7", label: "Герой 7", src: "/images/hero/7.webp" },
  { id: "8", label: "Герой 8", src: "/images/hero/8.webp" },
  { id: "9", label: "Герой 9", src: "/images/hero/9.webp" },
  { id: "10", label: "Герой 10", src: "/images/hero/10.webp" },
  { id: "11", label: "Герой 11", src: "/images/hero/11.webp" },
  { id: "12", label: "Герой 12", src: "/images/hero/12.webp" },
  { id: "13", label: "Герой 13", src: "/images/hero/13.webp" },
  { id: "14", label: "Герой 14", src: "/images/hero/14.jpg" },
  { id: "15", label: "Герой 15", src: "/images/hero/15.webp" },
];

const savedId = localStorage.getItem(STORAGE_KEY) ?? "";
const selectedAvatarId = ref<string>(savedId);

export function useHeroAvatar() {
  const avatars = HERO_AVATARS;

  const selectedSrc = (() => {
    const found = avatars.find((a) => a.id === selectedAvatarId.value);
    return found ? found.src : null;
  });

  function selectAvatar(id: string) {
    selectedAvatarId.value = id;
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return { avatars, selectedAvatarId, selectedSrc, selectAvatar };
}
