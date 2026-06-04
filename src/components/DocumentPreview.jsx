import React from 'react';

const DocumentPreview = ({ data, docType }) => {
  if (!data) return <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Không có dữ liệu xem trước</div>;

  const {
    ho_ten = '',
    ngay_sinh = '',
    que_quan = '',
    dia_chi = '',
    ngay_vao_dang = '',
    ngay_chinh_thuc = '',
    loai_chuyen_sh = 'chuyen_ra',
    ly_do_chuyen = '',
    uu_diem = '',
    khuyet_diem = '',
    noi_chuyen_den = '',
    ngay_ky = '',
    tinh_tp = 'Đà Nẵng',
    gioi_tinh = '',
    nam_sinh = '',
    so_the_dang = '',
    so_dien_thoai = '',
    nhiem_vu_dang = '',
    khoa = '',
    lop = '',
    dvhd = '',
    ngay_phan_cong = ''
  } = data;

  const formatDate = (dateString) => {
    if (!dateString) return '.../.../...';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const getD = (dateString) => dateString ? dateString.split('-')[2] : '...';
  const getM = (dateString) => dateString ? dateString.split('-')[1] : '...';
  const getY = (dateString) => dateString ? dateString.split('-')[0] : '......';

  const renderContent = () => {
    switch (docType) {
      case 'mau1':
      case 'mau2':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ĐẢNG BỘ BỘ PHẬN<br/>
                TRƯỜNG ĐẠI HỌC KINH TẾ<br/>
                CHI BỘ SINH VIÊN<br/>
                *
              </div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ĐẢNG CỘNG SẢN VIỆT NAM
              </div>
            </div>
            <div style={{ textAlign: 'right', fontStyle: 'italic', marginBottom: 30, marginRight: 20 }}>
              {tinh_tp}, ngày {getD(ngay_ky)} tháng {getM(ngay_ky)} năm {getY(ngay_ky)}
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 20 }}>
              ĐƠN XIN CHUYỂN SINH HOẠT ĐẢNG {docType === 'mau2' ? 'TẠM THỜI' : ''}
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <strong>Kính gửi:</strong> - Chi ủy Chi bộ Sinh viên,<br/>
              <span style={{ marginLeft: 80 }}>- Đảng ủy bộ phận Trường Đại học Kinh tế, </span><br/>
              <span style={{ marginLeft: 80 }}>Đảng ủy Đại học Đà Nẵng, </span><br/>
              <span style={{ marginLeft: 80 }}>Đảng ủy Ủy ban nhân dân thành phố.</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Họ và tên: <strong>{ho_ten}</strong> <span style={{ marginLeft: 50 }}>Giới tính: {gioi_tinh || 'Nam'}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Ngày tháng năm sinh: {formatDate(ngay_sinh)}
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Quê quán: {que_quan}
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Nơi ở hiện nay: {dia_chi}
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Ngày vào Đảng: {formatDate(ngay_vao_dang)} <span style={{ marginLeft: 50 }}>Ngày chính thức: {ngay_chinh_thuc ? formatDate(ngay_chinh_thuc) : '....................'}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Số thẻ Đảng: {so_the_dang} <span style={{ marginLeft: 50 }}>Số điện thoại liên hệ: {so_dien_thoai}</span>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              Nhiệm vụ được giao: {nhiem_vu_dang || 'Đảng viên'}
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <strong>Lý do xin chuyển sinh hoạt Đảng {docType === 'mau2' ? 'tạm thời' : ''}:</strong><br/>
              <span style={{ marginLeft: 30 }}>{ly_do_chuyen}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <span style={{ marginLeft: 30 }}>Để thực hiện theo đúng Điều lệ Đảng, kính đề nghị các cấp ủy Đảng cho tôi được chuyển sinh hoạt Đảng về {noi_chuyen_den}</span>
            </div>
            <div style={{ marginBottom: 30, lineHeight: 1.6 }}>
              <span style={{ marginLeft: 30 }}>Tôi hứa sẽ phát huy tốt vai trò của người đảng viên trong lĩnh vực công tác mới và hoàn thành tốt mọi nhiệm vụ được giao.</span><br/>
              <span style={{ marginLeft: 30 }}>Trân trọng.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ fontWeight: 'bold' }}>Người làm đơn</div>
                <div style={{ marginTop: 60, fontWeight: 'bold' }}>{ho_ten}</div>
              </div>
            </div>
          </>
        );
      
      case 'mau4':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ĐẢNG BỘ BỘ PHẬN<br/>
                TRƯỜNG ĐẠI HỌC KINH TẾ<br/>
                CHI BỘ SINH VIÊN<br/>
                *
              </div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ĐẢNG CỘNG SẢN VIỆT NAM
              </div>
            </div>
            <div style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 20 }}>
              {tinh_tp}, ngày {getD(ngay_ky)} tháng {getM(ngay_ky)} năm {getY(ngay_ky)}
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 20 }}>
              BẢN TỰ KIỂM ĐIỂM ĐẢNG VIÊN<br/>
              <span style={{ fontSize: 15, fontWeight: 'normal' }}>Về việc chuyển sinh hoạt Đảng</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Họ và tên: {ho_ten} <span style={{ marginLeft: 50 }}>Năm sinh: {nam_sinh || (ngay_sinh ? ngay_sinh.split('-')[0] : '........')}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Ngày vào Đảng: {formatDate(ngay_vao_dang)} <span style={{ marginLeft: 50 }}>Ngày chính thức: {ngay_chinh_thuc ? formatDate(ngay_chinh_thuc) : '....................'}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Chi bộ đang sinh hoạt: Sinh viên
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Nhiệm vụ được giao:<br/>
              + Đảng: {nhiem_vu_dang || 'Đảng viên'}<br/>
              + Chính quyền: Không<br/>
              + Đoàn thể: Không
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Căn cứ nhiệm vụ được giao tôi xin tự kiểm điểm như sau:
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <strong>I. Về tư tưởng chính trị:</strong><br/>
              <span style={{ marginLeft: 30 }}>Tôi luôn trung thành với Chủ nghĩa Mác – Lênin, tư tưởng Hồ Chí Minh và đường lối đổi mới của Đảng, kiên định mục tiêu độc lập dân tộc và chủ nghĩa xã hội, thể hiện qua lời nói và việc làm; Việc chấp hành, viết, nói và làm theo nghị quyết, quan điểm, đường lối, chính sách của đảng, pháp luật của Nhà nước. Việc đấu tranh chống suy thoái về tư tưởng chính trị, phai nhạt lý tưởng, bảo vệ lẽ phải, bảo vệ người tốt. Tuyên truyền vận động gia đình và nhân dân thực hiện đường lối, chính sách của đảng, pháp luật của Nhà nước. Tinh thần học tập để nâng cao trình độ lý luận chính trị, chuyên môn nghiệp vụ và năng lực công tác...</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <strong>II. Về phẩm chất đạo đức lối sống:</strong><br/>
              <span style={{ marginLeft: 30 }}>Tôi luôn học tập theo tấm gương đạo đức Hồ Chí Minh và tinh thần hợp tác, giúp đỡ đồng chí, đồng nghiệp; Việc đấu tranh chống tệ quan liêu, tham nhũng, lãng phí, chủ nghĩa cá nhân, lối sống thực dụng, nói không đi đôi với làm, lợi dụng chức vụ, quyền hạn để vun vén lợi ích cho bản thân và gia đình; Giữ gìn tư cách, phẩm chất đạo đức cách mạng và phát huy tính tiên phong, gương mẫu của người đảng viên, việc chấp hành Quy định của BCHTW về những điều đảng viên không được làm; Trung thực, thẳng thắn, giữ gìn sự đoàn kết, thống nhất của Đảng</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <strong>III. Về thực hiện chức trách, nhiệm vụ được giao:</strong><br/>
              <span style={{ marginLeft: 30 }}>Tôi luôn có ý thức trách nhiệm, tinh thần sáng tạo trong học tập, công tác và kết quả thực hiện chức trách, nhiệm vụ được giao; Thường xuyên giữ mối liên hệ với chi ủy, đảng ủy cơ sở và gương mẫu thực hiện nghĩa vụ công dân nơi cư trú; Tham gia xây dựng tổ chức đảng, chính quyền, các tổ chức đoàn thể ở cơ quan, đơn vị nơi công tác.</span>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <strong>IV. Về ý thức tổ chức kỷ luật:</strong><br/>
              <span style={{ marginLeft: 30 }}>Tôi luôn thực hiện tốt nguyên tắc tập trung dân chủ trong tổ chức và hoạt động của Đảng, ý thức tổ chức kỷ luật, chấp hành sự phân công, điều động, luân chuyển của tổ chức. Chấp hành nghị quyết, chỉ thị, quyết định của tổ chức đảng; Chấp hành chính sách, pháp luật của Nhà nước và các nội quy, quy chế, quy định của cơ quan, đơn vị; Thái độ cầu thị trong việc nhận và sửa chữa, khắc phục khuyết điểm...</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ fontStyle: 'italic', marginBottom: 5 }}>
                  {tinh_tp}, ngày {getD(ngay_ky)} tháng {getM(ngay_ky)} năm {getY(ngay_ky)}
                </div>
                <div style={{ fontWeight: 'bold' }}>Người làm bản kiểm điểm</div>
                <div style={{ marginTop: 60, fontWeight: 'bold' }}>{ho_ten}</div>
              </div>
            </div>
          </>
        );

      case 'mau3':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ĐOÀN TNCS HỒ CHÍ MINH<br/>
                ĐẠI HỌC ĐÀ NẴNG<br/>
                BCH ĐOÀN TRƯỜNG ĐH KINH TẾ
              </div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ĐOÀN TNCS HỒ CHÍ MINH<br/>
                <span style={{ fontWeight: 'normal' }}>Số         - NQ/ĐTN-ĐHKT</span><br/>
                <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>Đà Nẵng, ngày {getD(ngay_ky)} tháng {getM(ngay_ky)} năm {getY(ngay_ky)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 20, marginTop: 40 }}>
              BẢN NHẬN XÉT<br/>
              <span style={{ fontSize: 15, fontWeight: 'normal' }}>Đảng viên dự bị</span>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <strong>Kính gửi:</strong><span style={{ marginLeft: 20 }}>- Chi bộ Sinh viên</span><br/>
              <span style={{ marginLeft: 90 }}>- Đảng uỷ Trường Đại học Kinh tế</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <span style={{ marginLeft: 30 }}>Ban Thường vụ Đoàn TNCS Hồ Chí Minh Trường Đại học Kinh tế - Đại học Đà Nẵng nhận thấy:</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Đảng viên dự bị: <strong>{ho_ten}</strong> <span style={{ marginLeft: 50 }}>Sinh ngày: {formatDate(ngay_sinh)}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Chi Đoàn: {lop} <span style={{ marginLeft: 50 }}>Liên chi Đoàn Khoa: {khoa}</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Được kết nạp vào Đảng ngày {formatDate(ngay_vao_dang)}.
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <span style={{ marginLeft: 30 }}>Ban Thường vụ Đoàn TNCS Hồ Chí Minh Trường ĐH Kinh tế xin báo cáo Đảng ủy Trường Đại học Kinh tế và Chi bộ Sinh viên những ưu điểm và khuyết điểm của đảng viên dự bị trong quá trình phấn đấu và rèn luyện như sau:</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <strong>Ưu điểm:</strong><br/>
              <div style={{ whiteSpace: 'pre-wrap' }}>{uu_diem}</div>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <strong>Khuyết điểm và những vấn đề cần lưu ý:</strong><br/>
              <div style={{ whiteSpace: 'pre-wrap' }}>{khuyet_diem}</div>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              Chúng tôi xin hoàn toàn chịu trách nhiệm về những nội dung nói trên.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ fontWeight: 'bold' }}>T/M BAN THƯỜNG VỤ</div>
              </div>
            </div>
          </>
        );

      case 'mau5':
        return (
          <>
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 20 }}>
              ĐẢNG CỘNG SẢN VIỆT NAM
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 20, marginTop: 40 }}>
              BẢN NHẬN XÉT<br/>
              <span style={{ fontSize: 15, fontWeight: 'normal' }}>Đảng viên dự bị</span>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <strong>Kính gửi:</strong><span style={{ marginLeft: 20 }}>- Đảng ủy Trường Đại học Kinh tế</span><br/>
              <span style={{ marginLeft: 90 }}>- Chi bô ̣ Sinh viên</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Tôi là: <strong>{dvhd}</strong> <span style={{ marginLeft: 50 }}>Sinh ngày ...... tháng ...... năm .........</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              Ngày vào Đảng: .................... <span style={{ marginLeft: 50 }}>Chính thức: ....................</span>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              Hiện đang sinh hoạt tại Chi bộ Sinh viên
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <span style={{ marginLeft: 30 }}>Ngày {getD(ngay_phan_cong)} tháng {getM(ngay_phan_cong)} năm {getY(ngay_phan_cong)} được Chi bộ phân công giúp đỡ đảng viên dự bị: {ho_ten} được kết nạp vào Đảng ngày {getD(ngay_vao_dang)} tháng {getM(ngay_vao_dang)} năm {getY(ngay_vao_dang)}, nay xin báo cáo Đảng ủy và Chi bộ những vấn đề chủ yếu của đảng viên dự bị như sau:</span>
            </div>
            <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
              <strong>Ưu điểm:</strong><br/>
              <div style={{ whiteSpace: 'pre-wrap' }}>{uu_diem}</div>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              <strong>Khuyết điểm và những vấn đề cần lưu ý:</strong><br/>
              <div style={{ whiteSpace: 'pre-wrap' }}>{khuyet_diem}</div>
            </div>
            <div style={{ marginBottom: 20, lineHeight: 1.6 }}>
              Tôi xin chịu trách nhiệm trước Đảng về lời nhận xét của mình.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <div style={{ textAlign: 'center', width: '250px' }}>
                <div style={{ fontStyle: 'italic', marginBottom: 5 }}>
                  {tinh_tp}, ngày {getD(ngay_ky)} tháng {getM(ngay_ky)} năm {getY(ngay_ky)}
                </div>
                <div style={{ fontWeight: 'bold' }}>Đảng viên được phân công giúp đỡ</div>
                <div style={{ marginTop: 60, fontWeight: 'bold' }}>{dvhd}</div>
              </div>
            </div>
          </>
        );

      default:
        return (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Bản xem trước chưa hỗ trợ cho biểu mẫu này. Vui lòng xuất file để xem chi tiết.
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '100%', 
      maxWidth: '210mm', 
      minHeight: '297mm', 
      backgroundColor: 'white',
      padding: '20mm 15mm',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '13pt',
      color: 'black',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {renderContent()}
    </div>
  );
};

export default DocumentPreview;
