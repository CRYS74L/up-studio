import React from 'react';
import { createRoot } from 'react-dom/client';
import { StudioApp } from './studio/StudioApp';
import { loadFonts, uiFont } from './fonts';

const root = createRoot(document.getElementById('root')!);
function start() {
  loadFonts(uiFont).then(() => {
    root.render(<React.StrictMode><StudioApp /></React.StrictMode>);
  }).catch(() => {
    root.render(<main role="alert"><p>字体加载失败，请检查连接后重试。</p><button onClick={() => location.reload()}>重新加载</button></main>);
  });
}
start();
