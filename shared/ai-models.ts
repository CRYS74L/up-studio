export const AI_MODELS = ['deepseek-flash', 'deepseek-v4-pro'] as const;
export const AI_EFFORTS = ['low', 'high', 'max'] as const;
export const EFFORT_LABELS = {low:'轻度', high:'高', max:'最高'};
export function currentModel(value: string) {
  return value === 'deepseek-v4-pro' ? value : 'deepseek-flash';
}
export function modelLabel(value: string) {
  return value === 'deepseek-v4-pro' ? 'DeepSeek V4 Pro 0813' : 'DeepSeek V4.1 Flash';
}
export function supportsVision(value: string) { return currentModel(value) === 'deepseek-flash'; }
