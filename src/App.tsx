import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  EyeOff,
  FileChartColumn,
  FlaskConical,
  Home,
  KeyRound,
  Layers3,
  ListFilter,
  Map,
  Menu,
  Minus,
  Moon,
  Play,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Unplug,
  Upload,
  X,
} from "lucide-react";
import { echarts } from "./charts";
import {
  analysisMetricGroups,
  median,
  normalizeMetricValues,
  quadrantLabels,
  type AnalysisVisual,
} from "./dashboard-model";
import {
  applyTheme,
  getInitialTheme,
  transitionTheme,
  type Theme,
} from "./theme";
import "./styles.css";

import type { Video, CoverageDetails, Acquisition, Summary } from "./types";
import { request, compact, percent, score, seconds, date, coverSrc, escapeHtml } from "./format";
import { Chart } from "./components/Chart";
import { OverviewPage } from "./pages/Overview";
import { useRoute } from "./use-route";
import "./ios.css";
import { Segmented } from "./components/Segmented";
import { useDashboardData } from "./use-dashboard-data";
import { SnapshotExport } from "./components/SnapshotExport";
import { useSync } from "./use-sync";
import { Insights } from "./pages/Insights";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});
const PINK = "#F35B8D";
const PINK_BRIGHT = "#FF9AB8";
const PINK_DARK = "#D64778";
const PINK_SOFT = "rgba(255,102,153,.16)";
const BILI_CYAN = "#00A1D6";
const BILI_CYAN_SOFT = "rgba(0,161,214,.14)";
function Logo() {
  return (
    <div className="logo">
      <div className="logoMark">
        <Play size={18} fill="currentColor" />
      </div>
      <div>
        <b>创作空间</b>
        <span>哔哩哔哩数据看板</span>
      </div>
    </div>
  );
}
const nav = [
  ["概览", Home],
  ["内容吸引力矩阵", Map],
  ["稿件", FileChartColumn],
  ["联合分析", BarChart3],
  ["数据源", Database],
] as const;
function Sidebar({
  page,
  setPage,
}: {
  page: string;
  setPage: (p: string) => void;
}) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        {nav.map(([label, Icon]) => (
          <button
            aria-current={page === label ? "page" : undefined}
            className={page === label ? "active" : ""}
            onClick={() => setPage(label)}
            key={label}
          >
            <Icon />
            <span>{label === "内容吸引力矩阵" ? "内容矩阵" : label}</span>
          </button>
        ))}
      </nav>
      <div className="sideBottom">

        <button
          className={page === "设置" ? "active" : ""}
          onClick={() => setPage("设置")}
        >
          <Settings />
          <span>设置</span>
        </button>
        <div className="profile">
          <div className="avatar">私</div>
          <div>
            <b>私人工作区</b>
            <span>个人数据 · 私密工作区</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
function Topbar({ theme, setTheme, onAI, page, navigate }: {
  theme: Theme; setTheme: (t: Theme, e: React.MouseEvent) => void;
  onAI: () => void; summary?: Summary; page: string; navigate: (page: string) => void;
}) {
  const sync = useSync();
  const subtitles: Record<string, string> = { 概览: "每一份创作，都值得被看见。", 稿件: "回到作品本身，读懂每一次反馈。", 内容吸引力矩阵: "从吸引力到观看深度，找到内容的坐标。", 联合分析: "让指标彼此连接，让判断更有依据。", 数据源: "清楚知道数据来自哪里，更新到何时。", 设置: "按你的方式，管理创作空间。" };
  return <header className="iosHeader"><div className="iosTitle"><h1>{page === "内容吸引力矩阵" ? "内容矩阵" : page}</h1><p>{subtitles[page]}</p></div>
    <div className="iosHeaderActions"><button className="glassCircle" aria-label="切换深浅色" onClick={(e) => setTheme(theme === "light" ? "dark" : "light", e)}>{theme === "light" ? <Sun /> : <Moon />}</button>
    <button className="glassCircle" aria-label="查看创作建议" title="基于当前快照的本地诊断" onClick={onAI}><Sparkles /></button>
    <button className="syncCapsule" disabled={sync.isPending} onClick={() => sync.mutate()}><RefreshCw className={sync.isPending ? "spin" : ""} /><span>{sync.isPending ? "同步中" : "同步数据"}</span></button></div>
    {(sync.error || sync.data) && <div className={`syncNotice ${sync.error ? "error" : ""}`} role="status">{sync.error ? sync.error.message : sync.data?.status === "skipped" ? "已有采集任务正在运行" : sync.data?.status === "partial" ? "同步完成，部分指标暂不可用" : "已获取最新快照"}<button onClick={() => navigate("数据源")}>查看详情</button><button aria-label="关闭同步提示" onClick={() => sync.reset()}><X /></button></div>}
  </header>;
}
function PageIntro({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="pageIntro">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions}
    </div>
  );
}
function EmptyState({
  title = "还没有真实数据",
  body = "请前往「数据源」，在看板内扫码连接 B 站，然后运行第一次采集。",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="empty panel">
      <Database />
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}
const coverageMetricLabels: Record<string, string> = {
  views: "播放量",
  coverAttractionScore: "封标吸引力评分",
  avgWatchSeconds: "平均播放时长",
  avgWatchPercent: "平均播放百分比",
  followersGained: "涨粉量",
  likes: "点赞",
  comments: "评论",
  danmaku: "弹幕",
  favorites: "收藏",
  coins: "投币",
  shares: "分享",
  threeSecondBounceRate: "3 秒跳出率",
  interactionRate: "互动率",
  playToFollowRate: "播转粉率",
  fanAudiencePercent: "粉丝观众占比",
  guestAudiencePercent: "游客观众占比",
};
const plannedMetricLabels: Record<string, string> = {
  absoluteCoverCtr: "封面点击率绝对值（B 站当前仅返回动态脱敏内部值）",
  impressions: "曝光量",
  retentionCurve: "留存曲线",
  trafficSources: "流量来源",
  recommendationTrafficSources: "推荐 / 搜索等流量来源",
  viewerArea: "观众地区",
  viewerGender: "观众性别",
  viewerAge: "观众年龄",
  realtimePlays: "实时播放",
};
const capabilityLabels: Record<string, string> = {
  archive: "稿件列表",
  compare: "稿件对比",
  overview: "数据总览",
  diagnose: "播放诊断",
  playTrend: "播放趋势",
  fanTrend: "涨粉趋势",
  realtime: "实时播放",
  retention: "留存曲线",
  archiveView: "单稿元数据",
  terminalSources: "播放终端来源",
};
function SourceFieldSummary({ details }: { details: CoverageDetails }) {
  const sourceCount = details.sourceFields
    ? new Set([
        ...details.sourceFields.archiveStat,
        ...details.sourceFields.compareStat,
        ...details.sourceFields.diagnose,
        ...details.sourceFields.overviewStat,
        ...details.sourceFields.overview,
        ...(details.sourceFields.trend || []),
        ...(details.sourceFields.realtime || []),
        ...(details.sourceFields.retention || []),
      ]).size
    : 0;
  if (!sourceCount) return null;
  return (
    <div className="sourceFieldSummary">
      <b>{sourceCount}</b>
      <span>类源字段已保存</span>
      <small>数值指标动态入库，观众画像与播放构成结构化保存</small>
    </div>
  );
}
function CoverageNotice({
  acquisition,
  compactView = false,
}: {
  acquisition?: Acquisition | null;
  compactView?: boolean;
}) {
  if (!acquisition || acquisition.status === "success" || (acquisition.status === "failed" && !acquisition.details?.totalVideos)) return null;
  const details = acquisition.details;
  const total = details?.totalVideos || 0;
  const incomplete = details?.missingByVideo?.length || 0;
  return (
    <section className="coverageNotice" role="status">
      <div className="coverageNoticeHead">
        <div>
          <b>本轮数据未达到完整覆盖</b>
          <span>
            {acquisition.status === "failed"
              ? "采集失败"
              : `${total} 篇稿件中 ${incomplete} 篇仍有指标未返回`}
          </span>
        </div>
        <span className="coverageBadge">
          {percent((acquisition.coverage || 0) * 100)} 稿件接口覆盖
        </span>
      </div>
      {!compactView && details && (
        <>
          {(details.warnings?.length || 0) > 0 && (
            <ul className="coverageWarnings">
              {details.warnings!.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          {details.capabilityCounts && (
            <div className="capabilityCoverage">
              {Object.entries(details.capabilityCounts).map(([key, value]) => (
                <span className={value.available === value.total ? "complete" : "missing"} key={key}>
                  {capabilityLabels[key] || key} {value.available}/{value.total}
                </span>
              ))}
            </div>
          )}
          <div className="coverageMetrics">
            {Object.entries(details.metricCounts || {}).map(([key, count]) => (
              <span
                className={count === total ? "complete" : "missing"}
                key={key}
              >
                {coverageMetricLabels[key] || key} {count}/{total}
              </span>
            ))}
          </div>
          {(details.missingByVideo?.length || 0) > 0 && (
            <details>
              <summary>查看缺失稿件与原因</summary>
              <ul>
                {details.missingByVideo!.map((video) => (
                  <li key={video.bvid}>
                    <b>{video.title}</b>
                    <span>
                      {video.missing
                        .map((key) => coverageMetricLabels[key] || key)
                        .join("、")}{" "}
                      ·{" "}
                      {video.reasons
                        .map((reason) =>
                          reason === "overview_request_failed"
                            ? "详情接口失败"
                            : reason ===
                                "compare_request_failed_or_not_returned"
                              ? "诊断接口未返回"
                              : "B 站响应未包含字段",
                        )
                        .join("、")}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
const useData = useDashboardData;
function performanceOption(
  videos: Video[],
  x: keyof Video = "cover_ctr",
  y: keyof Video = "avg_watch_percent",
  size: keyof Video = "views",
  selectedId?: string,
) {
  const dark = document.documentElement.dataset.theme === "dark";
  const plottable = videos.filter(
    (v) =>
      v[x] != null &&
      v[y] != null &&
      Number.isFinite(Number(v[x])) &&
      Number.isFinite(Number(v[y])),
  );
  const xs = plottable.map((v) => Number(v[x]));
  const ys = plottable.map((v) => Number(v[y]));
  const stableAxis = (metric: keyof Video, values: number[]) => {
    const maxValue = Math.max(0, ...values);
    if (metric === "cover_ctr") return { min: 0, max: 5, interval: 1 };
    if (metric === "avg_watch_percent") return { min: 0, max: Math.max(80, Math.ceil(maxValue / 10) * 10), interval: 10 };
    if (metric === "avg_watch_seconds") return { min: 0, max: Math.max(120, Math.ceil(maxValue / 30) * 30) };
    return { min: 0, max: Math.max(10, Math.ceil(maxValue * 1.1 / 10) * 10) };
  };
  const xRange = stableAxis(x, xs);
  const yRange = stableAxis(y, ys);
  const separated = (() => {
    const placed: Array<{ x: number; y: number }> = [];
    const spanX = Math.max(1, xRange.max - xRange.min);
    const spanY = Math.max(1, yRange.max - yRange.min);
    return plottable
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((video) => {
        const rawX = Number(video[x]);
        const rawY = Number(video[y]);
        const baseX = ((rawX - xRange.min) / spanX) * 1000;
        const baseY = ((rawY - yRange.min) / spanY) * 620;
        let best = { x: baseX, y: baseY };
        for (let step = 0; step < 40; step += 1) {
          const angle = step * 2.399963229728653;
          const distance = step === 0 ? 0 : 10 + 7 * Math.sqrt(step);
          const candidate = { x: baseX + Math.cos(angle) * distance, y: baseY + Math.sin(angle) * distance };
          if (placed.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= 48)) {
            best = candidate;
            break;
          }
        }
        placed.push(best);
        return {
          video,
          offsetX: (best.x - baseX) / 1000 * spanX,
          offsetY: (best.y - baseY) / 620 * spanY,
        };
      });
  })();
  const xMid = median(xs) ?? 0;
  const yMid = median(ys) ?? 0;
  return {
    animationDuration: 420,
    animationEasing: "cubicOut",
    grid: { left: 54, right: 24, top: 50, bottom: 48 },
    tooltip: {
      trigger: "item",
      confine: true,
      appendToBody: false,
      extraCssText: "max-width:280px;white-space:normal;overflow-wrap:anywhere;line-height:1.55;",
      formatter: (p: any) => {
        const formatAxisValue = (metric: keyof Video, value: number | null | undefined) => {
          if (value == null || !Number.isFinite(value)) return "—";
          if (metric === "cover_ctr") return score(value, 1);
          if (metric === "avg_watch_percent") return percent(value, 1);
          if (metric === "avg_watch_seconds") return seconds(value);
          return compact(value);
        };
        return `<b>${escapeHtml(String(p.data.title))}</b><br/>${metricLabels[x]} ${formatAxisValue(x, p.data.sourceValue?.[0])} · ${metricLabels[y]} ${formatAxisValue(y, p.data.sourceValue?.[1])}<br/>${metricLabels[size]} ${formatAxisValue(size, p.value[2])}`;
      },
    },
    xAxis: {
      name: metricLabels[x],
      ...xRange,
      axisLabel: {
        color: dark ? "#C9CCD0" : "#61666D",
        formatter: (v: number) => (x === "cover_ctr" ? `${v}星` : v),
      },
      splitLine: {
        lineStyle: { type: "dashed", color: dark ? "#313746" : "#dfe5ed" },
      },
    },
    yAxis: {
      name: metricLabels[y],
      ...yRange,
      axisLabel: {
        color: dark ? "#C9CCD0" : "#61666D",
        formatter: (v: number) => (y === "avg_watch_percent" ? `${v}%` : v),
      },
      splitLine: {
        lineStyle: { type: "dashed", color: dark ? "#313746" : "#dfe5ed" },
      },
    },
    series: [
      {
        type: "scatter",
        silent: true,
        symbolSize: 0,
        data: [],
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: dark ? "rgba(255,255,255,.28)" : "rgba(97,102,109,.25)", type: "dashed", width: 1 },
          data: [{ xAxis: xMid }, { yAxis: yMid }],
        },
      },
      {
        type: "custom",
        emphasis: { disabled: true },
        blur: { itemStyle: { opacity: 1 } },
        data: separated.map(({ video: v, offsetX, offsetY }) => ({
          value: [
            Number(v[x]) + offsetX,
            Number(v[y]) + offsetY,
            v[size] == null ? 1 : Number(v[size]),
          ],
          sourceValue: [Number(v[x]), Number(v[y])],
          title: v.title,
          videoId: v.id,
        })),
        renderItem: (params: any, api: any) => {
          const data = separated[params.dataIndex]?.video || plottable[0];
          const point = api.coord([api.value(0), api.value(1)]);
          const selected = data?.id === selectedId;
          const radius = 22;
          return {
            type: "group",
            z2: selected ? 20 : 1,
            children: [
              {
                type: "circle",
                shape: {
                  cx: point[0],
                  cy: point[1],
                  r: radius + 3,
                },
                style: {
                  fill: selected
                    ? "rgba(251,114,153,.22)"
                    : "rgba(255,139,148,.30)",
                },
              },
              {
                type: "image",
                style: {
                  image: location.origin + coverSrc(data, "thumb"),
                  x: point[0] - radius,
                  y: point[1] - radius,
                  width: radius * 2,
                  height: radius * 2,
                },
                clipPath: {
                  type: "circle",
                  shape: { cx: point[0], cy: point[1], r: radius },
                },
              },
              {
                type: "circle",
                shape: { cx: point[0], cy: point[1], r: radius + 1 },
                style: {
                  fill: "transparent",
                  stroke: selected ? PINK : "#fff",
                  lineWidth: selected ? 3 : 1.5,
                  shadowBlur: selected ? 12 : 7,
                  shadowColor: selected
                    ? "rgba(251,114,153,.38)"
                    : "rgba(33,54,88,.18)",
                },
              },
            ],
          };
        },
      } as any,
      {
        type: "scatter",
        data: [],
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: dark ? "#6d7480" : "#b8c2d0" },
          data: [{ xAxis: xMid }, { yAxis: yMid }],
        },
      },
    ],
  };
}
const metricLabels: Record<string, string> = {
  views: "播放量",
  cover_ctr: "封标吸引力评分",
  avg_watch_seconds: "平均播放时长",
  avg_watch_percent: "平均播放百分比",
  followers_gained: "涨粉量",
  duration_seconds: "视频时长",
  published_at: "发布时间",
};
function metricWindow(video: Video) {
  return video.captured_at ? `${date(video.captured_at)} 采集 · 稿件对比口径` : "B 站稿件对比口径";
}
function PerformanceMapPage() {
  const { summary, videos, pending, error } = useData();
  const [x, setX] = useState<keyof Video>("cover_ctr");
  const [y, setY] = useState<keyof Video>("avg_watch_percent");
  const [size, setSize] = useState<keyof Video>("views");
  const [selected, setSelected] = useState<Video | null>(null);
  const option = useMemo(
    () => performanceOption(videos, x, y, size, selected?.id),
    [videos, x, y, size, selected?.id],
  );
  const events = useMemo(
    () => ({
      click: (p: any) => {
        const video = videos.find((item) => item.id === p.data?.videoId);
        if (video) setSelected(video);
      },
    }),
    [videos],
  );
  const plottable = videos.filter(
    (video) => video[x] != null && video[y] != null,
  ).length;
  if (pending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <>
      <PageIntro
        eyebrow="用封面吸引力与观看承接定位内容"
        title="封面吸引力 × 观看深度矩阵"
        actions={
          <div className="mapControls">
            <Select value={x} setValue={(v) => setX(v as keyof Video)} />
            <Select value={y} setValue={(v) => setY(v as keyof Video)} />
            <Select value={size} setValue={(v) => setSize(v as keyof Video)} />
          </div>
        }
      />
      {!summary?.configured ? (
        <EmptyState />
      ) : (
        <>
          <CoverageNotice acquisition={summary.acquisition} compactView />
          <div className="mapWorkspace">
            <section className="panel mapStandalone">
              <div className="mapLegend">
                <span>越靠右：{metricLabels[x]}越高</span>
                <span>越靠上：{metricLabels[y]}越高</span>
                <span>封面圆点固定尺寸；{metricLabels[size]}仅在提示中展示</span>
                <span>近邻稿件已做确定性轻微避让</span>
                <span
                  className={
                    plottable === videos.length
                      ? "coverageComplete"
                      : "coverageMissing"
                  }
                >
                  {plottable}/{videos.length} 篇可绘制
                </span>
              </div>
              <div className="matrixChartFrame">
                {x === "cover_ctr" && y === "avg_watch_percent" && (
                  <div className="matrixQuadrants" aria-label="矩阵象限说明">
                    {quadrantLabels.map((label, index) => <span className={`quadrant q${index + 1}`} key={label}>{label}</span>)}
                  </div>
                )}
                <Chart className="mapChart" option={option} events={events} />
              </div>
            </section>
            <VideoInspector
              video={
                selected ||
                videos.find((video) => video[x] != null && video[y] != null) ||
                videos[0]
              }
            />
          </div>
        </>
      )}
    </>
  );
}
function Select({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label>
      <span>
        {value === "cover_ctr"
          ? "横轴"
          : value === "avg_watch_percent"
            ? "纵轴"
            : "参考"}
      </span>
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        {Object.entries(metricLabels)
          .filter(([id]) => !["published_at"].includes(id))
          .map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
      </select>
    </label>
  );
}
function VideoInspector({ video }: { video?: Video }) {
  if (!video)
    return (
      <aside className="panel inspector">
        <p>点选气泡查看稿件</p>
      </aside>
    );
  return (
    <aside className="panel inspector">
      <img className="inspectorCover" src={coverSrc(video)} />
      <p>已选稿件</p>
      <h2>{video.title}</h2>
      <div className="metricGrid">
        <Metric label="播放" value={compact(video.views)} />
        <Metric label="吸引力" value={score(video.cover_ctr)} />
        <Metric label="平均进度" value={percent(video.avg_watch_percent)} />
        <Metric label="平均时长" value={seconds(video.avg_watch_seconds)} />
        <Metric label="涨粉" value={compact(video.followers_gained)} />
        <Metric
          label="3 秒跳出"
          value={percent(video.metrics.threeSecondBounceRate)}
        />
      </div>
      <small>数据关联诊断，不代表因果关系</small>
    </aside>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label === "内容吸引力矩阵" ? "内容矩阵" : label}</span>
      <b>{value}</b>
    </div>
  );
}
function VideosPage() {
  const { summary, videos, pending, error } = useData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("published");
  const [selected, updateSelected] = useState<string | null>(() => new URLSearchParams(location.hash.split("?")[1]).get("video"));
  useEffect(() => {
    const syncSelection = () => updateSelected(new URLSearchParams(location.hash.split('?')[1]).get('video'));
    window.addEventListener('hashchange', syncSelection);
    return () => window.removeEventListener('hashchange', syncSelection);
  }, []);
  const setSelected = (id: string) => { updateSelected(id); history.replaceState(null, "", `#videos?video=${encodeURIComponent(id)}`); };
  const shown = useMemo(
    () =>
      videos
        .filter((v) => `${v.title} ${v.bvid}`.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) =>
          sort === "views"
            ? (b.views || 0) - (a.views || 0)
            : sort === "followers"
              ? (b.followers_gained || 0) - (a.followers_gained || 0)
              : b.published_at.localeCompare(a.published_at),
        ),
    [videos, search, sort],
  );
  const current = shown.find((v) => v.id === selected) ?? shown[0];
  const currentIndex = current ? shown.findIndex((video) => video.id === current.id) : -1;
  const selectAt = (index: number) => {
    if (!shown.length) return;
    const target = shown[(index + shown.length) % shown.length];
    setSelected(target.id);
  };
  if (pending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <>
      <PageIntro eyebrow={`${videos.length} 篇稿件`} title="稿件" />
      <div className="videoToolbar">
        <label className="search">
          <Search />
          <input
            aria-label="搜索标题或 BV 号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题或 BV 号"
          />
        </label>
        <select aria-label="稿件排序" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="published">最新发布</option>
          <option value="views">播放量</option>
          <option value="followers">涨粉量</option>
        </select>
      </div>
      {!summary?.configured ? (
        <EmptyState />
      ) : !shown.length ? (
        <section className="iosEmpty"><Search /><h2>没有匹配的稿件</h2><p>尝试其他标题或 BV 号，也可以清除搜索条件。</p><button className="secondary" onClick={() => setSearch('')}>清除搜索</button></section>
      ) : (
          <div className="videosWorkspace">
          <section className="panel videoSwitcher" data-sticky="true" aria-label="快速切换稿件">
            <div className="videoSwitcherHead">
              <div><span>正在诊断</span><b>{currentIndex + 1} / {shown.length}</b></div>
              <div className="videoSwitcherPager">
                <button aria-label="上一篇稿件" onClick={() => selectAt(currentIndex - 1)}><ChevronLeft /></button>
                <button aria-label="下一篇稿件" onClick={() => selectAt(currentIndex + 1)}><ChevronRight /></button>
              </div>
            </div>
            <div className="videoSwitcherRail">
              {shown.map((video) => (
                <button key={video.id} className={`videoSwitchItem ${video.id === current?.id ? "selected" : ""}`} aria-pressed={video.id === current?.id} onClick={() => setSelected(video.id)}>
                  <img src={coverSrc(video)} alt="" />
                  <span><b>{video.title}</b><small>{compact(video.views)} 播放 · {percent(video.avg_watch_percent)} 进度</small></span>
                </button>
              ))}
            </div>
          </section>
          <VideoDetail video={current} onPrevious={() => selectAt(currentIndex - 1)} onNext={() => selectAt(currentIndex + 1)} />
           <section className="videoCardGrid" aria-label="稿件卡片列表">
             {shown.map((v) => (
               <button
                 key={v.id}
                 className={`videoLibraryCard ${v.id === current?.id ? "selected" : ""}`}
                 onClick={() => { setSelected(v.id); document.querySelector('.videoDetailWorkbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
               >
                 <div className="videoLibraryCover"><img src={coverSrc(v)} alt="" /><span>{seconds(v.duration_seconds)}</span></div>
                 <div className="videoLibraryBody">
                   <strong>{v.title}</strong>
                   <small>
                     {v.bvid} · {date(v.published_at)}
                   </small>
                   <dl className="videoLibraryMetrics"><div><dt>播放</dt><dd>{compact(v.views)}</dd></div><div><dt>吸引力</dt><dd>{score(v.cover_ctr)}</dd></div><div><dt>平均进度</dt><dd>{percent(v.avg_watch_percent)}</dd></div><div><dt>涨粉</dt><dd>{compact(v.followers_gained)}</dd></div></dl>
                 </div>
               </button>
             ))}
           </section>
        </div>
      )}
    </>
  );
}
const terminalLabels: Record<string, string> = {
  new_mobile: "移动端",
  new_pc: "PC",
  new_ott: "TV",
  new_h5: "H5",
  new_others: "其他",
};
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="detailSection"><h3>{title}</h3>{children}</section>;
}
function VideoDetail({ video, onPrevious, onNext }: { video?: Video; onPrevious?: () => void; onNext?: () => void }) {
  const [section, setSection] = useState("核心数据");
  const q = useQuery({
    queryKey: ["timeseries", video?.id],
    queryFn: () =>
      request<{ points: any[] }>(`/api/videos/${video?.id}/timeseries`),
    enabled: Boolean(video),
  });
  if (!video) return null;
  const points = q.data?.points || [];
  const detailDark = document.documentElement.dataset.theme === "dark";
  const gridLine = detailDark ? "rgba(255,255,255,.08)" : "rgba(148,153,160,.16)";
  const chartText = detailDark ? "#C9CCD0" : "#61666D";
  const areaGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(255,102,153,.30)" }, { offset: 1, color: "rgba(255,102,153,0)" }]);
  const trendOption = {
    animationDuration: 520,
    grid: { left: 46, right: 16, top: 24, bottom: 34 },
    tooltip: { trigger: "axis", confine: true },
    xAxis: { type: "category", boundaryGap: false, data: points.map((p) => date(p.captured_at)), axisLabel: { fontSize: 12, color: chartText } },
    yAxis: { type: "value", axisLabel: { color: chartText }, splitLine: { lineStyle: { color: gridLine } } },
    series: [{ type: "line", smooth: .38, smoothMonotone: "x", showSymbol: points.length < 10, symbolSize: 6, data: points.map((p) => p.views), lineStyle: { color: PINK, width: 3 }, itemStyle: { color: PINK }, areaStyle: { color: areaGradient } }],
  };
  const dimensions = video.dimensions || {};
  const terminalSources = dimensions.playbackTerminalSources || dimensions.playProportion || {};
  const terminalKeys = ["new_mobile", "new_pc", "new_ott", "new_h5", "new_others"];
  const terminalTotal = terminalKeys.reduce((total, key) => total + (typeof terminalSources[key] === "number" ? terminalSources[key] : 0), 0);
  const terminalEntries = terminalKeys
    .map((key) => [key, terminalTotal > 0 && typeof terminalSources[key] === "number" ? terminalSources[key] / terminalTotal * 100 : null] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] != null)
    .sort((a, b) => b[1] - a[1]);
  const retention = dimensions.retention;
  const retentionPoints = Array.isArray(retention?.viewerQuit) ? retention.viewerQuit : [];
  const retentionOption = {
    animationDuration: 520,
    grid: { left: 42, right: 16, top: 20, bottom: 34 },
    tooltip: { trigger: "axis", valueFormatter: (value: number) => `${value.toLocaleString("zh-CN")} 人` },
    xAxis: { type: "category", name: "秒", nameTextStyle: { color: chartText }, axisLabel: { color: chartText }, data: retentionPoints.map((point: any) => point.duration_key) },
    yAxis: { type: "value", axisLabel: { color: chartText }, splitLine: { lineStyle: { color: gridLine } } },
    series: [{ type: "line", smooth: .36, smoothMonotone: "x", symbol: "none", data: retentionPoints.map((point: any) => point.num), lineStyle: { color: PINK, width: 3 }, areaStyle: { color: areaGradient } }],
  };
  const diagnosis = [
    ["3秒留存", video.metrics.threeSecondBounceRate == null ? null : 100 - Number(video.metrics.threeSecondBounceRate)],
    ["平均观看", video.avg_watch_percent],
    ["互动", video.metrics.interactionRate],
    ["转粉", video.metrics.playToFollowRate],
  ];
  const diagnosisOption = {
    animationDuration: 480,
    grid: { left: 72, right: 42, top: 16, bottom: 28 },
    tooltip: { trigger: "axis", confine: true, valueFormatter: (value: number) => percent(value, 2) },
    xAxis: { type: "value", axisLabel: { formatter: "{value}%", color: chartText }, splitLine: { lineStyle: { color: gridLine } } },
    yAxis: { type: "category", inverse: true, data: diagnosis.map(([label]) => label), axisLabel: { color: chartText }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: "bar", data: diagnosis.map(([, value]) => value), barWidth: 12, showBackground: true, backgroundStyle: { color: "rgba(148,153,160,.12)", borderRadius: 8 }, itemStyle: { color: PINK, borderRadius: 8 }, label: { show: true, position: "right", formatter: ({ value }: any) => percent(Number(value), 1) } }],
  };
  const interactionEntries = [["点赞", video.metrics.likes], ["投币", video.metrics.coins], ["收藏", video.metrics.favorites], ["评论", video.metrics.comments], ["弹幕", video.metrics.danmaku], ["分享", video.metrics.shares]].filter(([, value]) => value != null && Number(value) >= 0);
  const interactionOption = {
    animationDuration: 520,
    tooltip: { trigger: "item", confine: true, formatter: ({ name, value, percent: ratio }: any) => `${name}<br/><b>${compact(Number(value))}</b> · ${ratio}%` },
    legend: { type: "scroll", bottom: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: { color: chartText } },
    series: [{ type: "pie", radius: ["48%", "72%"], center: ["50%", "44%"], avoidLabelOverlap: true, itemStyle: { borderColor: detailDark ? "#1F2127" : "#FFFFFF", borderWidth: 3, borderRadius: 5 }, label: { formatter: "{b}\n{d}%", fontSize: 12, color: chartText }, data: interactionEntries.map(([name, value], index) => ({ name, value, itemStyle: { color: [PINK, BILI_CYAN, "#FF9AB8", "#36B8D8", "#D64778", "#77C8E2"][index] } })) }],
  };
  const fanPercent = video.metrics.fanAudiencePercent != null && Number(video.metrics.fanAudiencePercent) <= 100 ? Number(video.metrics.fanAudiencePercent) : null;
  const guestPercent = video.metrics.guestAudiencePercent != null && Number(video.metrics.guestAudiencePercent) <= 100 ? Number(video.metrics.guestAudiencePercent) : null;
  return (
    <article className="panel videoDetail videoDetailWorkbench">
      <header className="videoDetailHero">
        <img className="detailCover" src={coverSrc(video)} alt="" />
        <div><div className="detailTitleRow"><span className="detailEyebrow">当前选中稿件 · {metricWindow(video)}</span><div className="detailPager"><button aria-label="上一篇稿件" onClick={onPrevious}><ChevronLeft /></button><button aria-label="下一篇稿件" onClick={onNext}><ChevronRight /></button></div></div><h2>{video.title}</h2><p>{video.bvid} · {seconds(video.duration_seconds)} · 发布于 {date(video.published_at)}</p><div className="heroMetrics"><Metric label="累计播放" value={compact(video.views)} /><Metric label="封标吸引力" value={score(video.cover_ctr)} /><Metric label="平均播放" value={seconds(video.avg_watch_seconds)} /><Metric label="平均进度" value={percent(video.avg_watch_percent)} /><Metric label="涨粉" value={compact(video.followers_gained)} /></div><p className="metricProvenance">封标吸引力采用创作中心稳定星级；绝对点击率当前未公开。观看效率与观众占比使用稿件对比口径，播放与互动为累计值。</p></div>
      </header>
      <div className="detailTabs"><Segmented items={["核心数据", "观看质量", "观众画像", "快照趋势"]} value={section} onChange={setSection} label="稿件详情分组" /></div>
      <div className={`detailSections section-${["核心数据", "观看质量", "观众画像", "快照趋势"].indexOf(section)}`}>
      <div className="detailMetricBand">
      <DetailSection title="完整数据总览">
        <div className="metricGrid detailMetricGrid">
          <Metric label="实时播放" value={compact(video.metrics.realtimePlay)} />
          <Metric label="取关" value={compact(video.metrics.unfollows)} />
          <Metric label="点赞" value={compact(video.metrics.likes)} />
          <Metric label="投币" value={compact(video.metrics.coins)} />
          <Metric label="收藏" value={compact(video.metrics.favorites)} />
          <Metric label="评论" value={compact(video.metrics.comments)} />
          <Metric label="弹幕" value={compact(video.metrics.danmaku)} />
          <Metric label="分享" value={compact(video.metrics.shares)} />
          <Metric label="3 秒跳出率" value={percent(video.metrics.threeSecondBounceRate)} />
          <Metric label="互动率" value={percent(video.metrics.interactionRate)} />
          <Metric label="播转粉率" value={percent(video.metrics.playToFollowRate)} />
        </div>
      </DetailSection>
      </div>
      <div className="diagnosticChartGrid">
        <DetailSection title="观看与转化"><p className="detailHint">不同口径的比例并列对照，不构成逐级漏斗；封标星级不换算成点击率。</p><Chart className="diagnosticChart" option={diagnosisOption} /></DetailSection>
        <DetailSection title="互动构成"><p className="detailHint">六类互动的数量构成，不用单个总数掩盖互动偏好。</p><Chart className="diagnosticChart" option={interactionOption} /></DetailSection>
        <DetailSection title="观众构成">
          <div className="audienceVisual"><div className="audienceDonut" style={{ "--fan": `${Math.max(0, Math.min(100, fanPercent ?? 0))}%` } as React.CSSProperties}><span><b>{percent(fanPercent)}</b><small>粉丝观看率</small></span></div><div className="audienceLegend"><Metric label="粉丝观看率" value={percent(fanPercent)} /><Metric label="游客占比" value={percent(guestPercent)} /><p>创作中心比例口径；去重观众人数仅作补充，不再用于反推百分比。</p></div></div>
        </DetailSection>
        <DetailSection title="播放终端来源">
          {terminalEntries.length ? <div className="terminalSources">{terminalEntries.map(([key, value]) => <div key={key}><span>{terminalLabels[key] || key}</span><div><i style={{ width: `${Math.min(100, value)}%` }} /></div><b>{percent(value)}</b></div>)}</div> : <p className="muted">该稿件尚未返回终端来源；这不等同于推荐、搜索等渠道来源。</p>}
          <p className="sourceNote">口径为移动端、PC、TV、H5 等播放终端，不冒充推荐/搜索渠道。</p>
        </DetailSection>
      </div>
      <div className="detailTrendGrid">
        <DetailSection title="观众留存曲线"><div className="retentionSummary"><Metric label="留存接口平均播放" value={seconds(retention?.durationInfo?.avg_play_time_int)} /><Metric label="留存接口平均进度" value={percent(retention?.quitInfo?.avg_play_progress)} /></div><Chart className="detailTrendLarge" option={retentionOption} /><p className="detailHint">{retentionPoints.length ? "曲线来自 B 站留存接口。" : "B 站本轮返回空曲线；界面不补造数据。"}</p></DetailSection>
        <DetailSection title="真实快照趋势"><Chart className="detailTrendLarge" option={trendOption} /><p className="detailHint">{points.length > 1 ? "展示工具实际采集时间点的累计播放，采集间隔可能不一致。" : "至少两次采集后才形成变化曲线。"}</p></DetailSection>
      </div>
      </div>
    </article>
  );
}
function AnalysisLabPage({ theme }: { theme: Theme }) {
  const { summary, videos, pending, error } = useData();
  const analysisDark = theme === "dark";
  const analysisText = analysisDark ? "#C9CCD0" : "#61666D";
  const gridColor = analysisDark ? "rgba(255,255,255,.075)" : "rgba(96,105,120,.12)";
  const presets: Record<string, Array<{ id: string; visual: AnalysisVisual }>> = {
    "效率链路": [
      { id: "cover_ctr", visual: "area" },
      { id: "avg_watch_percent", visual: "line" },
      { id: "interactionRate", visual: "line" },
      { id: "playToFollowRate", visual: "dot" },
    ],
    "规模与转化": [
      { id: "views", visual: "bar" },
      { id: "followers_gained", visual: "line" },
      { id: "playToFollowRate", visual: "dot" },
    ],
    "观看质量": [
      { id: "avg_watch_seconds", visual: "area" },
      { id: "avg_watch_percent", visual: "line" },
      { id: "threeSecondBounceRate", visual: "dot" },
    ],
  };
  const [preset, setPreset] = useState("效率链路");
  const [layers, setLayers] = useState<Array<{ id: string; visual: AnalysisVisual }>>(presets["效率链路"]);
  const [scaleMode, setScaleMode] = useState<"raw" | "relative">("raw");
  const [sortBy, setSortBy] = useState("published");
  const [selection, setSelection] = useState<string[] | null>(null);
  const selectedVideoIds = selection ?? videos.map((video) => video.id);
  const setSelectedVideoIds = (value: React.SetStateAction<string[]>) => setSelection(typeof value === "function" ? value(selectedVideoIds) : value);
  const definitions = analysisMetricGroups.flatMap((group) => group.metrics);
  const definitionMap = Object.fromEntries(definitions.map((definition) => [definition.id, definition]));
  const metricValue = (video: Video, id: string) => {
    const direct = (video as any)[id];
    const value = direct ?? video.metrics[id];
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  };
  const applyPreset = (name: string) => {
    setPreset(name);
    setLayers(presets[name].map((layer) => ({ ...layer })));
    setScaleMode("raw");
  };
  const toggleMetric = (id: string) => {
    setPreset("自定义");
    setLayers((current) => current.some((layer) => layer.id === id)
      ? current.filter((layer) => layer.id !== id)
      : [...current, { id, visual: definitionMap[id]?.defaultVisual || "line" }]);
  };
  const toggleVideo = (id: string) => setSelectedVideoIds((current) => current.includes(id)
    ? current.filter((videoId) => videoId !== id)
    : [...current, id]);
  const primaryMetric = layers[0]?.id;
  const displayVideos = videos
    .filter((video) => selectedVideoIds.includes(video.id))
    .slice()
    .sort((a, b) => sortBy === "views"
      ? Number(b.views || 0) - Number(a.views || 0)
      : sortBy === "primary" && primaryMetric
        ? Number(metricValue(b, primaryMetric) || 0) - Number(metricValue(a, primaryMetric) || 0)
        : b.published_at.localeCompare(a.published_at));
  const palette = [PINK, BILI_CYAN, PINK_DARK, "#7D5DE8", PINK_BRIGHT, "#31B6D8"];
  const rawByMetric = Object.fromEntries(layers.map((layer) => [layer.id, displayVideos.map((video) => metricValue(video, layer.id))]));
  const normalizedByMetric = Object.fromEntries(layers.map((layer) => [layer.id, normalizeMetricValues(rawByMetric[layer.id])]));
  const formatRaw = (id: string, value: number | null) => {
    if (value == null) return "—";
    const definition = definitionMap[id];
    if (definition?.unit === "percent") return percent(value, 2);
    if (definition?.unit === "seconds") return seconds(value);
    if (definition?.unit === "score") return score(value, 1);
    return compact(value);
  };
  const unitLabels = { count: "数量", percent: "百分比", seconds: "时长（秒）", score: "星级（0–5）" } as const;
  const usedUnits = [...new Set(layers.map((layer) => definitionMap[layer.id]?.unit).filter(Boolean))] as Array<"count" | "percent" | "seconds" | "score">;
  const axisIndex = Object.fromEntries(usedUnits.map((unit, index) => [unit, index]));
  const rawAxes = usedUnits.map((unit, index) => ({
    type: "value",
    name: unitLabels[unit],
    position: index === 1 ? "right" : "left",
    offset: index > 1 ? (index - 1) * 52 : 0,
    nameTextStyle: { color: palette[index % palette.length], fontWeight: 650 },
    axisLabel: { color: analysisText, formatter: unit === "percent" ? "{value}%" : unit === "score" ? "{value}星" : "{value}" },
    axisLine: { show: index > 0, lineStyle: { color: palette[index % palette.length], opacity: .45 } },
    splitLine: { show: index === 0, lineStyle: { color: gridColor } },
    min: unit === "percent" || unit === "score" ? 0 : undefined,
    max: unit === "score" ? 5 : undefined,
  }));
  const option = {
    animationDuration: 480,
    animationEasing: "cubicOut",
    grid: { left: 64 + Math.max(0, usedUnits.length - 2) * 44, right: usedUnits.length > 1 ? 64 : 28, top: 58, bottom: 84 },
    legend: { type: "scroll", top: 4, data: layers.map((layer) => definitionMap[layer.id]?.label || layer.id), icon: "roundRect", itemWidth: 18, itemHeight: 8, textStyle: { color: analysisText } },
    tooltip: {
      trigger: "axis",
      confine: true,
      extraCssText: "max-width:340px;white-space:normal;overflow-wrap:anywhere;line-height:1.65;",
      formatter: (params: any[]) => {
        const index = params?.[0]?.dataIndex;
        const video = displayVideos[index];
        if (!video) return "";
        return `<b>${escapeHtml(video.title)}</b><br/>${layers.map((layer) => `${definitionMap[layer.id]?.label || layer.id}：${formatRaw(layer.id, rawByMetric[layer.id][index])}`).join("<br/>")}`;
      },
    },
    xAxis: { type: "category", data: displayVideos.map((video, index) => `${String(index + 1).padStart(2, "0")} · ${video.title}`), axisLabel: { interval: 0, rotate: 30, width: 112, overflow: "truncate", fontSize: 12, color: analysisText, formatter: (value: string) => value.length > 16 ? `${value.slice(0, 16)}…` : value }, axisTick: { show: false }, axisLine: { lineStyle: { color: gridColor } } },
    yAxis: scaleMode === "relative" ? [{ type: "value", name: "相对位置", min: 0, max: 100, interval: 20, axisLabel: { formatter: "{value}", color: analysisText }, nameTextStyle: { color: analysisText }, splitLine: { lineStyle: { color: gridColor } } }] : rawAxes,
    series: layers.map((layer, index) => {
      const color = palette[index % palette.length];
      const label = definitionMap[layer.id]?.label || layer.id;
      const base = { name: label, data: scaleMode === "relative" ? normalizedByMetric[layer.id] : rawByMetric[layer.id], yAxisIndex: scaleMode === "relative" ? 0 : axisIndex[definitionMap[layer.id]?.unit], emphasis: { focus: "series" } };
      if (layer.visual === "bar") return { ...base, type: "bar", barMaxWidth: 26, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color }, { offset: 1, color: `${color}66` }]), borderRadius: [7, 7, 2, 2] } };
      if (layer.visual === "dot") return { ...base, type: "scatter", symbolSize: 10, itemStyle: { color, borderColor: analysisDark ? "#202228" : "#fff", borderWidth: 2 } };
      return { ...base, type: "line", smooth: .32, smoothMonotone: "x", showSymbol: displayVideos.length <= 8, symbolSize: 6, lineStyle: { color, width: layer.visual === "area" ? 3.2 : 2.6 }, itemStyle: { color }, areaStyle: layer.visual === "area" ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${color}55` }, { offset: .65, color: `${color}12` }, { offset: 1, color: `${color}00` }]) } : undefined };
    }),
  };
  return (
    <>
      {pending ? <Loading /> : error ? <ErrorState error={error} /> : null}
      <PageIntro eyebrow="把不同指标放进同一张图，仍保留真实单位与原始值" title="联合分析" />
      {!summary?.configured ? <EmptyState /> : <div className="analysisWorkspace">
        <aside className="panel analysisRecipePanel">
          <div className="layerBuilderIntro"><Layers3 /><div><h2>分析配方</h2><p>先选问题，再调整数据层。</p></div></div>
          <div className="analysisPresets">{Object.keys(presets).map((name) => <button aria-pressed={preset === name} className={preset === name ? "selected" : ""} onClick={() => applyPreset(name)} key={name}>{name}</button>)}</div>
          <div className="analysisSectionLabel"><span>数据层</span><small>{layers.length} 项已启用</small></div>
          <div className="selectedLayers">{layers.map((layer, index) => <div className="analysisLayerRow" key={layer.id}><i style={{ background: palette[index % palette.length] }} /><span><b>{definitionMap[layer.id]?.label || layer.id}</b><small>{unitLabels[definitionMap[layer.id]?.unit]}</small></span><select aria-label={`${definitionMap[layer.id]?.label || layer.id}图形`} value={layer.visual} onChange={(event) => { const visual = event.target.value as AnalysisVisual; setPreset("自定义"); setLayers((current) => current.map((item) => item.id === layer.id ? { ...item, visual } : item)); }}><option value="bar">柱形</option><option value="area">渐变面积</option><option value="line">折线</option><option value="dot">数据点</option></select><button aria-label={`移除${definitionMap[layer.id]?.label || layer.id}`} onClick={() => toggleMetric(layer.id)}><X /></button></div>)}</div>
          <details className="metricLibrary"><summary>添加更多指标 <span>＋</span></summary><div className="metricPickerGroups">{analysisMetricGroups.map((group) => <fieldset key={group.name}><legend>{group.name}</legend>{group.metrics.map((metric) => <label key={metric.id}><input type="checkbox" aria-label={metric.label} checked={layers.some((layer) => layer.id === metric.id)} onChange={() => toggleMetric(metric.id)} /><span>{metric.label}</span></label>)}</fieldset>)}</div></details>
        </aside>
        <section className="panel analysisCanvasPanel">
          <div className="analysisCanvasHead"><div><span className="detailEyebrow">{preset === "自定义" ? "自定义组合" : preset}</span><h2>多指标对照</h2><p>{scaleMode === "raw" ? "按真实单位使用独立坐标轴，数值可以直接阅读。" : "每项指标映射为自身稿件范围内的相对位置。"}</p></div><div className="analysisViewControls"><div role="radiogroup" aria-label="数值尺度"><label><input type="radio" name="analysis-scale" checked={scaleMode === "raw"} onChange={() => setScaleMode("raw")} />原始值</label><label><input type="radio" name="analysis-scale" checked={scaleMode === "relative"} onChange={() => setScaleMode("relative")} />相对尺度</label></div><label>排序<select aria-label="稿件排序" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="published">发布时间</option><option value="views">播放量</option><option value="primary">首项指标</option></select></label></div></div>
          <div className="analysisSelectionRail" aria-label="纳入分析的稿件"><div><b>稿件范围</b><span>{displayVideos.length} / {videos.length}</span><button onClick={() => setSelectedVideoIds(videos.map((video) => video.id))}>全部</button><button onClick={() => setSelectedVideoIds([])}>清除</button></div><div>{videos.map((video) => <button key={video.id} aria-pressed={selectedVideoIds.includes(video.id)} className={selectedVideoIds.includes(video.id) ? "selected" : ""} onClick={() => toggleVideo(video.id)} title={video.title}><img src={coverSrc(video)} alt="" /><span>{video.title}</span></button>)}</div></div>
          {layers.length && displayVideos.length ? <Chart className="jointAnalysisChart" option={option} /> : <div className="labEmpty"><Layers3 /><b>{layers.length ? "请选择至少一篇稿件" : "请添加至少一个指标"}</b><p>图表会在选择后立即重绘，并保留每项原始数值。</p></div>}
          <div className="analysisReadout">{layers.map((layer, index) => { const values = rawByMetric[layer.id].filter((value): value is number => value != null); const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; return <article key={layer.id}><i style={{ background: palette[index % palette.length] }} /><span>{definitionMap[layer.id]?.label}</span><b>{formatRaw(layer.id, average)}</b><small>{values.length} 篇有值 · {unitLabels[definitionMap[layer.id]?.unit]}</small></article>; })}</div>
          <p className="sourceNote">播放、互动为稿件累计值；封标吸引力采用创作中心稳定星级；绝对点击率尚未公开。观看效率、跳出、互动率、转粉率与观众占比采用稿件对比口径。相对尺度只用于找同一指标内的高低。</p>
        </section>
      </div>}
    </>
  );
}

function DataSourcePage() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["bili-status"],
    queryFn: () => request<any>("/api/bilibili/status"),
    refetchInterval: 15_000,
  });
  const [qr, setQr] = useState<{ key: string; image: string } | null>(null);
  const [qrState, setQrState] = useState("");
  const [error, setError] = useState("");
  const start = async () => {
    setError("");
    try {
      const d = await request<{ url: string; key: string }>(
        "/api/bilibili/qr/start",
        { method: "POST" },
      );
      setQr({
        key: d.key,
        image: await QRCode.toDataURL(d.url, { width: 260, margin: 1 }),
      });
      setQrState("waiting");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    if (!qr || !["waiting", "scanned"].includes(qrState)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const d = await request<{ state: string }>(`/api/bilibili/qr/status/${qr.key}`);
        if (cancelled) return;
        setQrState(d.state);
        if (d.state === "confirmed") { setQr(null); await qc.invalidateQueries({ queryKey: ["bili-status"] }); }
        else if (["waiting", "scanned"].includes(d.state)) timer = setTimeout(poll, 1800);
      } catch (e) { if (!cancelled) { setError((e as Error).message); setQrState("expired"); } }
    };
    timer = setTimeout(poll, 1800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [qr, qrState, qc]);
  const collect = useSync();
  const disconnect = useMutation({
    mutationFn: () =>
      request("/api/bilibili/qr/disconnect", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bili-status"] }),
  });
  const run = status.data?.lastRun;
  if (status.isPending) return <Loading />;
  if (status.error) return <ErrorState error={status.error} />;
  return (
    <>
      <PageIntro eyebrow="连接状态与数据覆盖" title="数据源" />
      <div className="sourceGrid">
        <section className="panel connectionCard">
          <div className="serviceIcon bilibili">
            <Play fill="currentColor" />
          </div>
          <h2>B 站创作中心</h2>
          <p>在手机上扫码连接。登录会话加密保存，采集数据只用于你的工作区。</p>
          <div
            className={`connectionStatus ${status.data?.connected ? "good" : ""}`}
          >
            <span />
            {status.data?.connected ? "已连接真实账号" : "尚未连接"}
          </div>
          {qr ? (
            <div className="qrBox">
              <img src={qr.image} />
              <b>
                {qrState === "scanned"
                  ? "已扫码，请在手机确认"
                  : "请用哔哩哔哩客户端扫码"}
              </b>
              <button
                onClick={() => {
                  setQr(null);
                  setQrState("");
                }}
              >
                取消
              </button>
            </div>
          ) : status.data?.connected ? (
            <div className="connectionActions">
              <button
                className="primary"
                onClick={() => collect.mutate()}
                disabled={collect.isPending}
              >
                <RefreshCw className={collect.isPending ? "spin" : ""} />
                {collect.isPending ? "正在采集真实数据" : "立即采集"}
              </button>
              <button className="secondary" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                <Unplug />
                断开
              </button>
            </div>
          ) : (
            <button className="primary" onClick={start}>
              <KeyRound />
              在看板内扫码连接
            </button>
          )}
          {error && <InlineError error={new Error(error)} />}{" "}
          {collect.error && <InlineError error={collect.error} />}
          {disconnect.error && <InlineError error={disconnect.error} />}
        </section>
        <section className="panel runCard">
          <div className="panelHead">
            <div>
              <h2>最近一次采集</h2>
              <p>最近一轮的耗时、覆盖情况与异常</p>
            </div>
          </div>
          {run ? (
            <>
              <div className="runHero">
                <b className={run.status}>{({ success: "采集完成", partial: "部分完成", failed: "采集失败", running: "采集中" } as Record<string,string>)[run.status] ?? run.status}</b>
                <strong>
                  {run.timings_json
                    ? `${JSON.parse(run.timings_json).totalMs} ms`
                    : "—"}
                </strong>
                <span>总耗时</span>
              </div>
              <dl>
                <div>
                  <dt>开始</dt>
                  <dd>{date(run.started_at)}</dd>
                </div>
                <div>
                  <dt>接口覆盖</dt>
                  <dd>{percent((run.coverage || 0) * 100)}</dd>
                </div>
                <div>
                  <dt>接口请求</dt>
                  <dd>{run.request_count ?? "—"}</dd>
                </div>
                <div>
                  <dt>错误</dt>
                  <dd>{run.error_code || "无"}</dd>
                </div>
              </dl>
              <RunCoverageReport run={run} />
            </>
          ) : (
            <div className="runEmpty">
              <Activity />
              <p>扫码连接后运行第一次真实采集。</p>
            </div>
          )}
        </section>
        <section className="panel importCard">
          <Upload />
          <div>
            <h2>历史表格导入</h2>
            <p>历史表格导入尚未接入。当前只展示创作中心实际采集的数据。</p>
          </div>
          <span className="statusPill">尚未接入</span>
        </section>
      </div>
    </>
  );
}
function SettingsPage() {
  return (
    <>
      <PageIntro eyebrow="服务连接与数据管理" title="设置" />
      <div className="settingsGrid">
        <SnapshotExport />
        <DeepSeekSettings />
        <section className="panel settingCard">
          <div className="settingIcon">
            <Upload />
          </div>
          <div>
            <h2>Google Drive 备份</h2>
            <p>
              云端自动备份尚未完成接入。当前不会上传数据或执行恢复操作。
            </p>
            <span className="statusPill">尚未接入</span>
          </div>
          <button className="secondary" disabled>
            连接 Google Drive
          </button>
        </section>
        <section className="panel settingCard">
          <div className="settingIcon">
            <Bell />
          </div>
          <div>
            <h2>采集与告警</h2>
            <p>云端部署后每 15 分钟运行；本地阶段可手动验证相同采集路径。</p>
            <span className="statusPill">本地验证阶段</span>
          </div>
        </section>
      </div>
    </>
  );
}
function DeepSeekSettings() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["deepseek"],
    queryFn: () => request<any>("/api/settings/deepseek/status"),
  });
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      request("/api/settings/deepseek", {
        method: "PUT",
        body: JSON.stringify({ apiKey: key }),
      }),
    onSuccess: () => {
      setKey("");
      qc.invalidateQueries({ queryKey: ["deepseek"] });
    },
  });
  const test = useMutation({
    mutationFn: () =>
      request<any>("/api/settings/deepseek/test", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deepseek"] }),
  });
  const remove = useMutation({
    mutationFn: () => request("/api/settings/deepseek", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deepseek"] }),
  });
  return (
    <section className="panel deepseekCard">
      <div className="settingIcon ai">
        <Bot />
      </div>
      <div className="settingCopy">
        <h2>DeepSeek</h2>
        <p>
          API Key 由浏览器发送到本地 Worker，并以 AES-GCM 加密保存；完整 Key
          永不回传。
        </p>
      </div>
      <div className="secretField">
        <KeyRound />
        <input
          type={show ? "text" : "password"}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={
            status.data?.configured
              ? `已配置 ···· ${status.data.last4}`
              : "填写 DeepSeek API Key"
          }
        />
        <button aria-label="显示或隐藏 Key" onClick={() => setShow(!show)}>
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <div className="settingActions">
        <button
          className="primary small"
          disabled={!key || save.isPending}
          onClick={() => save.mutate()}
        >
          保存密钥
        </button>
        <button
          className="secondary"
          disabled={!status.data?.configured || test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? "测试中" : "测试连接"}
        </button>
        {status.data?.configured && (
          <button className="danger" onClick={() => remove.mutate()}>
            删除
          </button>
        )}
      </div>
      {status.data?.configured && (
        <div className="configured">
          <CheckCircle2 />
          已加密配置 · 模型 {status.data.model}
          {status.data.lastTestAt &&
            ` · ${date(status.data.lastTestAt)} 测试通过`}
        </div>
      )}
      {(save.error || test.error || remove.error) && (
        <InlineError error={(save.error || test.error || remove.error)!} />
      )}{" "}
      {test.data && (
        <div className="configured">
          <CheckCircle2 />
          连接成功 · {test.data.latencyMs} ms
        </div>
      )}
    </section>
  );
}
function Loading() {
  return (
    <div className="loading">
      <RefreshCw className="spin" />
      <span>正在读取本地数据</span>
    </div>
  );
}
function ErrorState({ error }: { error: unknown }) {
  const qc = useQueryClient();
  return (
    <section className="empty panel">
      <X />
      <h2>无法读取数据</h2>
      <p>{(error as Error).message}</p>
      <button className="primary" onClick={() => qc.invalidateQueries()}>重新加载</button>
    </section>
  );
}
function InlineError({ error }: { error: unknown }) {
  return <div className="inlineError">{(error as Error).message}</div>;
}

function RunCoverageReport({ run }: { run: any }) {
  if (!run?.details) return null;
  const details = run.details as CoverageDetails;
  return (
    <div className="runCoverageReport">
      <div>
        <b>
          {details.completeVideos}/{details.totalVideos}
        </b>
        <span>当前已接入指标完整稿件</span>
      </div>
      <div className="runMetricCoverage">
        {Object.entries(details.metricCounts || {}).map(([key, count]) => (
          <span
            className={count === details.totalVideos ? "complete" : "missing"}
            key={key}
          >
            {coverageMetricLabels[key] || key}
            <b>
              {count}/{details.totalVideos}
            </b>
          </span>
        ))}
      </div>
      <SourceFieldSummary details={details} />
      {details.capabilityCounts && (
        <div className="capabilityCoverage">
          {Object.entries(details.capabilityCounts).map(([key, value]) => (
            <span className={value.available === value.total ? "complete" : "missing"} key={key}>
              {capabilityLabels[key] || key}<b>{value.available}/{value.total}</b>
            </span>
          ))}
        </div>
      )}
      {(details.warnings?.length || 0) > 0 && (
        <details className="runWarnings" open>
          <summary>{details.warnings!.length} 项能力未完整获取</summary>
          <ul>{details.warnings!.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </details>
      )}
      {(details.missingByVideo?.length || 0) > 0 && (
        <details>
          <summary>
            {details.missingByVideo.length} 篇稿件存在未返回字段
          </summary>
          <ul>
            {details.missingByVideo!.map((video) => (
              <li key={video.bvid}>
                <b>{video.title}</b>
                <span>
                  {video.missing
                    .map((key) => coverageMetricLabels[key] || key)
                    .join("、")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {(details.plannedNotIntegrated?.length || 0) > 0 && (
        <details className="plannedMetrics">
          <summary>
            {details.plannedNotIntegrated!.length} 类计划指标尚未接入
          </summary>
          <p>
            这不计入上面的 17/17；接口原始响应已保存，新增适配后可重新解析。
          </p>
          <div>
            {details.plannedNotIntegrated!.map((key) => (
              <span key={key}>{plannedMetricLabels[key] || key}</span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function App() {
  const [page, setPage] = useRoute();
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const [ai, setAi] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => applyTheme(theme), []);
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => request<{ ok: true } & Summary>("/api/dashboard/summary"),
  });
  const setTheme = (next: Theme, e: React.MouseEvent) => {
    setThemeState(next);
    transitionTheme(next, { x: e.clientX, y: e.clientY });
  };
  const content =
    page === "概览" ? (
      <OverviewPage navigate={setPage} theme={theme} />
    ) : page === "内容吸引力矩阵" ? (
      <PerformanceMapPage />
    ) : page === "稿件" ? (
      <VideosPage />
    ) : page === "联合分析" ? (
      <AnalysisLabPage theme={theme} />
    ) : page === "数据源" ? (
      <DataSourcePage />
    ) : (
      <SettingsPage />
    );
  return (
    <div className={`app ${menu ? "menuOpen" : ""}`}>
      {menu && <button className="menuScrim" aria-label="关闭导航" onClick={() => setMenu(false)} />}
      <Sidebar page={page} setPage={(next) => { setPage(next); setMenu(false); }} />
      <main>
        <Topbar
          theme={theme}
          setTheme={setTheme}
          onAI={() => setAi(true)}
          summary={summary.data}
          page={page}
          navigate={setPage}
        />
        <div className="mobileHeader">
          <Logo />
          <button className="iconButton" aria-label="打开导航" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <Menu />
          </button>
        </div>
        <div className="pageStage" key={page} id="page-content">
          {content}
        </div>
      </main>
      <nav className="mobileNav">
        {[
          ["概览", Home],
          ["稿件", FileChartColumn],
          ["联合分析", BarChart3],
          ["设置", Settings],
        ].map(([p, I]: any) => (
          <button
            key={p}
            className={page === p ? "active" : ""}
            onClick={() => setPage(p)}
          >
            <I />
            <span>{p === "联合分析" ? "分析" : p}</span>
          </button>
        ))}
      </nav>
      {ai && <Insights close={() => setAi(false)} navigate={setPage} />}
    </div>
  );
}
export function AppRoot() {
  return <QueryClientProvider client={queryClient}><App /></QueryClientProvider>;
}
