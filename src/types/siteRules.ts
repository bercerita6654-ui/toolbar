export interface PinnedSiteRule {
  id: string;
  domain: string;
  name: string;
  enabled: boolean;
  autoShowToolbar: boolean;
  position?: 'right-center' | 'bottom-right' | 'bottom-left' | 'top-right';
  addedAt: number;
}

export type ToolbarDisplayMode = 'all_sites' | 'specific_sites' | 'manual_trigger';

export interface SiteRulesConfig {
  mode: ToolbarDisplayMode;
  pinnedSites: PinnedSiteRule[];
  defaultPosition: 'right-center' | 'bottom-right' | 'bottom-left' | 'top-right';
  shortcutKey: string;
}

export const DEFAULT_PINNED_SITES: PinnedSiteRule[] = [
  {
    id: 'site_wiki',
    domain: 'wikipedia.org',
    name: 'Wikipedia (Ensiklopedia Bebas)',
    enabled: true,
    autoShowToolbar: true,
    position: 'right-center',
    addedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'site_gh',
    domain: 'github.com',
    name: 'GitHub (Repositori & Kode)',
    enabled: true,
    autoShowToolbar: true,
    position: 'right-center',
    addedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'site_gdocs',
    domain: 'docs.google.com',
    name: 'Google Docs & Workspace',
    enabled: true,
    autoShowToolbar: true,
    position: 'right-center',
    addedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'site_medium',
    domain: 'medium.com',
    name: 'Medium (Artikel & Blog)',
    enabled: true,
    autoShowToolbar: true,
    position: 'right-center',
    addedAt: Date.now(),
  },
  {
    id: 'site_yt',
    domain: 'youtube.com',
    name: 'YouTube (Video & Transkrip)',
    enabled: false,
    autoShowToolbar: false,
    position: 'bottom-right',
    addedAt: Date.now(),
  },
];

export const DEFAULT_SITE_RULES_CONFIG: SiteRulesConfig = {
  mode: 'specific_sites',
  pinnedSites: DEFAULT_PINNED_SITES,
  defaultPosition: 'right-center',
  shortcutKey: 'Alt+Shift+N',
};
