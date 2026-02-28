/**
 * Строит строку горячей клавиши из события клавиатуры.
 * Нормализует Shift+цифра к виду "Shift+1" (а не "Shift+!").
 */
const SHIFT_SYMBOL_TO_DIGIT: Record<string, string> = {
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
};

export function buildHotkeyString(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  let key = event.key;
  if (event.shiftKey && key in SHIFT_SYMBOL_TO_DIGIT) {
    key = SHIFT_SYMBOL_TO_DIGIT[key];
  }
  parts.push(key);

  return parts.join("+");
}
