import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const xmlPath = path.join(projectRoot, 'public', 'epg', 'guide.xml');
const outputPath = path.join(projectRoot, 'public', 'data.json');

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
};

// Helper to extract text from XML parser's output
const getText = (xmlText) => {
  if (typeof xmlText === 'string') return xmlText;
  if (xmlText && typeof xmlText === 'object' && '#text' in xmlText) return xmlText['#text'];
  return '';
};

// Helper to parse EPG's specific date format (YYYYMMDDHHMMSS)
const parseEpgDate = (dateString) => {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // Month is 0-indexed
  const day = parseInt(dateString.substring(6, 8), 10);
  const hour = parseInt(dateString.substring(8, 10), 10);
  const minute = parseInt(dateString.substring(10, 12), 10);
  const second = parseInt(dateString.substring(12, 14), 10);
  return new Date(year, month, day, hour, minute, second);
};

// Map EPG categories to our app categories
const mapEPGCategory = (epgCategory) => {
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

console.log('Starting data preparation...');

try {
  const xmlData = readFileSync(xmlPath, 'utf-8');
  const parser = new XMLParser(parserOptions);
  const jsonData = parser.parse(xmlData);

  const channels = jsonData.tv.channel || [];
  const epgPrograms = jsonData.tv.programme || [];

  const channelMap = new Map(channels.map(ch => [ch['@_id'], ch]));

  const slugify = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[()]/g, '')          // Remove parentheses
      .replace(/&/g, 'and')          // Replace & with 'and'
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-');        // Replace multiple - with single -
  };

  const getLogoUrl = (channelName) => {
    if (!channelName) return null;
    const slug = slugify(channelName);
    // Assuming most channels are French for this specific EPG
    return `https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/${slug}-fr.png`;
  };

  const logoMap = new Map(channels.map(ch => {
    const name = getText(ch['display-name']);
    return [ch['@_id'], getLogoUrl(name)];
  }));

  const programs = epgPrograms.map((epgProgram, index) => {
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
    };
  });

  const outputData = {
    channels: channels.map(ch => ({
      id: ch['@_id'],
      name: getText(ch['display-name']),
      logo: ch.icon?.['@_src'] || null,
    })),
    programs: programs,
  };

  writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`Data successfully prepared and saved to ${outputPath}`);
} catch (error) {
  console.error('Error during data preparation:', error);
  process.exit(1);
}
