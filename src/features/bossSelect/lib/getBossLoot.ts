/** Уровень вещи при дропе с босса: 1 + level * 3 */
export function getBossDropItemLevel(bossLevel: number): number {
  return 1 + bossLevel * 3;
}
