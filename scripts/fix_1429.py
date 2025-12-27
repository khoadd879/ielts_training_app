#!/usr/bin/env python3
"""Fix script for 1429-different-types-of-supermarket-layout listening exam."""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1429-different-types-of-supermarket-layout.json")
data = json.loads(json_path.read_text())

# Fix: Replace generic passage with proper note-taking format from source
proper_passage = """# Different Types of Supermarket Layout

## Questions 1-6: Complete the table below

| Layout | Description | Advantages | Disadvantages |
|--------|-------------|------------|---------------|
| **Grid** | parallel aisles | • efficient use of floor space<br>• Controls **1** _______ | • Uninteresting layout<br>• Shoppers can **2** _______ through their shopping |
| **Free-form** | **3** _______ organization | | • customers need more **4** _______ to find products<br>• poor use of space, so less **5** _______ |
| **Boutique** | Displays arranged around a food specialty | • separates space into **6** _______<br>• creates attractive image | • poor use of space |

---

## Questions 7-10: Which types of products are placed in each location?

**Types of Products:**
- **A** more expensive products
- **B** most profitable products  
- **C** products reduced in price
- **D** products aimed at children
- **E** products requiring careful selection
- **F** slow-moving products

**Locations:**
- **7** quieter areas → _______
- **8** end of aisles → _______
- **9** middle shelves → _______
- **10** lower shelves → _______
"""

data['sections'][0]['passage_md'] = proper_passage

# Update instruction
data['sections'][0]['instruction_md'] = """**Questions 1-6:**  
Complete the table below.

Write **NO MORE THAN THREE WORDS** for each answer.

---

**Questions 7-10:**  
Which types of products are placed in each location in supermarkets?

Choose **FOUR** answers from the box and write the correct letter, **A-F**."""

# Save the fixed data
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"✅ Fixed passage_md with proper note-taking format")
print(f"   Word count: {len(proper_passage.split())} words")
