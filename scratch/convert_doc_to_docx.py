import win32com.client
import os

doc_path = r"D:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc"
docx_path = r"D:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx"

try:
    word = win32com.client.Dispatch("Word.Application")
    doc = word.Documents.Open(doc_path)
    # FileFormat=16 is for wdFormatXMLDocument (docx)
    doc.SaveAs2(docx_path, FileFormat=16)
    doc.Close()
    word.Quit()
    print("Successfully converted .doc to .docx!")
except Exception as e:
    print(f"Error: {e}")
