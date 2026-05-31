import zipfile
import xml.etree.ElementTree as ET

docx_path = r"D:\CBSV\public\ĐHKT_QĐ 213- 24052026.Sinh vien.docx"

try:
    with zipfile.ZipFile(docx_path) as z:
        doc_xml = z.read("word/document.xml")
        root = ET.fromstring(doc_xml)
        
        # XML namespace map
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        }
        
        print("--- EXTRACTING PARAGRAPHS AND TEXTS ---")
        for elem in root.iter():
            if elem.tag.endswith('p'):
                text = ""
                for t in elem.findall('.//w:t', namespaces):
                    if t.text:
                        text += t.text
                if text.strip():
                    # Print paragraph element info
                    align = elem.find('.//w:jc', namespaces)
                    align_val = align.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '') if align is not None else 'left'
                    print(f"[{align_val}] {text}")
except Exception as e:
    print("Error:", e)
