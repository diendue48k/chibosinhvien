import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

docx_path = r"D:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx"
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

with zipfile.ZipFile(docx_path) as z:
    doc_xml = z.read("word/document.xml")
    root = ET.fromstring(doc_xml)

body = root.find('.//w:body', namespaces)
for idx, p in enumerate(body.findall('.//w:p', namespaces)):
    p_text = "".join(t.text for t in p.findall('.//w:t', namespaces) if t.text)
    print(f"P{idx}: '{p_text}'")
    runs = p.findall('.//w:r', namespaces)
    for r_idx, r in enumerate(runs):
        r_text = "".join(t.text for t in r.findall('.//w:t', namespaces) if t.text)
        if r_text.strip():
            print(f"  R{r_idx}: '{r_text}'")
