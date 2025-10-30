// Type pour gérer les chaînes de caractères qui peuvent aussi être des objets du parser XML
export type XmlText = string | { '#text': string; '@_lang'?: string };

export interface Channel {
  '@_id': string;
  'display-name': XmlText;
  icon?: {
    '@_src': string;
  };
}

export interface Programme {
  '@_channel': string;
  '@_start': string;
  '@_stop': string;
  title: XmlText;
  desc?: XmlText;
}

export interface TvGuide {
  tv: {
    channel: Channel[];
    programme: Programme[];
  };
}

export interface GuideInfo {
  lang: string;
  url: string;
  name: string;
  site: string;
}
