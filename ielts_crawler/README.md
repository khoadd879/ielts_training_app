# IELTS Crawler with AI Pipeline

Công cụ Python crawl nội dung đề IELTS từ bất kỳ website nào và import vào IELTS Training App.

## Tính năng

- 🌐 **Web Crawling** - Lấy nội dung từ các trang IELTS
- 🤖 **AI Extraction** - Dùng Gemini AI để extract passages và questions
- 🌍 **Browser Mode** - Dùng Playwright cho các trang có bảo vệ bot
- 🔄 **Auto Transform** - Chuyển đổi sang format API backend
- 📤 **Direct Upload** - Tạo test trực tiếp trong hệ thống

## Cài đặt

```bash
cd ielts_crawler

# Tạo virtual environment
python -m venv venv

# Cài dependencies
./venv/bin/pip install -r requirements.txt

# Cài browser cho Playwright (nếu dùng --browser)
./venv/bin/playwright install chromium

# Tạo file config
cp .env.example .env
# Sửa .env với Gemini API key của bạn
```

## Sử dụng

### Crawl 1 URL
```bash
# Preview (không upload)
./venv/bin/python src/main.py "https://example.com/test" --preview

# Crawl và upload
./venv/bin/python src/main.py "https://example.com/test" --title "Test Name"
```

### Trang có bảo vệ bot (British Council, etc.)
```bash
# Thêm --browser hoặc -b
./venv/bin/python src/main.py "https://takeielts.britishcouncil.org/..." --browser --preview
```

### Tìm links từ trang index
```bash
# Discover links
./venv/bin/python src/main.py "https://example.com/tests" --discover

# Crawl tất cả đề
./venv/bin/python src/main.py "https://example.com/tests" --crawl-all --preview
```

### Dùng URL trong .env
```bash
# Không cần truyền URL
./venv/bin/python src/main.py --preview
```

## CLI Options

| Option | Short | Mô tả |
|--------|-------|-------|
| `--preview` | `-p` | Xem trước, không upload |
| `--browser` | `-b` | Dùng browser (cho trang có bảo vệ) |
| `--discover` | `-d` | Tìm links từ trang index |
| `--crawl-all` | `-a` | Crawl tất cả links tìm được |
| `--title` | `-t` | Đặt tên test |
| `--type` | `-T` | READING hoặc LISTENING |
| `--level` | `-l` | Low, Mid, High, Great |

## Cấu hình (.env)

```env
GEMINI_API_KEY=your_api_key
URL_TO_CRAWL=https://example.com/test
BACKEND_BASE_URL=http://localhost:3000/api
ADMIN_EMAIL=your_email
ADMIN_PASSWORD=your_password
REQUEST_DELAY_MS=2000
```

## Question Types hỗ trợ

- MCQ (Multiple Choice)
- TFNG (True/False/Not Given)
- YES_NO_NOTGIVEN
- FILL_BLANK
- MATCHING
- SHORT_ANSWER
- LABELING
