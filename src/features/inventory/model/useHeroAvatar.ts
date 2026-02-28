import { ref } from "vue";

const STORAGE_KEY = "hero-avatar";

const HERO_AVATARS = [
  { id: "1", label: "Герой 1", src: "/images/hero/1.jpg" },
  { id: "2", label: "Герой 2", src: "/images/hero/2.jpg" },
  { id: "3", label: "Герой 3", src: "/images/hero/3.jpg" },
  { id: "4", label: "Герой 4", src: "/images/hero/4.jpg" },
  { id: "5", label: "Герой 5", src: "/images/hero/5.jpg" },
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
