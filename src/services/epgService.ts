import { XMLParser } from 'fast-xml-parser';
import { TvGuide } from '../types';

const API_BASE_URL = '/epg';

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
};

export const fetchTvGuide = async (): Promise<TvGuide> => {
  const guideUrl = `${API_BASE_URL}/guide.xml`;

  try {
    // 1. Télécharger le fichier XML directement
    const response = await fetch(guideUrl);

    if (!response.ok) {
      throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`);
    }

    const xmlData = await response.text();

    // 2. Parser le XML
    const parser = new XMLParser(parserOptions);
    const jsonData = parser.parse(xmlData);

    return jsonData as TvGuide;

  } catch (error) {
    console.error(`Échec de la récupération ou du traitement du guide TV depuis ${guideUrl}:`, error);
    throw error;
  }
};
