import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function readConfig() {
  try {
    console.log("Fetching system_config...");
    const snap = await getDocs(collection(db, "system_config"));
    snap.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
    console.log("Done.");
  } catch (e) {
    console.error("Error fetching system_config:", e);
  }
}

readConfig();
