const firebaseConfig = {
  apiKey: "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",
  authDomain: "resep-ai-1f6f3.firebaseapp.com",
  projectId: "resep-ai-1f6f3",
  storageBucket: "resep-ai-1f6f3.firebasestorage.app",
  messagingSenderId: "904003019547",
  appId: "1:904003019547:web:fd288ad0c2092bfa8569be",
  measurementId: "G-23PJJ9TE68"
};

// ✅ PAKAI firebase.initializeApp (bukan initializeApp sendiri)
firebase.initializeApp(firebaseConfig);

// ✅ PAKAI firebase.firestore()
const db = firebase.firestore();

// Buat global supaya app.js bisa akses
window.db = db;