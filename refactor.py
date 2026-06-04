import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    wrappers = [
        "{activeTab === 'ban_tu_kiem_diem' && (",
        "{activeTab === 'nghi_quyet_doan_truong' && (",
        "{(activeTab === 'nghi_quyet_lcd' || activeTab === 'bien_ban_lcd') && (",
        "{(activeTab === 'nghi_quyet_chi_doan' || activeTab === 'bien_ban_chi_doan') && (",
        "{activeTab === 'bien_ban_hop_lop' && (",
    ]
    
    admin_wrappers = [
        "{isManager && activeTab === 'tong_hop_nhan_xet_mau12' && (",
        "{isManager && activeTab === 'nghi_quyet_chi_bo' && ("
    ]

    # For standard forms, just use a separator div
    for w in wrappers:
        text = text.replace(w, '<div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "2px dashed #e2e8f0" }}>')

    # For admin forms, we keep the isManager check, but add a special class to easily find the closing bracket later
    for w in admin_wrappers:
        text = text.replace(w, '{isManager && (<div className="admin-form-block" style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "2px dashed #e2e8f0" }}>')

    # Now we remove the action buttons.
    # Standard ones end with `)}` that we want to delete.
    # Admin ones also end with `)}` but we WANT to keep it!

    # Let's just find each Action Buttons block and remove it carefully.
    # Wait, the action buttons are basically:
    # {/* Action Buttons directly under the Form */}
    # <Divider ... />
    # <div ... > ... </div>
    # </div>
    # )}
    
    # We can split by Action Buttons comment
    parts = text.split('{/* Action Buttons directly under the Form */}')
    new_text = parts[0]
    for p in parts[1:]:
        # Find the closing `)}`
        # p starts with `\n                          <Divider...`
        # and ends with `</div>\n                      )}` then the next tab.
        
        # We need to remove from the start of p up to the first `)}`
        idx = p.find(')}')
        
        # Wait, if it's an admin block, we must KEEP the `)}`. We can tell if it's an admin block if we are replacing it.
        # Actually, let's just do a regex replace on the specific blocks
        pass
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
        
process_file('src/pages/DocumentGenerator.jsx')
