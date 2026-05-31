import sys
import zipfile
import re
import os

sys.stdout.reconfigure(encoding='utf-8')

bi_thu = 'B\u00cd TH\u01af'

# Fix NQ Doan Truong - different XML structure
path = 'D:\\CBSV\\public\\1. Ngh\u1ecb quy\u1ebft \u0110o\u00e0n Tr\u01b0\u1eddng (02 b\u1ea3n).docx'
placeholder = 'bi_thu_doan_truong'

with zipfile.ZipFile(path, 'r') as z:
    content = z.read('word/document.xml').decode('utf-8')

print(f'BÍ THƯ found: {bi_thu in content}')

# The structure after BÍ THƯ is:
# </w:r></w:p><w:p ...empty...></w:p><w:p ... center empty ...></w:p><w:p ... center empty ...>
# We want to fill the 2nd centered empty paragraph with the name placeholder

# Target: find the empty centered paragraph AFTER BÍ THƯ
idx = content.rfind(bi_thu)
suffix = content[idx:]

# The empty centered paragraphs look like:
# <w:p ...><w:pPr><w:jc w:val="center"/>...<w:rPr>...</w:rPr></w:pPr></w:p>
# We want to insert a run into one of them

# Find the second empty centered paragraph
pattern = r'(<w:p [^>]+><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts [^/]+/></w:rPr></w:pPr>)(</w:p>)'
matches = list(re.finditer(pattern, suffix))
print(f'Found {len(matches)} centered empty paragraphs after BÍ THƯ')

if matches:
    # Use the last empty centered paragraph to insert name
    m = matches[-1]
    # The match is in 'suffix', need absolute positions
    abs_start = idx + m.start()
    abs_end = idx + m.end()
    
    # Insert a run with the placeholder before the closing </w:p>
    insert_run = (
        f'<w:r><w:rPr><w:b/><w:rFonts w:eastAsia="Calibri"/></w:rPr>'
        f'<w:t>{{{{{placeholder}}}}}</w:t></w:r>'
    )
    
    updated = (
        content[:abs_start] +
        m.group(1) +
        insert_run +
        m.group(2) +
        content[abs_end:]
    )
    
    print(f'Content changed: {content != updated}')
    
    tmp_path = path + '.tmp'
    with zipfile.ZipFile(path, 'r') as z_in:
        with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
            for item in z_in.infolist():
                if item.filename == 'word/document.xml':
                    z_out.writestr(item, updated.encode('utf-8'))
                else:
                    z_out.writestr(item, z_in.read(item.filename))
    
    os.replace(tmp_path, path)
    print('Done!')
    
    with zipfile.ZipFile(path, 'r') as z:
        cnt = z.read('word/document.xml').decode('utf-8')
        phs = re.findall(r'\{\{([^}]+)\}\}', cnt)
        print(f'Final placeholders (last 5): {phs[-5:]}')
else:
    print('No matches found, trying alternative approach...')
    # Find a simple empty paragraph after BÍ THƯ
    empty_para = '<w:p w14:paraId="567C132E"'
    idx2 = content.find(empty_para, idx)
    if idx2 > -1:
        print(f'Found empty para at relative pos {idx2 - idx}')
        # Insert run into this paragraph before </w:p>
        close = content.find('</w:p>', idx2)
        insert_run = (
            f'<w:r><w:rPr><w:b/></w:rPr>'
            f'<w:t>{{{{{placeholder}}}}}</w:t></w:r>'
        )
        updated = content[:close] + insert_run + content[close:]
        
        tmp_path = path + '.tmp'
        with zipfile.ZipFile(path, 'r') as z_in:
            with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
                for item in z_in.infolist():
                    if item.filename == 'word/document.xml':
                        z_out.writestr(item, updated.encode('utf-8'))
                    else:
                        z_out.writestr(item, z_in.read(item.filename))
        
        os.replace(tmp_path, path)
        print('Done (alternative)!')
        
        with zipfile.ZipFile(path, 'r') as z:
            cnt = z.read('word/document.xml').decode('utf-8')
            phs = re.findall(r'\{\{([^}]+)\}\}', cnt)
            print(f'Final placeholders (last 5): {phs[-5:]}')
