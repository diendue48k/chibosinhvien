import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD60X31IZhCrbQUv14E6ekwGbnGWQXICF4",
  authDomain: "qlysinhvien-956a8.firebaseapp.com",
  projectId: "qlysinhvien-956a8",
  storageBucket: "qlysinhvien-956a8.firebasestorage.app",
  messagingSenderId: "717940346844",
  appId: "1:717940346844:web:14b66342a6ff3c4ff04919"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("=== CHECKING ho_so_ket_nap ===");
  try {
    const snap = await getDocs(collection(db, "ho_so_ket_nap"));
    console.log(`Total documents: ${snap.docs.length}`);
    snap.docs.forEach(doc => {
      console.log(`Doc ID: ${doc.id}`, JSON.stringify(doc.data()));
    });
  } catch (e) {
    console.error("Error reading ho_so_ket_nap:", e.message);
  }

  console.log("\n=== CHECKING ho_so_chinh_thuc ===");
  try {
    const snap = await getDocs(collection(db, "ho_so_chinh_thuc"));
    console.log(`Total documents: ${snap.docs.length}`);
    snap.docs.forEach(doc => {
      console.log(`Doc ID: ${doc.id}`, JSON.stringify(doc.data()));
    });
  } catch (e) {
    console.error("Error reading ho_so_chinh_thuc:", e.message);
  }

  console.log("\n=== CHECKING dang_vien ===");
  try {
    const snap = await getDocs(collection(db, "dang_vien"));
    console.log(`Total documents: ${snap.docs.length}`);
    snap.docs.slice(0, 5).forEach(doc => {
      console.log(`Doc ID: ${doc.id}`, JSON.stringify(doc.data()));
    });
  } catch (e) {
    console.error("Error reading dang_vien:", e.message);
  }
}

check();
