with open('src/pages/DocumentGenerator.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(r'\'', "'")

with open('src/pages/DocumentGenerator.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
