const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

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
  console.log("=== FETCHING USER DATA ===");
  try {
    const q = query(collection(db, "dang_vien"), where("mssv", "==", "221124022304"));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("No user found!");
    } else {
      console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

check();
