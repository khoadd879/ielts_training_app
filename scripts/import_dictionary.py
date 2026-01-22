#!/usr/bin/env python3
"""
Import dictionary data into Elasticsearch
"""
import json
import requests
from datetime import datetime

ES_URL = "http://localhost:9200"
INDEX = "dictionary_v1"
BATCH_SIZE = 500

def main():
    with open("templates/dictionary-import.json", "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    print(f"Found {len(lines)} dictionary entries")
    
    batch = []
    imported = 0
    
    for i, line in enumerate(lines):
        try:
            entry = json.loads(line.strip())
            word = entry.get("word", "")
            pos = entry.get("pos", "")
            
            doc = {
                "id": i + 1,
                "word": word,
                "wordNorm": word.lower(),
                "pos": pos,
                "importedAt": datetime.utcnow().isoformat(),
                "data": entry
            }
            
            # Add bulk action
            batch.append(json.dumps({"index": {"_index": INDEX, "_id": str(i + 1)}}))
            batch.append(json.dumps(doc))
            
            if len(batch) >= BATCH_SIZE * 2:
                bulk_data = "\n".join(batch) + "\n"
                resp = requests.post(
                    f"{ES_URL}/_bulk",
                    headers={"Content-Type": "application/x-ndjson"},
                    data=bulk_data
                )
                if resp.status_code != 200:
                    print(f"Error: {resp.text}")
                else:
                    imported += len(batch) // 2
                    print(f"Imported {imported} entries...")
                batch = []
                
        except json.JSONDecodeError as e:
            print(f"Skipping line {i}: {e}")
            continue
    
    # Import remaining
    if batch:
        bulk_data = "\n".join(batch) + "\n"
        resp = requests.post(
            f"{ES_URL}/_bulk",
            headers={"Content-Type": "application/x-ndjson"},
            data=bulk_data
        )
        imported += len(batch) // 2
    
    print(f"✅ Total imported: {imported} dictionary entries")

if __name__ == "__main__":
    main()
