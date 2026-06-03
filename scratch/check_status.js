import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD60X31IZhCrbQUv14E6ekwGbnGWQXICF4",
  authDomain: "qlysinhvien-956a8.firebaseapp.com",
  projectId: "qlysinhvien-956a8",
  storageBucket: "qlysinhvien-956a8.appspot.com",
  messagingSenderId: "360052955519",
  appId: "1:360052955519:web:5dcd5a8989b5311e3b52d2",
  measurementId: "G-D20F2XXQ7B"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTransfers() {
  const csSnapshot = await getDocs(collection(db, "chuyen_sinh_hoat"));
  console.log("Total chuyen_sinh_hoat records:", csSnapshot.docs.length);
  csSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | dang_vien_id: ${data.dang_vien_id} | status: ${data.status} | buoc: ${data.buoc}`);
  });
}
checkTransfers();
