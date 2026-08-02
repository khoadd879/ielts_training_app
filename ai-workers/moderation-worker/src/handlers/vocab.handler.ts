import axios from 'axios';
import { ai } from '../gemini.client';
import { redis, ensureRedis } from '../redis.client';
import { VocabSuggestMessage } from '../../../shared/src/types/messages';

export async function handleVocabSuggest(payload: VocabSuggestMessage): Promise<void> {
  await ensureRedis();
  const { jobId, word } = payload;

  // 1. Dictionary API
  let phonetic: string | null = null;
  let example: string | null = null;
  try {
    const dictResp = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      timeout: 5000,
    });
    const dict = Array.isArray(dictResp.data) ? dictResp.data[0] : null;
    phonetic = dict?.phonetic ?? null;
    example = dict?.meanings?.[0]?.definitions?.[0]?.example ?? null;
  } catch (err) {
    console.warn('Dictionary API failed, continuing with Gemini only:', err);
  }

  // 2. Gemini
  const prompt = `Provide JSON for the English word "${word}":
{
  "phonetic": "<IPA or null>",
  "meaning": "<Vietnamese meaning>",
  "example": "<English example sentence>",
  "loaiTuVung": "<NOUN/VERB/ADJ/ADV>",
  "level": "<A1|A2|B1|B2|C1|C2 or null>"
}`;
  const geminiResp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const raw = geminiResp.text?.trim() ?? '';
  const cleaned = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();

  let parsed: { phonetic?: string; meaning?: string; example?: string; loaiTuVung?: string; level?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini returned invalid JSON:', err, cleaned);
    throw new Error('invalid_gemini_json');
  }

  const result = {
    word,
    phonetic: phonetic ?? parsed.phonetic ?? null,
    example: example ?? parsed.example ?? null,
    meaning: parsed.meaning ?? null,
    loaiTuVung: parsed.loaiTuVung?.toUpperCase() ?? null,
    level: parsed.level ?? null,
  };

  // 3. Cache
  await redis.set(`vocab:${word}`, JSON.stringify(result), { EX: 86400 });
  await redis.set(`vocab-job:${word}:${jobId}`, JSON.stringify(result), { EX: 300 });
  await redis.del(`vocab-job-active:${word}`);
}
