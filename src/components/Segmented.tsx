import type { CSSProperties } from 'react';
export function Segmented({ items, value, onChange, label }: { items: string[]; value: string; onChange: (value: string) => void; label: string }) {
  return <div className="iosSegments" role="group" aria-label={label} style={{ '--segments': items.length, '--selected': items.indexOf(value) } as CSSProperties}>
    <span className="segmentThumb" />
    {items.map((item) => <button key={item} aria-pressed={item === value} onClick={() => onChange(item)}>{item}</button>)}
  </div>;
}
