export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export function chunkDocument(
  content: string,
  options: ChunkOptions = { chunkSize: 1000, overlap: 200 },
): string[] {
  const { chunkSize, overlap } = options;

  if (content.length <= chunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < content.length) {
    let endIndex = startIndex + chunkSize;

    // Try to break at a sentence or paragraph boundary
    if (endIndex < content.length) {
      const breakPoint = findBreakPoint(content, startIndex, endIndex);
      endIndex = breakPoint;
    }

    chunks.push(content.substring(startIndex, endIndex));

    // Move start index with overlap
    startIndex = endIndex - overlap;
    if (startIndex < 0) startIndex = 0;
  }

  return chunks;
}

function findBreakPoint(text: string, start: number, end: number): number {
  // Try to find a paragraph break first
  const paragraphBreak = text.lastIndexOf('\n\n', end);
  if (paragraphBreak > start + 100) {
    return paragraphBreak + 2;
  }

  // Try to find a sentence break
  const sentenceBreaks = ['. ', '! ', '? ', '\n'];
  for (const br of sentenceBreaks) {
    const idx = text.lastIndexOf(br, end);
    if (idx > start + 50) {
      return idx + br.length;
    }
  }

  // Default to chunk size
  return end;
}
