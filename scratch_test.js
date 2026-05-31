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

const querySnapshot = await getDocs(collection(db, "notifications"));
const docs = [];
querySnapshot.forEach((doc) => {
  docs.push({ id: doc.id, ...doc.data() });
});

// Sort by created_at descending
docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

docs.forEach((data) => {
  console.log(`${data.id} => title: "${data.title}", send_email: ${data.send_email}, sent_count: ${data.email_sent_count}, fail_count: ${data.email_fail_count}, created_at: ${data.created_at}`);
});
process.exit(0);
