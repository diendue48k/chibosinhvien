import json
import os

log_path = r"C:\Users\ASUS\.gemini\antigravity\brain\5b83cefd-a0c5-4bec-b842-cc72df95c2aa\.system_generated\logs\transcript.jsonl"

if not os.path.exists(log_path):
    print("Log file not found.")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            # Look for model tool calls
            tool_calls = data.get("tool_calls", [])
            for call in tool_calls:
                name = call.get("name")
                args = call.get("args", {})
                if name in ["replace_file_content", "multi_replace_file_content"]:
                    target = args.get("TargetFile", "")
                    if "DocumentGenerator.jsx" in target:
                        print(f"--- TOOL CALL: {name} ---")
                        print(f"Instruction: {args.get('Instruction')}")
                        print(f"Description: {args.get('Description')}")
                        if name == "replace_file_content":
                            print("StartLine:", args.get("StartLine"))
                            print("EndLine:", args.get("EndLine"))
                            print("TargetContent:", args.get("TargetContent"))
                            print("ReplacementContent:", args.get("ReplacementContent"))
                        else:
                            chunks = args.get("ReplacementChunks", [])
                            print(f"Chunks ({len(chunks)}):")
                            for idx, chunk in enumerate(chunks):
                                print(f"  Chunk {idx}: StartLine={chunk.get('StartLine')}, EndLine={chunk.get('EndLine')}")
                                print("  TargetContent:", chunk.get("TargetContent"))
                                print("  ReplacementContent:", chunk.get("ReplacementContent"))
                        print("=" * 80)
        except Exception as e:
            pass
