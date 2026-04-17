import { Channel } from 'amqplib';
import { ChatbotEmbedMessage } from '@ai-workers/shared/types/messages';
import { createGroqService } from '../services/groq.service';
import { createSupabaseService } from '../services/supabase.service';
import { chunkDocument } from '../services/chunker.service';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

export async function processEmbed(
  msg: ChatbotEmbedMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const supabase = createSupabaseService();

  // Step 1: Chunk document
  const chunks = chunkDocument(msg.content, {
    chunkSize: 1000,
    overlap: 200,
  });

  console.log(`📑 Document split into ${chunks.length} chunks`);

  // Step 2: Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let lastError: unknown;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // Generate embedding
        const embedding = await groq.createEmbedding(chunk);

        // Insert into Supabase
        await supabase.insertDocument({
          content: chunk,
          metadata: {
            ...msg.metadata,
            documentId: msg.documentId,
            chunkIndex: i,
          },
          embedding,
        });

        console.log(`  ✅ Chunk ${i + 1}/${chunks.length} embedded`);
        break;
      } catch (error) {
        lastError = error;
        console.error(`  Attempt ${attempt + 1} failed for chunk ${i + 1}:`, error);

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
          );
        }
      }
    }

    if (lastError) {
      console.error(`Failed to embed chunk ${i + 1} after all retries`);
      throw lastError;
    }
  }

  console.log(`✅ All chunks embedded for document: ${msg.documentId}`);
}
