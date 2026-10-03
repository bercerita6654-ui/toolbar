import { SiteRulesConfig, DEFAULT_SITE_RULES_CONFIG, PinnedSiteRule } from '../types/siteRules';

const STORAGE_KEY = 'quicknotes_site_rules_config_v1';

export function getStoredSiteRules(): SiteRulesConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SITE_RULES_CONFIG));
      return DEFAULT_SITE_RULES_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode || 'specific_sites',
      pinnedSites: Array.isArray(parsed.pinnedSites) ? parsed.pinnedSites : DEFAULT_SITE_RULES_CONFIG.pinnedSites,
      defaultPosition: parsed.defaultPosition || 'right-center',
      shortcutKey: parsed.shortcutKey || 'Alt+Shift+N',
    };
  } catch (err) {
    console.error('Error reading site rules:', err);
    return DEFAULT_SITE_RULES_CONFIG;
  }
}

export function saveStoredSiteRules(config: SiteRulesConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('quicknotes-siterules-change'));
  } catch (err) {
    console.error('Error saving site rules:', err);
  }
}

/**
 * Check if the pinned toolbar should be displayed on a given URL or hostname
 */
export function shouldShowToolbarOnSite(urlOrHostname: string, config: SiteRulesConfig): boolean {
  if (config.mode === 'all_sites') {
    return true;
  }
  if (config.mode === 'manual_trigger') {
    return false;
  }

  // specific_sites mode
  const cleanHost = extractCleanHostname(urlOrHostname);
  return config.pinnedSites.some((site) => {
    if (!site.enabled || !site.autoShowToolbar) return false;
    const ruleHost = extractCleanHostname(site.domain);
    return cleanHost === ruleHost || cleanHost.endsWith('.' + ruleHost) || ruleHost.endsWith('.' + cleanHost);
  });
}

/**
 * Helper to extract clean hostname (without https://, path, or www.)
 */
export function extractCleanHostname(input: string): string {
  try {
    let raw = input.trim().toLowerCase();
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = 'https://' + raw;
    }
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return input.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
  }
}
