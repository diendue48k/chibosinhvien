import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD60X31IZhCrbQUv14E6ekwGbnGWQXICF4",
  authDomain: "qlysinhvien-956a8.firebaseapp.com",
  projectId: "qlysinhvien-956a8",
  storageBucket: "qlysinhvien-956a8.firebasestorage.app",
  messagingSenderId: "717940346844",
  appId: "1:717940346844:web:14b66342a6ff3c4ff04919",
  measurementId: "G-BRZDGT79WE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  console.log("=== INSPECTING DANG_VIEN ===");
  const dvSnap = await getDocs(query(collection(db, "dang_vien"), limit(1)));
  dvSnap.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));

  console.log("=== INSPECTING HO_SO_KET_NAP ===");
  const knSnap = await getDocs(query(collection(db, "ho_so_ket_nap"), limit(1)));
  knSnap.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));

  console.log("=== INSPECTING HO_SO_CHINH_THUC ===");
  const ctSnap = await getDocs(query(collection(db, "ho_so_chinh_thuc"), limit(1)));
  ctSnap.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
