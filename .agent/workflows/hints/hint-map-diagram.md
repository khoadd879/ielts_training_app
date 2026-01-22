---
description: MAP_LABEL / DIAGRAM_LABEL / PLAN - Label visual elements (A-H)
---

# MAP_LABEL / DIAGRAM_LABEL / PLAN

## Khi nào sử dụng:
- "Label the map/plan/diagram below"
- "Write the correct letter A-H next to questions..."
- Visual elements with numbered positions (1-10) matching to labels (A-H)
- **LISTENING:** Museum maps, building layouts, area maps
- **READING:** Process diagrams, flowcharts, labeled illustrations

## ⚠️ CRITICAL: Image Handling

> [!CAUTION]
> **Các dạng MAP/DIAGRAM/PLAN BẮT BUỘC phải có ảnh!**
> 
> Pipeline PHẢI:
> 1. Extract image URL từ raw HTML
> 2. Upload lên Cloudinary
> 3. Embed vào passageMd

### Auto-detection patterns in HTML:
```python
# Patterns to find map/diagram images
patterns = [
    r'<img[^>]+src="([^"]*map[^"]*)"',
    r'<img[^>]+src="([^"]*diagram[^"]*)"',
    r'<img[^>]+src="([^"]*plan[^"]*)"',
    r'<img[^>]+src="([^"]*layout[^"]*)"',
    r'<img[^>]+src="([^"]*floor[^"]*)"',
]
```

### Cloudinary upload:
```python
import cloudinary.uploader
result = cloudinary.uploader.upload(
    image_url,
    public_id=f"ielts/{item_id}_map",
    overwrite=True
)
cdn_url = result['secure_url']
```

## Expected JSON Structure:

```json
{
  "idx": 7,
  "type": "MATCHING_INFORMATION",
  "promptMd": "restaurant",
  "options": [],
  "correct_answers": ["A"],
  "matchPairs": {"map-q7": ["A"]}
}
```

## 🚨 STRICT RULES:

### 1. Type = MATCHING_INFORMATION (not MAP_LABEL):
```python
# MAP_LABEL không tồn tại trong schema!
# Convert to MATCHING_INFORMATION
q['type'] = 'MATCHING_INFORMATION'
q['options'] = []  # MUST be empty
```

### 2. Options MUST be empty:
```json
"options": []  // ✅ CRITICAL
```

### 3. Answer = Single uppercase letter:
```
✅ "A", "B", "C"... "H"
❌ "A, B" (multiple letters = MCQ_MULTIPLE)
```

### 4. passageMd MUST include:
- Image embed: `![Map](https://res.cloudinary.com/...)`
- Options list: A-H với descriptions
- Question list: numbered items with blanks

### 5. Image Validation:
```python
# Check if passageMd has image for map/diagram questions
if 'map' in instruction.lower() or 'diagram' in instruction.lower():
    if '![' not in passage_md:
        raise ValueError("Missing image for map/diagram question!")
```

## passageMd Format:

```markdown
## Questions 7-10

Label the map below. Write the correct letter, **A-H**, next to Questions 7-10.

### Options:
- **A** bicycle parking
- **B** drinks machine
- **C** first aid room
- **D** manager's office
- **E** telephones
- **F** ticket office
- **G** toilets
- **H** lost property

### Map:

![Museum Floor Plan](https://res.cloudinary.com/xxx/map.jpg)

### Questions:
- **7** restaurant → _______
- **8** café → _______
- **9** baby-changing facilities → _______
- **10** cloakroom → _______
```

## Hints Usage:
```bash
--hints="Q7-10:MATCHING_INFORMATION"
```

## Fix Template:
```python
import json
from pathlib import Path

json_path = Path("data/normalized/mini-ielts/<ITEM_ID>.json")
data = json.loads(json_path.read_text())

# Fix MAP_LABEL → MATCHING_INFORMATION
for q in data['questions']:
    if q['type'] == 'MAP_LABEL' or 'map' in q.get('prompt_md', '').lower():
        q['type'] = 'MATCHING_INFORMATION'
        q['options'] = []
        # Ensure matchPairs exists
        if not q.get('matchPairs'):
            q['matchPairs'] = {f"map-q{q['idx']}": q['correct_answers']}

# Ensure image is in passageMd
section = data['sections'][0]
if 'map' in section.get('instruction_md', '').lower():
    if '![' not in section['passage_md']:
        # Add image placeholder - need manual fix with correct URL
        section['passage_md'] += "\n\n![Map](IMAGE_URL_NEEDED)"

json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
```

## Common Issues:

| Issue | Fix |
|-------|-----|
| `type: MAP_LABEL` | Change to `MATCHING_INFORMATION` |
| Options not empty | Set `options = []` |
| Missing image | Extract from raw HTML, upload to Cloudinary |
| Image timeout | Find alternative source or note unavailable |
| Wrong type detection | Use `--hints` parameter |

## Grader: `MatchingHeadingGrader`
## UI: `matching_letter` (Single letter text input A-J)
