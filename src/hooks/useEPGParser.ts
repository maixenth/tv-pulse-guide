import { useState, useEffect } from 'react';

interface EPGProgram {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  channel: string;
  category: string;
  isLive: boolean;
}

const EPG_URL = 'https://xmltvfr.fr/xmltv/xmltv_tnt.xml.gz';
const CACHE_KEY = 'epg-cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export function useEPGParser() {
  const [programs, setPrograms] = useState<EPGProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEPG();
  }, []);

  const loadEPG = async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('Using cached EPG data');
          setPrograms(data);
          setIsLoading(false);
          return;
        }
      }

      console.log('Downloading EPG from xmltvfr.fr...');
      setIsLoading(true);

      // Download gzipped XML
      const response = await fetch(EPG_URL);
      if (!response.ok) throw new Error('Failed to download EPG');

      const gzBlob = await response.blob();
      console.log(`Downloaded ${(gzBlob.size / 1024).toFixed(2)} KB`);

      // Decompress using native DecompressionStream
      const decompressedStream = gzBlob.stream().pipeThrough(
        new DecompressionStream('gzip')
      );
      const decompressedBlob = await new Response(decompressedStream).blob();
      const xmlText = await decompressedBlob.text();
      console.log(`Decompressed to ${(xmlText.length / 1024).toFixed(2)} KB`);

      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const programElements = xmlDoc.getElementsByTagName('programme');
      const now = new Date();
      const parsedPrograms: EPGProgram[] = [];
      const channelProgramCount = new Map<string, number>();
      const maxProgramsPerChannel = 10;

      for (let i = 0; i < programElements.length; i++) {
        const prog = programElements[i];
        const channelId = prog.getAttribute('channel');
        if (!channelId) continue;

        const channelIdLower = channelId.toLowerCase();
        if ((channelProgramCount.get(channelIdLower) || 0) >= maxProgramsPerChannel) continue;

        const startStr = prog.getAttribute('start');
        const stopStr = prog.getAttribute('stop');
        if (!startStr || !stopStr) continue;

        const startTime = parseEPGDate(startStr);
        const endTime = parseEPGDate(stopStr);

        // Only keep current and upcoming programs
        if (endTime < now) continue;

        const titleEl = prog.getElementsByTagName('title')[0];
        const descEl = prog.getElementsByTagName('desc')[0];
        const categoryEl = prog.getElementsByTagName('category')[0];

        const title = titleEl?.textContent || '';
        if (!title) continue;

        const isLive = now >= startTime && now <= endTime;

        parsedPrograms.push({
          id: `${channelId}-${startStr}`,
          title,
          description: descEl?.textContent || '',
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          channel: channelId,
          category: categoryEl?.textContent || 'Général',
          isLive,
        });

        channelProgramCount.set(channelIdLower, (channelProgramCount.get(channelIdLower) || 0) + 1);

        if (parsedPrograms.length >= 1000) break;
      }

      console.log(`Parsed ${parsedPrograms.length} programs`);

      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: parsedPrograms,
        timestamp: Date.now(),
      }));

      setPrograms(parsedPrograms);
      setError(null);
    } catch (err) {
      console.error('EPG parsing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load EPG');
    } finally {
      setIsLoading(false);
    }
  };

  return { programs, isLoading, error, reload: loadEPG };
}

// Parse EPG date format (YYYYMMDDHHMMSS +TZTZ)
function parseEPGDate(epgDate: string): Date {
  const year = parseInt(epgDate.substring(0, 4));
  const month = parseInt(epgDate.substring(4, 6)) - 1;
  const day = parseInt(epgDate.substring(6, 8));
  const hour = parseInt(epgDate.substring(8, 10));
  const minute = parseInt(epgDate.substring(10, 12));
  const second = parseInt(epgDate.substring(12, 14));
  
  return new Date(year, month, day, hour, minute, second);
}
