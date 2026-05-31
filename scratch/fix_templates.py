import sys
import zipfile
import re
import os

sys.stdout.reconfigure(encoding='utf-8')


def fix_template(path, placeholder):
    with zipfile.ZipFile(path, 'r') as z:
        content = z.read('word/document.xml').decode('utf-8')

    bi_thu = 'B\u00cd TH\u01af'
    real_target = f'<w:t>{bi_thu}</w:t></w:r></w:p></w:tc>'

    print(f'Path: {path}')
    print(f'Real target found: {real_target in content}')

    # Find last occurrence and replace only that one
    last_idx = content.rfind(real_target)
    if last_idx == -1:
        print('Target NOT found! Dumping nearby area...')
        idx = content.rfind(bi_thu)
        print(repr(content[idx-20:idx+200]))
        return

    new_para = (
        f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
        f'<w:r><w:rPr><w:b/></w:rPr>'
        f'<w:t>{{{{{placeholder}}}}}</w:t>'
        f'</w:r></w:p>'
    )
    replacement = f'<w:t>{bi_thu}</w:t></w:r></w:p>{new_para}</w:tc>'

    updated = content[:last_idx] + replacement + content[last_idx + len(real_target):]
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
    print('Done updating file')

    with zipfile.ZipFile(path, 'r') as z:
        cnt = z.read('word/document.xml').decode('utf-8')
        phs = re.findall(r'\{\{([^}]+)\}\}', cnt)
        print(f'Final placeholders: {phs[-6:]}')
    print()


fix_template(
    'D:\\CBSV\\public\\4. Ngh\u1ecb quy\u1ebft Chi \u0110o\u00e0n.docx',
    'bi_thu_chi_doan'
)
fix_template(
    'D:\\CBSV\\public\\1. Ngh\u1ecb quy\u1ebft \u0110o\u00e0n Tr\u01b0\u1eddng (02 b\u1ea3n).docx',
    'bi_thu_doan_truong'
)
