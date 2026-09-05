import { afterEach, describe, expect, it, vi } from 'vitest';
import { BilibiliWebDataSource } from './bilibili';

afterEach(() => vi.unstubAllGlobals());

describe('collection failure semantics', () => {
  it('limits network concurrency across every enrichment endpoint and paginates all archives', async () => {
    let active = 0; let peak = 0;
    const items = Array.from({ length: 25 }, (_, i) => ({ aid: i + 1, bvid: `BV${i}`, title: `Video ${i}`, pubtime: 1700000000, stat: { play: i } }));
    vi.stubGlobal('fetch', async (input: string) => {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      const url = new URL(input);
      const data = url.pathname.endsWith('/archive/index')
        ? { list: items.slice((Number(url.searchParams.get('pn')) - 1) * 20, Number(url.searchParams.get('pn')) * 20), pager: { total: 25 } }
        : url.pathname.endsWith('/compare') ? { list: [] } : {};
      return Response.json({ code: 0, data });
    });
    const result = await new BilibiliWebDataSource().collect('test-session');
    expect(result.videos).toHaveLength(25);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
    expect(result.coverageDetails.warnings.length).toBeGreaterThan(0);
    expect(result.snapshots[0].avgWatchSeconds).toBeNull();
  });

  it('preserves session expiry instead of turning the error envelope into a schema error', async () => {
    const fetcher = vi.fn(async () => Response.json({ code: -101, message: 'not logged in', data: null }));
    vi.stubGlobal('fetch', fetcher);
    await expect(new BilibiliWebDataSource().collect('test-session')).rejects.toThrow('BILIBILI_API_-101');
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('rejects an incomplete archive inventory rather than declaring the returned subset complete', async () => {
    vi.stubGlobal('fetch', async (input: string) => input.includes('/archive/index')
      ? Response.json({ code: 0, data: { list: [], pager: { total: 2 } } })
      : Response.json({ code: 0, data: { list: [] } }));
    await expect(new BilibiliWebDataSource().collect('test-session')).rejects.toThrow('BILIBILI_INVENTORY_INCOMPLETE');
  });
});
