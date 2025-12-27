#!/usr/bin/env python3
"""Fix script #3 for 1429 - Fix passage format to simple list instead of table."""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1429-different-types-of-supermarket-layout.json")
data = json.loads(json_path.read_text())

# Fix: Use simple list format instead of markdown table (tables don't render well)
proper_passage = """# Different Types of Supermarket Layout

## Questions 1-6: Complete the table below

### Grid Layout
- **Description:** parallel aisles
- **Advantages:** 
  - efficient use of floor space
  - Controls **1** _______
- **Disadvantages:**
  - Uninteresting layout
  - Shoppers can **2** _______ through their shopping

### Free-form Layout
- **Description:** **3** _______ organization
- **Disadvantages:**
  - customers need more **4** _______ to find products
  - poor use of space, so less **5** _______

### Boutique Layout
- **Description:** Displays arranged around a food specialty
- **Advantages:**
  - separates space into **6** _______
  - creates attractive image
- **Disadvantages:**
  - poor use of space

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

# Save the fixed data
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"✅ Fixed passage_md with simple list format (no tables)")
print(f"   Word count: {len(proper_passage.split())} words")
