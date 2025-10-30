import { XMLParser } from 'fast-xml-parser';
import { Program, ProgramCategory } from '@/types/program';

// --- Raw types from XML Parser ---
interface RawXmlText {
  '#text': string;
}

interface RawChannel {
  '@_id': string;
  'display-name': string | RawXmlText;
  icon?: {
    '@_src': string;
  };
}

interface RawProgram {
  '@_channel': string;
  '@_start': string;
  '@_stop': string;
  title: string | RawXmlText;
  desc: string | RawXmlText;
  credits?: {
    actor?: (string | RawXmlText)[];
  };
}

// --- Helper Functions ---
const getText = (xmlText: string | RawXmlText | undefined): string => {
  if (!xmlText) return '';
  if (typeof xmlText === 'string') return xmlText;
  if (typeof xmlText === 'object' && '#text' in xmlText) return xmlText['#text'];
  return '';
};

const parseEpgDate = (dateString: string): Date => {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1;
  const day = parseInt(dateString.substring(6, 8), 10);
  const hour = parseInt(dateString.substring(8, 10), 10);
  const minute = parseInt(dateString.substring(10, 12), 10);
  const second = parseInt(dateString.substring(12, 14), 10);
  return new Date(year, month, day, hour, minute, second);
};

const mapEPGCategory = (epgCategory: string): ProgramCategory => {
  if (!epgCategory) return 'Divertissement';
  const cat = epgCategory.toLowerCase();
  if (cat.includes('sport')) return 'Sport';
  if (cat.includes('film') || cat.includes('movie') || cat.includes('cinéma')) return 'Cinéma';
  if (cat.includes('série') || cat.includes('series')) return 'Séries';
  if (cat.includes('news') || cat.includes('info') || cat.includes('actualité')) return 'Actualités';
  if (cat.includes('enfant') || cat.includes('jeunesse') || cat.includes('kids')) return 'Enfants';
  if (cat.includes('documentaire') || cat.includes('documentary')) return 'Documentaires';
  return 'Divertissement';
};

const slugify = (text: string): string => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-');
};

const getLogoUrl = (channelName: string): string | null => {
  if (!channelName) return null;
  const countryExceptions: Record<string, { country: string; suffix: string }> = {
    '2M Maroc': { country: 'morocco', suffix: 'ma' },
  };
  const exception = countryExceptions[channelName];
  const slug = slugify(channelName);
  if (exception) {
    return `https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/${exception.country}/${slug}-${exception.suffix}.png`;
  }
  return `https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/${slug}-fr.png`;
};

// --- Main Service Function ---
export const fetchAndProcessEpg = async (): Promise<{ channels: { id: string; name: string; logo: string | null }[], programs: Program[] }> => {
  const guideUrl = '/epg/guide.xml';
  try {
    const response = await fetch(guideUrl);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const xmlData = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', allowBooleanAttributes: true });
    const jsonData = parser.parse(xmlData);

    const channels: RawChannel[] = jsonData.tv.channel || [];
    const epgPrograms: RawProgram[] = jsonData.tv.programme || [];

    const channelMap = new Map(channels.map((ch) => [ch['@_id'], ch]));
    const logoMap = new Map(channels.map((ch) => [ch['@_id'], getLogoUrl(getText(ch['display-name']))]));

    const programs: Program[] = epgPrograms.map((epgProgram, index) => {
      const channelId = epgProgram['@_channel'];
      const channel = channelMap.get(channelId);
      const startDate = parseEpgDate(epgProgram['@_start']);
      const endDate = parseEpgDate(epgProgram['@_stop']);

      return {
        id: `${channelId}-${epgProgram['@_start']}-${index}`,
        title: getText(epgProgram.title),
        channel: channel ? getText(channel['display-name']) : 'Inconnu',
        category: mapEPGCategory(getText(epgProgram.desc)),
        date: startDate.toLocaleDateString('fr-FR'),
        startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        description: getText(epgProgram.desc),
        image: logoMap.get(channelId) || null,
        duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
        isLive: startDate < new Date() && endDate > new Date(),
        actors: epgProgram.credits?.actor?.map(actor => getText(actor)) || [],
      };
    });

    return {
      channels: channels.map(ch => ({
        id: ch['@_id'],
        name: getText(ch['display-name']),
        logo: ch.icon?.['@_src'] || null,
      })),
      programs: programs,
    };
  } catch (error) {
    console.error('Failed to fetch and process EPG data:', error);
    throw error;
  }
};
