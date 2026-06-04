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

function cleanMember(member) {
  if (!member) return null;
  const clean = { ...member };
  delete clean.anh_ca_nhan;
  delete clean.anh_3x4;
  delete clean.chu_ky;
  delete clean.chu_ky_nguoi_huong_dan;
  return clean;
}

async function main() {
  console.log("Fetching dang_vien collection...");
  const dvSnapshot = await getDocs(collection(db, "dang_vien"));
  const members = dvSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const dien = members.find(m => m.ho_ten && m.ho_ten.includes("Lê Vĩnh Diện"));
  console.log("=== Member 'Lê Vĩnh Diện' ===");
  console.log(JSON.stringify(cleanMember(dien), null, 2));

  console.log("\nFetching chuyen_sinh_hoat collection...");
  const csSnapshot = await getDocs(collection(db, "chuyen_sinh_hoat"));
  const transfers = csSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const transfer = transfers.find(t => t.dang_vien_id === dien?.id || t.ho_ten?.includes("Lê Vĩnh Diện"));
  console.log("=== Transfer for 'Lê Vĩnh Diện' ===");
  console.log(JSON.stringify(transfer, null, 2));
}

main().catch(console.error);
