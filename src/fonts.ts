import './fonts.css';

export const uiFont = 'UP Studio UI';
export const chartFont = 'UP Studio Chart';
export const cloudFont = 'UP Studio Cloud';

const pending = new Map<string, Promise<void>>();

// Canvas must measure with the final font; a later CSS font swap cannot fix its layout.
export function loadFonts(family: string): Promise<void> {
  const existing = pending.get(family);
  if (existing) return existing;
  const ready = Promise.all([400, 700].map(weight =>
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
