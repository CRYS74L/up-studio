import { expect, it } from 'vitest';
import { escapeHtml, formatChange, seconds } from './format';
it('rolls rounded seconds into the next minute', () => { expect(seconds(59.9)).toBe('01:00'); });
it('keeps a missing duration missing', () => { expect(seconds(null)).toBe('—'); });
it('escapes a title before it becomes tooltip HTML', () => { expect(escapeHtml('<img src=x>')).toBe('&lt;img src=x&gt;'); });
it('does not round a real change into negative zero', () => {
  expect(formatChange({ current: 1, previous: 1.0001, delta: -.0001, changePercent: -.01, direction: 'down', deltaKind: 'percent' }, 'views')).toBe('↓ <0.1%');
});
it('keeps a small percentage point change visible', () => {
  expect(formatChange({ current: 1.001, previous: 1, delta: .001, changePercent: null, direction: 'up', deltaKind: 'pp' }, 'interaction_rate')).toBe('↑ <0.01 个百分点');
});
