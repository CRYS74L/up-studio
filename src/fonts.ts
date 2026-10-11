import './fonts.css';

export const uiFont = 'UP Studio UI';
export const manuscriptFont = 'UP Studio Manuscript';
export const chartFont = 'UP Studio Chart';
export const cloudFont = 'UP Studio Cloud';

const pending = new Map<string, Promise<void>>();

// WebKit can retain a failed font resource across a document reload.
export function retryFontDownloads(): void {
  const retry = String(Date.now());
  const refresh = (value: string): string => {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/fonts/')) return value;
    url.searchParams.set('font-retry', retry);
    return url.href;
  };
  for (const sheet of document.styleSheets) {
    if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
    for (const rule of sheet.cssRules) if (rule instanceof CSSFontFaceRule) {
      const src = rule.style.getPropertyValue('src');
      const next = src.replace(/url\((['"]?)(.*?)\1\)/g, (_match, _quote, url) => `url("${refresh(url)}")`);
      if (next !== src) rule.style.setProperty('src', next);
    }
  }
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel=preload][as=font]')) {
    const next = refresh(link.href);
    if (next !== link.href) link.href = next;
  }
  pending.clear();
}

// Canvas must measure with the final font; a later CSS font swap cannot fix its layout.
export function loadFonts(family: string, weights = [400, 700]): Promise<void> {
  const existing = pending.get(family);
  if (existing) return existing;
  const ready = Promise.all(weights.map(weight =>
    document.fonts.load(`${weight} 14px "${family}"`, '创作 UP 0123456789'),
  )).then(faces => {
    if (faces.some(result => result.length === 0)) throw new Error(`Font unavailable: ${family}`);
  }).catch(error => {
    pending.delete(family);
    throw error;
  });
  pending.set(family, ready);
  return ready;
}
