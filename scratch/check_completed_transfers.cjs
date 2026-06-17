const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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

async function checkCompleted() {
  try {
    const dvSnap = await getDocs(collection(db, "dang_vien"));
    const members = dvSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const csSnap = await getDocs(collection(db, "chuyen_sinh_hoat"));
    const transfers = csSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log("=== COMPLETED TRANSFERS NOT MARKED AS DA_CHUYEN ===");
    let count = 0;
    transfers.forEach(t => {
      if (t.status === 'completed') {
        const match = members.find(m => m.id === t.dang_vien_id || (m.mssv && m.mssv === t.mssv));
        if (match && match.trang_thai !== 'da_chuyen') {
          console.log(`Name: ${match.ho_ten} (${match.mssv})`);
          console.log(`  - Member trang_thai: ${match.trang_thai}`);
          console.log(`  - Transfer status: ${t.status}`);
          console.log(`  - Transfer buoc: ${t.buoc}`);
          console.log(`  - Transfer completed_at: ${t.completed_at}`);
          count++;
        }
      }
    });
    console.log(`Total found: ${count}`);
  } catch (e) {
    console.error(e);
  }
}

checkCompleted();
