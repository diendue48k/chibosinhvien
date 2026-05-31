import os

workspace_dir = r"D:\CBSV"
for root, dirs, files in os.walk(workspace_dir):
    # Skip node_modules and .git
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(('.docx', '.doc')):
            print(os.path.join(root, file))
