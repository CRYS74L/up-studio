import React from 'react';
import { createRoot } from 'react-dom/client';
import { StudioApp } from './studio/StudioApp';
import { loadFonts, retryFontDownloads, uiFont, manuscriptFont } from './fonts';

const root = createRoot(document.getElementById('root')!);
let starting = false;
function start() {
  if (starting) return;
  starting = true;
  Promise.all([loadFonts(uiFont), loadFonts(manuscriptFont, [500])]).then(() => {
    root.render(<React.StrictMode><StudioApp /></React.StrictMode>);
  }).catch(() => {
    root.render(<main role="alert"><p>字体加载失败，请检查连接后重试。</p><button onClick={() => { if (!starting) { retryFontDownloads(); start(); } }}>重新加载</button></main>);
  }).finally(() => { starting = false; });
}
start();
