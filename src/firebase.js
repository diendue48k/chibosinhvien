import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD60X31IZhCrbQUv14E6ekwGbnGWQXICF4",
  authDomain: "qlysinhvien-956a8.firebaseapp.com",
  projectId: "qlysinhvien-956a8",
  storageBucket: "qlysinhvien-956a8.firebasestorage.app",
  messagingSenderId: "717940346844",
  appId: "1:717940346844:web:14b66342a6ff3c4ff04919",
  measurementId: "G-BRZDGT79WE"
};

// Student Firebase config (read-only for querying collection "students")
const studentFirebaseConfig = {
  apiKey: "AIzaSyAd5KmUimy3xf57U1XVVxMRXXOWjWJTIw8",
  authDomain: "qlycbsv.firebaseapp.com",
  projectId: "qlycbsv",
  storageBucket: "qlycbsv.firebasestorage.app",
  messagingSenderId: "764104313540",
  appId: "1:764104313540:web:7b915eaaf644d70e15d791"
};

// Main Firebase (for writing and primary data)
const mainApp = getApps().find(a => a.name === "mainApp") || initializeApp(firebaseConfig, "mainApp");
export const dbMain = getFirestore(mainApp);
export const storage = getStorage(mainApp);

// Student Firebase (read-only for querying collection "students")
const studentApp = getApps().find(a => a.name === "studentApp") || initializeApp(studentFirebaseConfig, "studentApp");
export const dbStudent = getFirestore(studentApp, "ai-studio-05dc38d4-92c9-4b75-8501-58181a22480d");

// Default export for backward compatibility
export const db = dbMain;
