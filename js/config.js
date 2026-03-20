// ═══════════════════════════════════════════════════════════════
// KONFIGURACE — zde měníte Firebase údaje, název aplikace, atd.
// ═══════════════════════════════════════════════════════════════

// Firebase konfigurace (z Firebase Console → Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyD8oXYHW7XHG6-DGu09vY0VsiEvk0vucJk",
  authDomain: "hodnoceni-testu.firebaseapp.com",
  projectId: "hodnoceni-testu",
  storageBucket: "hodnoceni-testu.firebasestorage.app",
  messagingSenderId: "359243931679",
  appId: "1:359243931679:web:d766e013ab6663075eb52a"
};

// Branding — název aplikace (zobrazuje se v loginu a sidebaru)
const APP_NAME = "Hodnocení testů";
const APP_SUBTITLE = "Systém pro vyhodnocování";
const LOGIN_SUBTITLE = "Přihlaste se pro pokračování";

// ═══════════════════════════════════════════════════════════════
// STRUKTURA ZÁZNAMOVÉHO ARCHU — stejná pro všechny testy
// ═══════════════════════════════════════════════════════════════
const SHEET_LAYOUT = [
  { label: "Úlohy 1–6 (otevřené odpovědi)", rows: [
    { cols: 2, tasks: ["1.1", "1.2"] },
    { cols: 2, tasks: ["2.1", "2.2"] },
    { cols: 2, tasks: ["3.1", "3.2"] },
    { cols: 2, tasks: ["4.1", "4.2"] },
    { cols: 2, tasks: ["5.1", "5.2"] },
    { cols: 3, tasks: ["6.1", "6.2", "6.3"] },
  ]},
  { label: "Úloha 7 (geometrie – rýsování)", rows: [
    { cols: 1, tasks: ["7"] },
  ]},
  { label: "Úlohy 8.1–8.3 (Ano / Ne)", rows: [
    { cols: 3, tasks: ["8.1", "8.2", "8.3"] },
  ]},
  { label: "Úlohy 9–12 (ABCDE)", rows: [
    { cols: 4, tasks: ["9", "10", "11", "12"] },
  ]},
  { label: "Úlohy 13–14 (otevřené odpovědi)", rows: [
    { cols: 2, tasks: ["13.1", "13.2"] },
    { cols: 3, tasks: ["14.1", "14.2", "14.3"] },
  ]},
];

// Detekce typu úlohy podle ID
function getTaskType(taskId) {
  if (taskId === "7") return "geometry";
  if (["8.1","8.2","8.3"].includes(taskId)) return "yn";
  if (["9","10","11","12"].includes(taskId)) return "abcde";
  return "open";
}

// Všechna ID úloh (generováno automaticky z SHEET_LAYOUT)
const ALL_TASK_IDS = SHEET_LAYOUT.flatMap(s => s.rows.flatMap(r => r.tasks));