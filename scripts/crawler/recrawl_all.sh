#!/bin/bash
# Re-crawl all ielts-writing.info URLs

URLS=(
    "https://www.ielts-writing.info/EXAM/ielts_reading/1224/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1207/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1197/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1191/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1188/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1186/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1180/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1170/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1159/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1157/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1127/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1106/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1095/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1089/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1078/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1068/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1066/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1058/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1050/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1029/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/1004/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/992/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/990/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/976/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/970/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/957/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/955/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/952/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/946/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/936/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/929/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/902/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/873/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/848/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/824/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/765/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/742/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/721/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/714/"
    "https://www.ielts-writing.info/EXAM/ielts_reading/713/"
)

cd /home/khoa/RiderProjects/Project_Langfens_Microservice/scripts/crawler

count=0
for url in "${URLS[@]}"; do
    count=$((count + 1))
    echo "[$count/${#URLS[@]}] Crawling $url..."
    python -u crawler-ieltswriting.py "$url" 2>&1 | grep -E "SQL saved|Error|Failed"
    sleep 1  # Rate limiting
done

echo ""
echo "Crawling complete! Total: $count URLs"
