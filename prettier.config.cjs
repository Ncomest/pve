/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: "always",
  endOfLine: "auto",

  // Для Vue-компонентов выравниваем <script> и <style> как часть форматирования.
  vueIndentScriptAndStyle: true,
};

