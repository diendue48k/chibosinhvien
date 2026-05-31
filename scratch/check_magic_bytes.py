import os

file_path = r"D:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc"
if os.path.exists(file_path):
    with open(file_path, "rb") as f:
        header = f.read(4)
        print(f"Magic bytes: {header}")
        if header == b"PK\x03\x04":
            print("This is actually a ZIP/DOCX file!")
        else:
            print("This is a binary DOC/OLE file.")
else:
    print("File not found.")
