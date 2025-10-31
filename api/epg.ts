import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const epgUrl = process.env.VITE_EPG_API_URL;

  if (!epgUrl) {
    return res.status(500).send('EPG URL is not configured');
  }

  try {
    const response = await fetch(epgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch EPG data: ${response.statusText}`);
    }
    const xmlData = await response.text();
    
    // Set cache headers to optimize performance
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xmlData);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching EPG data');
  }
}
