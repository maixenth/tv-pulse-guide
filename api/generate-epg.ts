import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import AdmZip from 'adm-zip';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // 1. Fetch the zip file from the original source
    const zipUrl = 'http://xmltv.xmltv.fr/guide-tnt.zip';
    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch zip file: ${response.statusText}`);
    }
    const zipBuffer = await response.arrayBuffer();

    // 2. Decompress the zip file in memory
    const zip = new AdmZip(Buffer.from(zipBuffer));
    const zipEntries = zip.getEntries();
    const xmlEntry = zipEntries.find(entry => entry.entryName.endsWith('.xml'));

    if (!xmlEntry) {
      throw new Error('No XML file found in the zip archive.');
    }

    const xmlContent = xmlEntry.getData().toString('utf8');

    // 3. Upload the XML content to Vercel Blob
    const { url } = await put('guide.xml', xmlContent, {
      access: 'public',
      contentType: 'application/xml',
    });

    res.status(200).json({ message: 'EPG generated and stored successfully.', url });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'Error generating EPG.', error: errorMessage });
  }
}
