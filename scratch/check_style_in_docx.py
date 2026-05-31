import zipfile
import xml.etree.ElementTree as ET
import os

output_dir = r"d:\CBSV\test_output"
file_name = "1_Ban_Tu_Kiem_Diem.docx"
file_path = os.path.join(output_dir, file_name)

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

namespaces = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
}

try:
    with zipfile.ZipFile(file_path) as z:
        # Check if styles.xml is still intact
        styles_xml = z.read("word/styles.xml")
        print("[OK] word/styles.xml exists in the generated docx.")
        
        # Read document.xml and parse it
        doc_xml = z.read("word/document.xml")
        root = ET.fromstring(doc_xml)
        
        # Let's inspect some replaced texts and see if they retain font and style
        print("\n--- Inspecting replaced paragraphs and their styling ---")
        count = 0
        for p in root.findall('.//w:p', namespaces):
            # Check paragraph text
            text = "".join([t.text for t in p.findall('.//w:t', namespaces) if t.text])
            if text.strip():
                count += 1
                # Find fonts and styles in this paragraph
                fonts = p.findall('.//w:rFonts', namespaces)
                font_name = "Default/Inherited"
                if fonts:
                    font_attrib = fonts[0].attrib
                    font_name = font_attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ascii', '')
                
                sz = p.findall('.//w:sz', namespaces)
                sz_val = "Default"
                if sz:
                    sz_val = sz[0].attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '')
                    
                print(f"Paragraph {count}: [{font_name}, size: {sz_val}] -> {text[:80]}...")
                if count >= 10:
                    break
except Exception as e:
    print("Error:", e)
