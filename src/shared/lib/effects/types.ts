/**
 * Активный эффект в бою (бафф или дебафф) с оставшимся временем действия.
 */
export interface ActiveEffect {
  id: string;
  name: string;
  /** Имя SVG-компонента из @/shared/ui/icons или текстовый символ */
  icon: string;
  description?: string;
  /** Оставшееся время действия в секундах (обновляется реактивно) */
  durationSeconds: number;
  /** Метка окончания эффекта (Date.now() + durationMs) для тикера */
  endTime?: number;
}
