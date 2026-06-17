import os

def reorder_profile():
    filepath = 'src/pages/Profile.jsx'
    if not os.path.exists(filepath):
        print("File not found:", filepath)
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content_lf = content.replace('\r\n', '\n')

    # Target Address card block
    target = """            {/* SECTION 5 */}
            <Card title={<><HomeOutlined style={{ marginRight: 8 }} /> Địa chỉ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Row gutter={16}>
                <Field name="dia_chi_tam_tru" label="Địa chỉ tạm trú" span={24} editable><Input size="large" /></Field>
              </Row>
              <Row gutter={16}>
                <Field name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú" span={24} editable><Input size="large" /></Field>
              </Row>
              <Row gutter={16}>
                <Field name="tinh_tp_tt" label="Tỉnh/TP Thường Trú" span={12} editable>
                  <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} />
                </Field>
                <Field name="xa_phuong_tt" label="Xã/Phường Thường trú" span={12} editable>
                  <AddressWardSelect province={watchTinhTpTt} />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="tinh_tp_qq" label="Tỉnh/TP (Quê quán)" span={12} editable>
                  <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} />
                </Field>
                <Field name="xa_phuong_qq" label="Xã/Phường (Quê quán)" span={12} editable>
                  <AddressWardSelect province={watchTinhTpQq} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
              <Row gutter={16}>
                <Field name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ" span={8} editable>
                   <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} />
                </Field>
                <Field name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ" span={8} editable>
                   <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                </Field>
                <Field name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ" span={8} editable>
                   <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
              <Row gutter={16}>
                <Field name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ" span={24} editable>
                  <Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ" span={8} editable>
                   <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />
                </Field>
                <Field name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ" span={8} editable>
                   <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                </Field>
                <Field name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ" span={8} editable>
                   <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                </Field>
              </Row>
            </Card>"""

    replacement = """            {/* SECTION 5 */}
            <Card title={<><HomeOutlined style={{ marginRight: 8 }} /> Địa chỉ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
              <Row gutter={16}>
                <Field name="tinh_tp_qq" label="Tỉnh/TP (Quê quán)" span={12} editable>
                  <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} />
                </Field>
                <Field name="xa_phuong_qq" label="Xã/Phường (Quê quán)" span={12} editable>
                  <AddressWardSelect province={watchTinhTpQq} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
              <Row gutter={16}>
                <Field name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ" span={8} editable>
                   <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} />
                </Field>
                <Field name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ" span={8} editable>
                   <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                </Field>
                <Field name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ" span={8} editable>
                   <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
              <Row gutter={16}>
                <Field name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú" span={24} editable><Input size="large" /></Field>
              </Row>
              <Row gutter={16}>
                <Field name="tinh_tp_tt" label="Tỉnh/TP Thường Trú" span={12} editable>
                  <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} />
                </Field>
                <Field name="xa_phuong_tt" label="Xã/Phường Thường trú" span={12} editable>
                  <AddressWardSelect province={watchTinhTpTt} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
              <Row gutter={16}>
                <Field name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ" span={24} editable>
                  <Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." />
                </Field>
              </Row>
              <Row gutter={16}>
                <Field name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ" span={8} editable>
                   <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />
                </Field>
                <Field name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ" span={8} editable>
                   <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                </Field>
                <Field name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ" span={8} editable>
                   <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                </Field>
              </Row>

              <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ tạm trú</Divider>
              <Row gutter={16}>
                <Field name="dia_chi_tam_tru" label="Địa chỉ tạm trú" span={24} editable><Input size="large" /></Field>
              </Row>
            </Card>"""

    target_norm = target.replace('\r\n', '\n')
    replacement_norm = replacement.replace('\r\n', '\n')

    if target_norm in content_lf:
        content_new = content_lf.replace(target_norm, replacement_norm)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content_new)
        print("Successfully reordered Profile.jsx!")
    else:
        print("Target not found in Profile.jsx!")

def reorder_profile_drawer():
    filepath = 'src/components/ProfileDrawer.jsx'
    if not os.path.exists(filepath):
        print("File not found:", filepath)
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content_lf = content.replace('\r\n', '\n')

    target = """                <Card title={<><HomeOutlined style={{marginRight: 8}}/> Địa chỉ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Row gutter={16}>
                    <Field name="dia_chi_tam_tru" label="Địa chỉ tạm trú" span={24}><Input size="large" placeholder="Nhập địa chỉ tạm trú hiện tại..." /></Field>
                  </Row>
                  
                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú" span={24}><Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản..." /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tt" label="Tỉnh/TP thường trú" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} />
                    </Field>
                    <Field name="xa_phuong_tt" label="Xã/Phường thường trú" span={12}>
                       <AddressWardSelect province={watchTinhTpTt} />
                    </Field>
                  </Row>
                  
                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
                  <Row gutter={16}>
                    <Field name="tinh_tp_qq" label="Tỉnh/TP quê quán" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} />
                    </Field>
                    <Field name="xa_phuong_qq" label="Xã/Phường quê quán" span={12}>
                       <AddressWardSelect province={watchTinhTpQq} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
                  <Row gutter={16}>
                    <Field name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ" span={8}>
                       <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} />
                    </Field>
                    <Field name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ" span={8}>
                       <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                    </Field>
                    <Field name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ" span={8}>
                       <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ" span={24}><Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ" span={8}>
                       <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} />
                    </Field>
                    <Field name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ" span={8}>
                       <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                    </Field>
                    <Field name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ" span={8}>
                       <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                    </Field>
                  </Row>
                </Card>"""

    replacement = """                <Card title={<><HomeOutlined style={{marginRight: 8}}/> Địa chỉ</>} bordered={false} style={cardStyle} headStyle={headStyle}>
                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
                  <Row gutter={16}>
                    <Field name="tinh_tp_qq" label="Tỉnh/TP quê quán" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} />
                    </Field>
                    <Field name="xa_phuong_qq" label="Xã/Phường quê quán" span={12}>
                       <AddressWardSelect province={watchTinhTpQq} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
                  <Row gutter={16}>
                    <Field name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ" span={8}>
                       <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} />
                    </Field>
                    <Field name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ" span={8}>
                       <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                    </Field>
                    <Field name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ" span={8}>
                       <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú" span={24}><Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản..." /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tt" label="Tỉnh/TP thường trú" span={12}>
                       <AddressProvinceSelect size="large" onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} />
                    </Field>
                    <Field name="xa_phuong_tt" label="Xã/Phường thường trú" span={12}>
                       <AddressWardSelect province={watchTinhTpTt} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
                  <Row gutter={16}>
                    <Field name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ" span={24}><Input size="large" placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." /></Field>
                  </Row>
                  <Row gutter={16}>
                    <Field name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ" span={8}>
                       <AddressProvinceSelect isOld={true} size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />
                    </Field>
                    <Field name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ" span={8}>
                       <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                    </Field>
                    <Field name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ" span={8}>
                       <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                    </Field>
                  </Row>

                  <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ tạm trú</Divider>
                  <Row gutter={16}>
                    <Field name="dia_chi_tam_tru" label="Địa chỉ tạm trú" span={24}><Input size="large" placeholder="Nhập địa chỉ tạm trú hiện tại..." /></Field>
                  </Row>
                </Card>"""

    target_norm = target.replace('\r\n', '\n')
    replacement_norm = replacement.replace('\r\n', '\n')

    if target_norm in content_lf:
        content_new = content_lf.replace(target_norm, replacement_norm)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content_new)
        print("Successfully reordered ProfileDrawer.jsx!")
    else:
        print("Target not found in ProfileDrawer.jsx!")

def reorder_dang_vien_form():
    filepath = 'src/components/DangVienForm.jsx'
    if not os.path.exists(filepath):
        print("File not found:", filepath)
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content_lf = content.replace('\r\n', '\n')

    target = """          <TabPane tab="Địa chỉ & Gia đình" key="2">
            <Row gutter={16}>
              <Col span={24}><Form.Item name="dia_chi_tam_tru" label="Địa chỉ tạm trú"><Input placeholder="Nhập địa chỉ tạm trú hiện tại..." style={{ height: 40 }} /></Form.Item></Col>
            </Row>
            
            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
            <Row gutter={16}>
              <Col span={24}><Form.Item name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú"><Input placeholder="Số nhà, tên đường, tổ/thôn/bản..." style={{ height: 40 }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_tt" label="Tỉnh/TP thường trú">
                  <AddressProvinceSelect onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_tt" label="Xã/Phường thường trú">
                  <AddressWardSelect province={watchTinhTpTt} />
                </Form.Item>
              </Col>
            </Row>
            
            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_qq" label="Tỉnh/TP quê quán">
                  <AddressProvinceSelect onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_qq" label="Xã/Phường quê quán">
                  <AddressWardSelect province={watchTinhTpQq} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ">
                  <AddressProvinceSelect isOld={true} onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ">
                  <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ">
                  <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
            <Row gutter={16}>
              <Col span={24}><Form.Item name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ"><Input placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." style={{ height: 40 }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ">
                  <AddressProvinceSelect isOld={true} onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ">
                  <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ">
                  <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
              <Col span={12}><Form.Item name="ho_ten_nguoi_than" label="Người thân (Tên)"><Input style={{ height: 40 }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="sdt_nguoi_than" label="SĐT Người thân"><Input style={{ height: 40 }} /></Form.Item></Col>
            </Row>
          </TabPane>"""

    replacement = """          <TabPane tab="Địa chỉ & Gia đình" key="2">
            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_qq" label="Tỉnh/TP quê quán">
                  <AddressProvinceSelect onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_qq" label="Xã/Phường quê quán">
                  <AddressWardSelect province={watchTinhTpQq} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ">
                  <AddressProvinceSelect isOld={true} onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ">
                  <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ">
                  <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
            <Row gutter={16}>
              <Col span={24}><Form.Item name="chi_tiet_dc" label="Chi tiết địa chỉ thường trú"><Input placeholder="Số nhà, tên đường, tổ/thôn/bản..." style={{ height: 40 }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_tt" label="Tỉnh/TP thường trú">
                  <AddressProvinceSelect onChange={() => form.setFieldsValue({ xa_phuong_tt: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_tt" label="Xã/Phường thường trú">
                  <AddressWardSelect province={watchTinhTpTt} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
            <Row gutter={16}>
              <Col span={24}><Form.Item name="chi_tiet_tt_cu" label="Chi tiết thường trú cũ"><Input placeholder="Số nhà, tên đường, tổ/thôn/bản cũ..." style={{ height: 40 }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ">
                  <AddressProvinceSelect isOld={true} onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ">
                  <AddressDistrictSelect province={watchTinhTpTtCu} onChange={() => form.setFieldsValue({ xa_phuong_tt_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ">
                  <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ tạm trú</Divider>
            <Row gutter={16}>
              <Col span={24}><Form.Item name="dia_chi_tam_tru" label="Địa chỉ tạm trú"><Input placeholder="Nhập địa chỉ tạm trú hiện tại..." style={{ height: 40 }} /></Form.Item></Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
              <Col span={12}><Form.Item name="ho_ten_nguoi_than" label="Người thân (Tên)"><Input style={{ height: 40 }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="sdt_nguoi_than" label="SĐT Người thân"><Input style={{ height: 40 }} /></Form.Item></Col>
            </Row>
          </TabPane>"""

    target_norm = target.replace('\r\n', '\n')
    replacement_norm = replacement.replace('\r\n', '\n')

    if target_norm in content_lf:
        content_new = content_lf.replace(target_norm, replacement_norm)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content_new)
        print("Successfully reordered DangVienForm.jsx!")
    else:
        print("Target not found in DangVienForm.jsx!")

reorder_profile()
reorder_profile_drawer()
reorder_dang_vien_form()
