import os

files = ['src/pages/Profile.jsx', 'src/components/ProfileDrawer.jsx']
target = 'size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} size="large" />'
replacement = 'size="large" onChange={() => form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined })} />'

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if target in content:
            new_content = content.replace(target, replacement)
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(new_content)
            print(f"Successfully cleaned up {filepath}!")
        else:
            print(f"Target not found in {filepath}!")
    else:
        print(f"File not found: {filepath}")
