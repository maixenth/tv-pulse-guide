import { list } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // 1. Find the blob entry for guide.xml
    const { blobs } = await list({ prefix: 'guide.xml', limit: 1 });
    if (blobs.length === 0) {
      return res.status(404).send('EPG file not found. It may not have been generated yet.');
    }
    const [epgBlob] = blobs;

    // 2. Fetch the content from the blob URL
    const response = await fetch(epgBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch EPG from blob: ${response.statusText}`);
    }
    const xmlData = await response.text();

    // 3. Send the content with appropriate headers
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xmlData);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching EPG data from blob.');
  }
}
