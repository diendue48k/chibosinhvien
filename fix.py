import re
with open('src/pages/DocumentGenerator.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'\{\(activeTab === \'nghi_quyet_chi_doan\' \|\| activeTab === \'bien_ban_chi_doan\'\) && \(\s*<div>',
    r'<div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px dashed #e2e8f0" }}>\n                          <div>',
    text
)
text = re.sub(
    r'\{\(activeTab === \'nghi_quyet_lcd\' \|\| activeTab === \'bien_ban_lcd\'\) && \(\s*<div>',
    r'<div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px dashed #e2e8f0" }}>\n                          <div>',
    text
)
text = re.sub(
    r'\{isManager && activeTab === \'nghi_quyet_chi_bo\' && \(\s*<div>',
    r'{isManager && (\n                        <div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px dashed #e2e8f0" }}>\n                          <div>',
    text
)
text = re.sub(
    r'\{isManager && activeTab === \'tong_hop_nhan_xet_mau12\' && \(\s*<div>',
    r'{isManager && (\n                        <div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px dashed #e2e8f0" }}>\n                          <div>',
    text
)

text = text.replace(
    '                              Tải file Word\n                            </Button>\n                          </div>\n                        </div>\n                      )}',
    '                              Tải file Word\n                            </Button>\n                          </div>\n                        </div>\n                      </div>'
)

text = re.sub(
    r'\{/\* Action Buttons directly under the Form \*/\}.*?</Button>\s*</div>',
    '',
    text,
    flags=re.DOTALL
)

with open('src/pages/DocumentGenerator.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done')
