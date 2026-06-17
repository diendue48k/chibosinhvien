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

async function findInconsistencies() {
  try {
    console.log("Fetching dang_vien collection...");
    const dvSnap = await getDocs(collection(db, "dang_vien"));
    const members = dvSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log("Fetching chuyen_sinh_hoat collection...");
    const csSnap = await getDocs(collection(db, "chuyen_sinh_hoat"));
    const transfers = csSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`\n=== Members in dang_vien who have a record in chuyen_sinh_hoat ===`);
    let count = 0;
    transfers.forEach(t => {
      const match = members.find(m => m.id === t.dang_vien_id || (m.mssv && m.mssv === t.mssv));
      if (match) {
        console.log(`Transfer ID: ${t.id}`);
        console.log(`- Member Name: ${match.ho_ten} (${match.mssv || 'no mssv'})`);
        console.log(`- Member trang_thai: ${match.trang_thai}`);
        console.log(`- Transfer ngay_chuyen: ${t.ngay_chuyen}, noi_chuyen: ${t.noi_chuyen}, trang_thai_du_tieu_chuan: ${t.trang_thai_du_tieu_chuan}`);
        if (match.trang_thai !== 'da_chuyen') {
          console.log(`  [INCONSISTENT] This member has a transfer record but their status in dang_vien is NOT 'da_chuyen'!`);
          count++;
        }
      } else {
        console.log(`Transfer ID: ${t.id} has no matching member (MSSV/ID: ${t.mssv || t.dang_vien_id}, Name: ${t.ho_ten})`);
      }
    });

    console.log(`\nFound ${count} inconsistent members.`);

  } catch (error) {
    console.error("Error running script:", error);
  }
}

findInconsistencies();
