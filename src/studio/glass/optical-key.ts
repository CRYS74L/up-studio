/** Chromium may cache a backdrop filter graph while SVG attributes change.
 * Give each optical configuration its own graph URL so edits are visible. */
export function opticalKey(values:unknown[]){let hash=2166136261;for(const c of JSON.stringify(values)){hash=Math.imul(hash^c.charCodeAt(0),16777619)}return (hash>>>0).toString(36)}
