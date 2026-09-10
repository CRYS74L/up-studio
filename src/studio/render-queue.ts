const jobs = new Map<object, () => void>();
let frame = 0;
function drain() {
  frame = 0;
  const next = jobs.entries().next().value;
  if (!next) return;
  jobs.delete(next[0]);
  next[1]();
  if (jobs.size) frame = requestAnimationFrame(drain);
}
// At most one chart render per frame; repeated resize/update requests coalesce.
export function queueRender(key: object, render: () => void) {
  jobs.set(key, render);
  if (!frame) frame = requestAnimationFrame(drain);
}
export function cancelRender(key: object) { jobs.delete(key); }
