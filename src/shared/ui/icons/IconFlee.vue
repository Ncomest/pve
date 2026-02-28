<template>
  <!-- Сбежать: бегущая фигура со стрелками -->
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <!-- Голова -->
    <circle cx="16" cy="4" r="1.8" fill="currentColor" stroke="none"/>
    <!-- Корпус: наклон вперёд -->
    <path d="M14.5 6.5 L13 11 L9.5 11 L8 15 L11 15 L11.5 13 L14.5 13 L13.5 18 L16 18 L17.5 13.5 L19.5 14.5 L19.5 11 L16.5 9.5 L17.5 6.5 Z"/>
    <!-- Линии скорости слева -->
    <line x1="6.5" y1="9.5" x2="3.5" y2="9.5"/>
    <line x1="7" y1="13" x2="4" y2="13"/>
  </svg>
</template>
