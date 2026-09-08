import {useState} from 'react';
import {Preferences} from './Preferences';
import {Segments} from './ui';
export function SettingsPage(){const [section,setSection]=useState('AI设置');return <div className="s-settings-page"><Segments label="设置分类" items={['AI设置','数据导出']} value={section} onChange={setSection}/><section key={section} className="s-panel s-content-enter"><Preferences section={section==='AI设置'?'ai':'export'}/></section></div>}
