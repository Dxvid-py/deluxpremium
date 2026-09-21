export type PrivacyConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: string;
  updatedAt: string;
};

export const PRIVACY_CONSENT_COOKIE = 'deluxury_cookie_consent_v1';
const VERSION = '1.0';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix));
  if (!item) return null;
  return decodeURIComponent(item.slice(prefix.length));
}

function writeCookie(name: string, value: string, maxAge = MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'SameSite=Lax',
    location.protocol === 'https:' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function getPrivacyConsent(): PrivacyConsent | null {
  const raw = readCookie(PRIVACY_CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PrivacyConsent>;
    if (
      parsed?.necessary !== true ||
      typeof parsed?.analytics !== 'boolean' ||
      typeof parsed?.marketing !== 'boolean'
    ) {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      version: typeof parsed.version === 'string' ? parsed.version : VERSION,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

export function savePrivacyConsent(
  next: Pick<PrivacyConsent, 'analytics' | 'marketing'>,
): PrivacyConsent {
  const consent: PrivacyConsent = {
    necessary: true,
    analytics: next.analytics,
    marketing: next.marketing,
    version: VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeCookie(PRIVACY_CONSENT_COOKIE, JSON.stringify(consent));
  window.dispatchEvent(
    new CustomEvent('deluxury:privacy-consent-changed', { detail: consent }),
  );
  return consent;
}

export function clearOptionalConsent(): void {
  if (typeof document === 'undefined') return;
  writeCookie(PRIVACY_CONSENT_COOKIE, '', 0);
}
