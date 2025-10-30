import express from 'express';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';
import path from 'path';
import cors from 'cors';
import cron from 'node-cron';
import { exec } from 'child_process';

const app = express();
const port = 3001;

const EPG_GRABBER_COMMAND = 'npx epg-grabber --channels=france --output=./public/epg/guide.xml';

const runEpgGrabber = () => {
  console.log('Running EPG Grabber...');
  exec(EPG_GRABBER_COMMAND, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing EPG Grabber: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`EPG Grabber stderr: ${stderr}`);
      return;
    }
    console.log(`EPG Grabber stdout: ${stdout}`);
    console.log('EPG data updated successfully.');
  });
};

// Run once on server start
runEpgGrabber();

// Schedule to run every hour
cron.schedule('0 * * * *', () => {
  console.log('Scheduled EPG grabber task running...');
  runEpgGrabber();
});

app.use(cors());

// --- Data Processing Logic (from prepare-data.js) ---
const getText = (xmlText) => {
  if (typeof xmlText === 'string') return xmlText;
  if (xmlText && typeof xmlText === 'object' && '#text' in xmlText) return xmlText['#text'];
  return '';
};

const parseEpgDate = (dateString) => {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1;
  const day = parseInt(dateString.substring(6, 8), 10);
  const hour = parseInt(dateString.substring(8, 10), 10);
  const minute = parseInt(dateString.substring(10, 12), 10);
  const second = parseInt(dateString.substring(12, 14), 10);
  return new Date(year, month, day, hour, minute, second);
};

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

const slugify = (text) => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const getLogoUrl = (channelName) => {
  if (!channelName) return null;
  const countryExceptions = {
    '2M Maroc': { country: 'morocco', suffix: 'ma' },
  };
  const exception = countryExceptions[channelName];
  const slug = slugify(channelName);
  if (exception) {
    return `https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/${exception.country}/${slug}-${exception.suffix}.png`;
  }
  return `https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/${slug}-fr.png`;
};

const processEpgData = () => {
  const projectRoot = path.resolve(process.cwd());
  const xmlPath = path.join(projectRoot, 'public', 'epg', 'guide.xml');
  if (!readFileSync(xmlPath)) {
    throw new Error('guide.xml not found or is empty. EPG Grabber may have failed.');
  }
  const xmlData = readFileSync(xmlPath, 'utf-8');
  
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', allowBooleanAttributes: true });
  const jsonData = parser.parse(xmlData);

  const channels = jsonData.tv.channel || [];
  const epgPrograms = jsonData.tv.programme || [];

  const channelMap = new Map(channels.map(ch => [ch['@_id'], ch]));
  const logoMap = new Map(channels.map(ch => [ch['@_id'], getLogoUrl(getText(ch['display-name']))]));

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
};

// --- API Endpoint ---
app.get('/api/epg', (req, res) => {
  try {
    console.log('API call to /api/epg received. Processing data...');
    const data = processEpgData();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/epg:', error);
    res.status(500).json({ error: 'Failed to process EPG data.' });
  }
});

app.listen(port, () => {
  console.log(`EPG server listening at http://localhost:${port}`);
});
