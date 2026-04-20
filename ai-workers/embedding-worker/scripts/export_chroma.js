const { ChromaClient } = require('chromadb');

const DB_PATH = '/home/khoa/Documents/Ielts_Project/Data/embeddings/chromadb';
const OUTPUT_DIR = '/home/khoa/Documents/Ielts_Project/Data/embeddings/exports';

async function exportCollections() {
  console.log('Connecting to ChromaDB server...');
  const client = new ChromaClient({
    host: 'localhost',
    port: 8000,
    headers: {
      'X-Chroma-Tenant': 'default_tenant',
      'X-Chroma-Database': 'default_database'
    }
  });

  const fs = require('fs');
  const path = require('path');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    const collections = await client.listCollections();
    console.log('Collections found:', collections.map(c => c.name));

    for (const collection of collections) {
      console.log(`\nProcessing collection: ${collection.name}`);

      try {
        const col = await client.getCollection({ name: collection.name });
        const count = await col.count();
        console.log(`  Count: ${count}`);

        if (count === 0) {
          console.log('  Skipping - no embeddings');
          continue;
        }

        // Export via get - batch to avoid OOM
        const BATCH_SIZE = 1000;
        let offset = 0;
        let allData = [];

        while (offset < count) {
          const batch = await col.get({
            limit: BATCH_SIZE,
            offset: offset,
            include: ['embeddings', 'metadatas', 'documents']
          });

          if (batch.ids && batch.ids.length > 0) {
            const batchData = batch.ids.map((id, i) => ({
              id,
              embedding: batch.embeddings?.[i] || null,
              metadata: batch.metadatas?.[i] || null,
              document: batch.documents?.[i] || null
            }));
            allData.push(...batchData);
          }

          offset += BATCH_SIZE;
          console.log(`  Fetched ${allData.length}/${count}`);

          if (batch.ids.length < BATCH_SIZE) break;
        }

        // Write to file
        const outputPath = path.join(OUTPUT_DIR, `export_${collection.name}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
        console.log(`  Exported to: ${outputPath} (${allData.length} records)`);

      } catch (err) {
        console.error(`  Error processing ${collection.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error listing collections:', err.message);
  }

  console.log('\nDone!');
}

exportCollections().catch(console.error);