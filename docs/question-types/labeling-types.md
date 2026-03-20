# Labeling Question Types

## 1. DIAGRAM_LABELING (Map/Diagram Labeling)

### Description
Label specific points on a diagram, map, or image.

### Metadata Structure
```typescript
{
  type: "DIAGRAM_LABELING",
  imageUrl: "https://example.com/diagram.png",
  labelCoordinate: { x: 50.5, y: 25.0 },  // Percentage 0-100
  pointLabel: "A",  // Display label for this point
  hasWordBank: true,
  wordBank: [
    { id: "1", text: "River" },
    { id: "2", text: "Mountain" },
    { id: "3", text: "Valley" }
  ],
  correctAnswers: ["River"]
}
```

### Example
```json
{
  "type": "DIAGRAM_LABELING",
  "imageUrl": "https://example.com/map.png",
  "labelCoordinate": { "x": 45.0, "y": 30.5 },
  "pointLabel": "1",
  "hasWordBank": false,
  "correctAnswers": ["Atlantic Ocean"]
}
```

### Coordinate System

Coordinates are percentages (0-100) relative to image dimensions:

```
(0,0) ────────────────── (100,0)
  │                         │
  │      Image Area         │
  │                         │
(0,100) ─────────────── (100,100)
```

| Position | x | y |
|----------|---|---|
| Top-left | 0 | 0 |
| Top-right | 100 | 0 |
| Bottom-left | 0 | 100 |
| Bottom-right | 100 | 100 |
| Center | 50 | 50 |

### Teacher Form
- File: `LabelingForm.jsx`
- Upload or enter image URL
- Click on image to set coordinate
- Enter point label (A, B, 1, 2, etc.)
- Enter correct answer
- Toggle word bank option

### Student Renderer
- File: `RenderLabeling.jsx`
- Displays image with clickable marker at coordinate
- Shows label (A, B, 1, 2...)
- Text input or dropdown for answer

---

## Coordinate Display Format

| Format | Example | Description |
|--------|---------|-------------|
| Percentage | `{ x: 50, y: 25 }` | 50% from left, 25% from top |
| Range | 0-100 | Always percentages |

## Common Fields for Labeling

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "DIAGRAM_LABELING" |
| `imageUrl` | string | Yes | Image URL (must be valid URL) |
| `labelCoordinate` | object | Yes | `{ x: number, y: number }` |
| `pointLabel` | string | Yes | Display label (A, B, 1, 2...) |
| `hasWordBank` | boolean | No | Whether word bank is used |
| `wordBank` | array | No | Word bank items |
| `correctAnswers` | array | Yes | Acceptable answer(s) |
