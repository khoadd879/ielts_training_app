#!/usr/bin/env python3
"""Fix script #4 for exam 1520 - Add diagram images to passage for Q7-13"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1520-the-story-of-coffee.json")
data = json.loads(json_path.read_text())

# The exam already has the main image_url for the header
# But we need to add the diagram images for Questions 7-9 and 10-13 into the passage

# Current passage_md 
current_passage = data['sections'][0]['passage_md']

# Add diagram sections at the end
diagram_section = """

---

## Diagram: Structure of a Coffee Bean (Questions 7-9)

![Coffee Bean Structure](http://images.mini-ielts.com/images/process.png)

Complete the labels:
- **7** _______
- **8** _______  
- **9** _______

---

## Flowchart: Coffee Production Process (Questions 10-13)

![Coffee Production Process](http://images.mini-ielts.com/images/process2.png)

Complete the flowchart:
- **10** _______
- **11** _______
- **12** _______
- **13** _______"""

# Append diagrams to passage
data['sections'][0]['passage_md'] = current_passage + diagram_section

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"Fixed: {json_path}")
print(f"Added diagram images for Q7-13")
