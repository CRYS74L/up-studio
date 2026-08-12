export type DemoVideo = {
  id: string; title: string; short: string; category: string; published: string;
  views: number; ctr: number; retention: number; followers: number; engagement: number;
  avgWatch: number; duration: number; velocity: number; cover: string; accent: string;
};

export const videos: DemoVideo[] = [
  { id:'1', title:'戴上 Vision Pro 去街头挑战，路人反应太真实了', short:'Vision Pro 街头挑战', category:'数码', published:'08-09 18:26', views:7985, ctr:4.8, retention:45.1, followers:33, engagement:15.8, avgWatch:42, duration:93, velocity:1.22, cover:'VISION\nPRO', accent:'#ff7d87' },
  { id:'2', title:'用了一个月后，我为什么卖掉了它？', short:'一个月真实体验', category:'数码', published:'08-05 20:00', views:12840, ctr:6.3, retention:61.4, followers:86, engagement:12.4, avgWatch:76, duration:124, velocity:.72, cover:'真实\n体验', accent:'#7367f0' },
  { id:'3', title:'只有科技宅才懂的十个瞬间', short:'科技宅的十个瞬间', category:'知识', published:'07-30 17:30', views:5630, ctr:2.1, retention:68.2, followers:24, engagement:18.3, avgWatch:65, duration:95, velocity:.38, cover:'十个\n瞬间', accent:'#00a6a6' },
  { id:'4', title:'2026 年最值得买的桌面好物', short:'桌面好物清单', category:'数码', published:'07-25 12:00', views:21740, ctr:7.1, retention:39.3, followers:119, engagement:10.2, avgWatch:58, duration:148, velocity:1.47, cover:'桌面\n好物', accent:'#ff9f43' },
  { id:'5', title:'我把工作流交给 AI 七天之后', short:'AI 工作流七日记', category:'科技', published:'07-18 19:15', views:9320, ctr:5.4, retention:54.9, followers:71, engagement:14.6, avgWatch:84, duration:153, velocity:.96, cover:'AI\n七日记', accent:'#247bff' },
  { id:'6', title:'这台迷你主机，藏着一个惊喜', short:'迷你主机惊喜', category:'数码', published:'07-12 18:00', views:4160, ctr:3.3, retention:32.7, followers:12, engagement:9.7, avgWatch:31, duration:95, velocity:.24, cover:'一个\n惊喜', accent:'#27ae60' },
  { id:'7', title:'把整个房间变成一块屏幕', short:'房间变屏幕', category:'科技', published:'07-03 21:00', views:15480, ctr:6.8, retention:57.2, followers:95, engagement:16.1, avgWatch:72, duration:126, velocity:1.31, cover:'空间\n屏幕', accent:'#d64ad8' },
  { id:'8', title:'年轻人的第一台相机怎么选', short:'第一台相机', category:'摄影', published:'06-28 10:00', views:6840, ctr:1.7, retention:29.8, followers:18, engagement:8.5, avgWatch:44, duration:148, velocity:.34, cover:'第一台\n相机', accent:'#68737d' }
];

export const trend = [0,80,145,190,270,290,360,455,530,520,612,701,760,735,690,655,630,660,648,672,650,690,668,704];

