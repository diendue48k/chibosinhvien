import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')

doc = docx.Document(r"D:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx")
print("--- MAU 10 PLACEHOLDERS ---")
for idx, p in enumerate(doc.paragraphs):
    if "{{" in p.text:
        print(f"P{idx}: {p.text}")
