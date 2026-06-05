import re

with open('src/pages/DocumentGenerator.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix isOfficial
content = content.replace(
    'const isOfficial = m.loai_dang_vien === "Chính thức";',
    'const isOfficial = m.ho_ten && !(m.loai_dang_vien === "Dự bị" || m.dang_vien_du_bi === true);'
)

# 2. Fix initialValues for chu_tri_lop, thu_ky_lop, gvcn, chu_tri_chi_doan, thu_ky_chi_doan
content = content.replace("gvcn: '',", "gvcn: '',")
content = content.replace("chu_tri_lop: 'Lớp trưởng',", "chu_tri_lop: '',")
content = content.replace("thu_ky_lop: 'Bí thư Chi đoàn',", "thu_ky_lop: '',")
content = content.replace("chu_tri_chi_doan: 'Bí thư Chi đoàn',", "chu_tri_chi_doan: '',")
content = content.replace("thu_ky_chi_doan: 'Phó Bí thư Chi đoàn',", "thu_ky_chi_doan: '',")

# 3. Add thu_ky_chi_doan: allValues.thu_ky_lop
content = content.replace(
    '''      return {
        ...allValues,
        uu_diem:''',
    '''      return {
        ...allValues,
        thu_ky_chi_doan: allValues.thu_ky_lop,
        uu_diem:'''
)

# 4. Form inputs rendering
old_form_code = '''                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item name="chu_tri_lop" label={<span className="premium-form-label">Chủ trì Lớp</span>}>
                            <Input placeholder="Lớp trưởng" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="thu_ky_lop" label={<span className="premium-form-label">Thư ký Lớp</span>}>
                            <Input placeholder="Bí thư Chi đoàn" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tong_so_sv_lop" label={<span className="premium-form-label">TS SV Lớp</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tham_gia_lop" label={<span className="premium-form-label">Có mặt (Lớp)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="vang_lop" label={<span className="premium-form-label">Vắng (Lớp)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item name="chu_tri_chi_doan" label={<span className="premium-form-label">Chủ trì Chi đoàn</span>}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="thu_ky_chi_doan" label={<span className="premium-form-label">Thư ký Chi đoàn</span>}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tong_so_dv_chi_doan" label={<span className="premium-form-label">TS ĐV CĐ</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tham_gia_chi_doan" label={<span className="premium-form-label">Có mặt (CĐ)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="vang_chi_doan" label={<span className="premium-form-label">Vắng (CĐ)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item name="tan_thanh_doan_truong" label={<span className="premium-form-label">Đoàn Trường: Tán thành</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="khong_tan_thanh_doan_truong" label={<span className="premium-form-label">Đoàn Trường: K.Tán thành</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="ly_do_vang_chi_doan" label={<span className="premium-form-label">Lý do vắng (nếu có)</span>}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="dia_diem_hop_lcd" label={<span className="premium-form-label">Địa điểm họp LCĐ</span>}>
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>'''

new_form_code = '''                      <Row gutter={16}>
                        <Col span={24}>
                          <Form.Item name="gvcn" label={<span className="premium-form-label">Giáo viên chủ nhiệm</span>}>
                            <Input placeholder="Nhập tên Giáo viên chủ nhiệm..." />
                          </Form.Item>
                        </Col>
                      </Row>
                      
                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item name="chu_tri_lop" label={<span className="premium-form-label">Chủ trì Lớp</span>}>
                            <Input placeholder="Lớp trưởng" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="thu_ky_lop" label={<span className="premium-form-label">Thư ký Lớp</span>}>
                            <Input placeholder="Bí thư Chi đoàn" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tong_so_sv_lop" label={<span className="premium-form-label">TS SV Lớp</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tham_gia_lop" label={<span className="premium-form-label">Có mặt (Lớp)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="vang_lop" label={<span className="premium-form-label">Vắng (Lớp)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item name="chu_tri_chi_doan" label={<span className="premium-form-label">Chủ trì Chi đoàn</span>}>
                            <Input placeholder="Bí thư Chi đoàn" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="thu_ky_chi_doan" label={<span className="premium-form-label">Thư ký Chi đoàn</span>}>
                            <Input placeholder="Phó Bí thư Chi đoàn" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tong_so_dv_chi_doan" label={<span className="premium-form-label">TS ĐV CĐ</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="tham_gia_chi_doan" label={<span className="premium-form-label">Có mặt (CĐ)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="vang_chi_doan" label={<span className="premium-form-label">Vắng (CĐ)</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={6}>
                          <Form.Item name="tan_thanh_doan_truong" label={<span className="premium-form-label">Đoàn Trường: Tán thành</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="khong_tan_thanh_doan_truong" label={<span className="premium-form-label">Đoàn Trường: K.Tán thành</span>}>
                            <InputNumber style={{width:'100%'}} />
                          </Form.Item>
                        </Col>
                      </Row>'''

# Because the user said "Thư ký Chi Đoàn và lớp là chung 1 người", we will modify 
ew_form_code to just have one "Thư ký (Lớp & Chi đoàn)".
# Wait, actually let me do what they requested. They showed a screenshot where there's "Thư ký Lớp" and "Thư ký Chi đoàn" separate, BUT they said "Thư ký Chi Đoàn và lớp là chung 1 người".
# I'll just change the label of thu_ky_lop to "Thư ký Lớp", and the label of thu_ky_chi_doan to "Thư ký Chi đoàn". Wait, they said "Thư ký Chi Đoàn và lớp là chung 1 người. Các giá trị đó để hintext thôi chứ còn để tôi nhập vào mà".
# This means they DO want to type the name, and since it's the SAME person, they only want ONE input? Or they're okay with two inputs as long as the placeholder shows it?
# In their screenshot, 	hu_ky_chi_doan input is SELECTED (red border). The placeholder is "Phó Bí thư Chi đoàn".
# That means they ALREADY saw the two inputs in my NEW design (which I haven't applied yet? No, they took a screenshot of the CURRENT system, which has "Thư ký Lớp" and "Thư ký Chi đoàn").
# They want to keep the UI as they showed in the screenshot (or similar) where the labels are clear. But wait, in the screenshot they wrote: "Thư ký Lớp" with Input containing "Bí thư Chi đoàn". "Thư ký Chi đoàn" with Input containing "Phó Bí thư Chi đoàn".
# I'll just change 	hu_ky_chi_doan to use the same logic, and remove ly_do_vang and dia_diem.
# I'll use the 
ew_form_code as written above.

if old_form_code in content:
    content = content.replace(old_form_code, new_form_code)
    print("Replaced form layout!")
else:
    print("WARNING: Could not find old_form_code!")

with open('src/pages/DocumentGenerator.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")
