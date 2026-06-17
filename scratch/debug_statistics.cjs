const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const dayjs = require("dayjs");

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

const safeDayjs = (val) => {
  if (!val) return dayjs(null);
  if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
  if (val.seconds) return dayjs(val.seconds * 1000);
  return dayjs(val);
};

const checkIsDuBi = (member) => {
  if (!member) return true;
  const getOfficialDate = () => {
    const date = member.ngay_cong_nhan_dvct || member.ngay_chinh_thuc;
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') return dayjs(date.toDate());
    if (date.seconds) return dayjs(date.seconds * 1000);
    return dayjs(date);
  };
  const officialDate = getOfficialDate();
  if (officialDate && officialDate.isValid()) {
    return officialDate.isAfter(dayjs(), 'day');
  }
  return member.dang_vien_du_bi !== false && member.loai_dang_vien !== "Chính thức";
};

const getOfficialDateVal = (item) => {
  let d = safeDayjs(item.ngay_cong_nhan_dvct);
  if (d && d.isValid()) return d;
  d = safeDayjs(item.ngay_chinh_thuc);
  if (d && d.isValid()) return d;
  if (item.ngay_vao_dang) {
    d = safeDayjs(item.ngay_vao_dang);
    if (d && d.isValid()) return d.add(1, 'year');
  }
  return safeDayjs(item.created_at);
};

async function debug() {
  try {
    const snapshot = await getDocs(collection(db, "dang_vien"));
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Total members: ${members.length}`);

    // List of official members as per HoSoDaChinhThuc
    const hoSoOfficial = members.filter(member => {
      if (!member.ho_ten) return false;
      if (member.trang_thai && member.trang_thai !== 'dang_sinh_hoat') return false;
      return !checkIsDuBi(member) && (member.ho_so_status !== undefined && member.ho_so_status !== null && member.ho_so_status !== "");
    });

    console.log(`\n=== HoSoDaChinhThuc List: ${hoSoOfficial.length} members ===`);
    hoSoOfficial.forEach((m, idx) => {
      console.log(`${idx + 1}. [${m.mssv}] ${m.ho_ten}`);
      console.log(`   - trang_thai: ${m.trang_thai}`);
      console.log(`   - loai_dang_vien: ${m.loai_dang_vien}`);
      console.log(`   - dang_vien_du_bi: ${m.dang_vien_du_bi}`);
      console.log(`   - ho_so_status: ${m.ho_so_status}`);
      console.log(`   - ngay_vao_dang: ${m.ngay_vao_dang}`);
      console.log(`   - ngay_chinh_thuc: ${m.ngay_chinh_thuc}`);
      console.log(`   - ngay_cong_nhan_dvct: ${m.ngay_cong_nhan_dvct}`);
    });

    // ThongKeHoSoChinhThuc's data
    const statsData = members.filter(item => item.ho_ten && (!item.trang_thai || item.trang_thai === 'dang_sinh_hoat') && item.ho_so_status !== undefined && item.ho_so_status !== null && item.ho_so_status !== "");
    
    console.log(`\n=== ThongKeHoSoChinhThuc Data (unfiltered by year/fac/cohort): ${statsData.length} members ===`);
    const filterYear = "2026";
    const filteredStatsData = statsData.filter(item => {
      const isOfficial = !checkIsDuBi(item);
      let dateStr = null;
      if (isOfficial) {
        dateStr = item.ngay_chinh_thuc || item.ngay_cong_nhan_dvct;
        if (!dateStr && item.ngay_vao_dang) {
          const d = safeDayjs(item.ngay_vao_dang);
          if (d && d.isValid()) {
            dateStr = d.add(1, 'year').toISOString();
          }
        }
      } else {
        if (item.ngay_vao_dang) {
          const d = safeDayjs(item.ngay_vao_dang);
          if (d && d.isValid()) {
            dateStr = d.add(1, 'year').toISOString();
          }
        }
      }
      dateStr = dateStr || item.created_at;

      let isMatch = false;
      if (dateStr) {
        const d = safeDayjs(dateStr);
        if (d && d.isValid()) {
          const itemYear = d.format('YYYY');
          isMatch = (itemYear === filterYear);
          console.log(`   [Filter Check] ${item.ho_ten}: dateStr=${dateStr}, parsedYear=${itemYear}, isMatch=${isMatch}`);
        } else {
          console.log(`   [Filter Check] ${item.ho_ten}: dateStr=${dateStr} is INVALID dayjs`);
        }
      } else {
        console.log(`   [Filter Check] ${item.ho_ten}: dateStr is NULL`);
      }
      return isMatch;
    });

    console.log(`\n=== ThongKeHoSoChinhThuc Data (filtered for year ${filterYear}): ${filteredStatsData.length} members ===`);
    
    const admittedCount = filteredStatsData.filter(item => !checkIsDuBi(item)).length;
    console.log(`\nOfficial (admitted) count in stats for year ${filterYear}: ${admittedCount}`);

  } catch (error) {
    console.error("Error debugging:", error);
  }
}

debug();
