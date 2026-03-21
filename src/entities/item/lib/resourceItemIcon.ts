/**
 * Иконки крафтовых ресурсов: отдельные SVG в `public/images/resources/<templateId>.svg`.
 * Замените файлы при необходимости — путь остаётся тем же.
 */
export const RESOURCE_ICON_DEFAULT = "/images/resources/resource-default.svg";

export function getResourceItemIconSrc(templateId: string): string {
  if (!templateId.startsWith("resource-")) {
    return RESOURCE_ICON_DEFAULT;
  }
  return `/images/resources/${templateId}.svg`;
}
