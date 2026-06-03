import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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
  const ids = ["7RqDthMaOKvpX22qoyL7", "j10OcIFubQS77ZHBnfIx", "97tqjyPLqNjW0nHIGbOG"];
  console.log("=== CHECKING DANG_VIEN BY ID ===");
  for (const id of ids) {
    const docRef = doc(db, "dang_vien", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`Found ${id}:`, docSnap.data().ho_ten, docSnap.data().mssv);
    } else {
      console.log(`NOT Found ${id}`);
    }
  }

  console.log("=== ALL MEMBERS IN DANG_VIEN ===");
  const dvSnap = await getDocs(collection(db, "dang_vien"));
  console.log("Total members in dang_vien:", dvSnap.size);
  dvSnap.forEach(d => {
    console.log(d.id, d.data().ho_ten, d.data().mssv);
  });
  
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
