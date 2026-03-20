// ═══════════════════════════════════════════════════════════════
// INICIALIZACE — Firebase + React hooks (sdílené pro všechny soubory)
// ═══════════════════════════════════════════════════════════════

// React hooks (var = globální, dostupné ve všech souborech)
var { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } = React;

// Firebase
var app = firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();

// Auth context (sdílený mezi auth.jsx a ostatními)
var AuthContext = createContext(null);