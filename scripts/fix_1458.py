#!/usr/bin/env python3
"""Fix script for 1458-riverdale-pre-school listening exam."""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1458-riverdale-pre-school.json")
data = json.loads(json_path.read_text())

# Fix: Use bullet list format for passage_md (NOT markdown table)
proper_passage = """# Riverdale Pre-school

**Example:** Children: 20 in a class

## Classes
- First group - Mrs. Oliver
- Second group - Mrs. **1** _______

## Hours & Days
- Suzie will attend 3 days a week for a total of **2** _______ hours

## Activities

### Outside time
- running, playing, or something quieter
- just got a new piece of equipment
- intend to make a **3** _______

### Indoors
- this year, **4** _______ activities are popular
- they hear a **5** _______ every day

## Fees
- Now costs **6** _______ $ per term

### Fees include:
- a trip to a **7** _______ this year
- chance to take home a **8** _______ every week

## Do not forget
- Put a **9** _______ in Suzie's bag

## Arrange a visit
- phone number: **10** _______
"""

data['sections'][0]['passage_md'] = proper_passage

# Update instruction
data['sections'][0]['instruction_md'] = """**Questions 1-10:**  
Complete the notes below.

Write **ONE WORD AND/OR A NUMBER** for each answer."""

# Save the fixed data
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"✅ Fixed passage_md with bullet list format")
print(f"   Word count: {len(proper_passage.split())} words")
