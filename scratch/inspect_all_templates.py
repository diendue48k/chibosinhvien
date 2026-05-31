import os
import zipfile
import xml.etree.ElementTree as ET

templates = [
    "1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc",
    "1. Nghị quyết LCĐ.docx",
    "1. Nghị quyết Đoàn Trường (02 bản).docx",
    "3. Biên bản họp Liên chi Đoàn.docx",
    "4. Nghị quyết Chi Đoàn.docx",
    "5. Biên bản họp Chi Đoàn.docx",
    "6. Biên bản họp lớp.docx"
]

public_dir = r"D:\CBSV\public"
output_file = r"D:\CBSV\scratch\templates_dump.txt"

namespaces = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
}

with open(output_file, 'w', encoding='utf-8') as out:
    for name in templates:
        path = os.path.join(public_dir, name)
        out.write(f"\n=========================================\nFILE: {name}\n=========================================\n")
        if not os.path.exists(path):
            out.write("File does not exist!\n")
            continue
        
        # Check if zipfile (docx format)
        if not zipfile.is_zipfile(path):
            out.write("Not a zipfile (likely binary .doc format).\n")
            # Try to read simple strings if it's a binary file
            try:
                with open(path, 'rb') as f:
                    content = f.read()
                # Very crude binary string extraction
                text_runs = []
                current = []
                for b in content:
                    if 32 <= b < 127 or b > 127: # printable or non-ascii
                        current.append(bytes([b]))
                    else:
                        if len(current) > 5:
                            try:
                                s = b''.join(current).decode('utf-8', errors='ignore')
                                if s.strip():
                                    text_runs.append(s.strip())
                            except:
                                pass
                        current = []
                out.write(f"Extracted crude text ({len(text_runs)} runs):\n")
                out.write(" ".join(text_runs[:50]) + "\n")
            except Exception as e:
                out.write(f"Error reading binary file: {e}\n")
            continue

        try:
            with zipfile.ZipFile(path) as z:
                doc_xml = z.read("word/document.xml")
                root = ET.fromstring(doc_xml)
                
                for elem in root.iter():
                    if elem.tag.endswith('p'):
                        text = ""
                        for t in elem.findall('.//w:t', namespaces):
                            if t.text:
                                text += t.text
                        if text.strip():
                            align = elem.find('.//w:jc', namespaces)
                            align_val = align.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '') if align is not None else 'left'
                            out.write(f"[{align_val}] {text}\n")
        except Exception as e:
            out.write(f"Error reading docx XML: {e}\n")

print("Templates dumped successfully to templates_dump.txt")
