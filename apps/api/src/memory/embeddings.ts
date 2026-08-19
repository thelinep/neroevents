let embedder: any = null;
async function getEmbedder() {
  if (!embedder) { const { pipeline } = await import('@xenova/transformers'); embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'); }
  return embedder;
}
export async function generateEmbedding(text: string): Promise<number[]> {
  const e = await getEmbedder();
  const result = await e(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}
