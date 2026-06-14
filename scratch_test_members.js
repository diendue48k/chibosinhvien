import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import dayjs from "dayjs";

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
  console.log("=== INSPECTING DETAILED INFO OF OFFICIAL MEMBERS WITH HO_SO_STATUS ===");
  const dvSnap = await getDocs(collection(db, "dang_vien"));
  const members = [];
  dvSnap.forEach(d => {
    const data = d.data();
    if (!data.ho_ten) return;

    const getOfficialDate = () => {
      const date = data.ngay_cong_nhan_dvct || data.ngay_chinh_thuc;
      if (!date) return null;
      if (date.toDate && typeof date.toDate === 'function') return dayjs(date.toDate());
      if (date.seconds) return dayjs(date.seconds * 1000);
      return dayjs(date);
    };
    const officialDate = getOfficialDate();
    let isDuBi = true;
    if (officialDate && officialDate.isValid()) {
      isDuBi = officialDate.isAfter(dayjs(), 'day');
    } else {
      isDuBi = data.dang_vien_du_bi !== false && data.loai_dang_vien !== "Chính thức";
    }

    const hasStatus = data.ho_so_status !== undefined && data.ho_so_status !== null && data.ho_so_status !== "";

    if (!isDuBi && hasStatus) {
      members.push({
        id: d.id,
        ho_ten: data.ho_ten,
        mssv: data.mssv,
        trang_thai: data.trang_thai,
        ho_so_status: data.ho_so_status,
        ngay_cong_nhan_dvct: data.ngay_cong_nhan_dvct,
        ngay_chinh_thuc: data.ngay_chinh_thuc,
        ngay_vao_dang: data.ngay_vao_dang,
        created_at: data.created_at
      });
    }
  });

  console.log("Official members count:", members.length);
  console.log(JSON.stringify(members, null, 2));
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
