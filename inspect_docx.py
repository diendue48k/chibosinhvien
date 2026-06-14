import zipfile
import xml.etree.ElementTree as ET

docx_path = r"D:\CBSV\public\7. Mau 12_KND_Tong hop nhan xet cuadoan the dv dang vien du bi.docx"

try:
    with open("temp_text.txt", "w", encoding="utf-8") as f:
        f.write("--- EXTRACTING PARAGRAPHS AND TEXTS ---\n")
        with zipfile.ZipFile(docx_path) as z:
            doc_xml = z.read("word/document.xml")
            root = ET.fromstring(doc_xml)
            
            # XML namespace map
            namespaces = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            }
            
            for elem in root.iter():
                if elem.tag.endswith('p'):
                    text = ""
                    for t in elem.findall('.//w:t', namespaces):
                        if t.text:
                            text += t.text
                    if text.strip():
                        align = elem.find('.//w:jc', namespaces)
                        align_val = align.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '') if align is not None else 'left'
                        f.write(f"[{align_val}] {text}\n")
except Exception as e:
    with open("temp_text.txt", "w", encoding="utf-8") as f:
        f.write(f"Error: {e}\n")
