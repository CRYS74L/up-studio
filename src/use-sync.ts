import { useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from './format';
export function useSync() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['collect'],
    mutationFn: async () => {
      const result = await request<{ run: { status: string; errorCode?: string } }>('/api/bilibili/collect-now', { method: 'POST' });
      if (result.run.status === 'failed') {
        const errors: Record<string, string> = { session_expired: 'B 站登录已失效，请在数据源中重新扫码。', risk_control: 'B 站暂时限制访问，请稍后重试。', schema_changed: 'B 站响应结构发生变化，旧快照已保留。', inventory_incomplete: '稿件清单不完整，本次没有写入，请稍后重试。' };
        throw new Error(errors[result.run.errorCode ?? ''] ?? '本次同步失败，旧快照已保留。请到数据源查看详情。');
      }
      return result.run;
    },
    onSettled: async () => { await client.invalidateQueries(); },
  });
}
