# API Endpoints

## Question Endpoints

### Create Single Question
```
POST /question/create-question
```

**Request Body:**
```typescript
{
  idQuestionGroup: string,
  idPart: string,
  questionNumber: number,
  content: string,
  questionType: string,
  metadata: object,
  order?: number
}
```

**Response:**
```typescript
{
  message: "Question created successfully",
  data: {
    idQuestion: "uuid",
    idQuestionGroup: "uuid",
    idPart: "uuid",
    questionNumber: 1,
    content: "...",
    questionType: "MULTIPLE_CHOICE",
    metadata: { ... },
    order: 0
  },
  status: 200
}
```

---

### Create Many Questions
```
POST /question/create-many-questions
```

**Request Body:**
```typescript
{
  questions: [
    { idQuestionGroup, idPart, questionNumber, content, questionType, metadata, order? },
    { ... },
    { ... }
  ]
}
```

**Response:**
```typescript
{
  message: "Questions created successfully",
  data: [
    { idQuestion: "uuid", ... },
    { idQuestion: "uuid", ... }
  ],
  status: 200
}
```

---

### Get Questions by Question Group
```
GET /question/find-by-question-group/:idQuestionGroup
```

**Response:**
```typescript
{
  message: "Questions retrieved successfully",
  data: [
    {
      idQuestion: "uuid",
      questionNumber: 1,
      content: "Question text or HTML",
      questionType: "MULTIPLE_CHOICE",
      metadata: { ... }
    }
  ],
  status: 200
}
```

---

### Get Question by ID
```
GET /question/find-by-id/:idQuestion
```

**Response:**
```typescript
{
  message: "Question retrieved successfully",
  data: {
    idQuestion: "uuid",
    questionNumber: 1,
    content: "...",
    questionType: "...",
    metadata: { ... }
  },
  status: 200
}
```

---

### Update Question
```
PATCH /question/update-question/:idQuestion
```

**Request Body:**
```typescript
{
  idQuestionGroup?: string,
  idPart?: string,
  questionNumber?: number,
  content?: string,
  questionType?: string,
  metadata?: object,
  order?: number
}
```

**Response:**
```typescript
{
  message: "Question updated successfully",
  data: { ... },
  status: 200
}
```

---

### Delete Question
```
DELETE /question/delete-question/:idQuestion
```

**Response:**
```typescript
{
  message: "Question deleted successfully",
  status: 200
}
```

---

## Answer Endpoints

### Create Many Answers
```
POST /user-answer/create-many-user-answers/:idUser/:idTestResult
```

**Request Body:**
```typescript
[
  {
    idQuestion: "uuid",
    answerText: "Paris",
    userAnswerType: "FILL_BLANK",
    matching_key: "A",     // For box selection
    matching_value: null
  }
]
```

**Response:**
```typescript
{
  message: "Answers created successfully",
  data: [...],
  status: 200
}
```

---

### Get Answers by Question ID
```
GET /answer/get-by-id-question/:idQuestion
```

**Response:**
```typescript
{
  data: [
    {
      idAnswer: "uuid",
      idQuestion: "uuid",
      answer_text: "Paris",
      matching_key: "A",
      matching_value: "CORRECT"
    }
  ]
}
```

---

## Group/Part Endpoints

### Get Group by ID
```
GET /group-of-questions/get-by-id/:idGroupOfQuestions
```

### Get Parts
```
GET /part/get-all
```
