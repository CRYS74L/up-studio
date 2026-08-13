import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
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
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  EyeOff,
  FileChartColumn,
  FlaskConical,
  Home,
  KeyRound,
  ListFilter,
  Map,
  Menu,
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
  applyTheme,
  getInitialTheme,
  transitionTheme,
  type Theme,
} from "./theme";
import "./styles.css";

type ApiError = { error?: { message?: string } };
type Video = {
  id: string;
  bvid: string;
  title: string;
  cover_url: string | null;
  duration_seconds: number | null;
  published_at: string;
  views: number | null;
  impressions: number | null;
  cover_ctr: number | null;
  avg_watch_seconds: number | null;
  avg_watch_percent: number | null;
  followers_gained: number | null;
  captured_at: string | null;
  metrics: Record<string, number | null>;
};
type CoverageDetails = {
  totalVideos: number;
  completeVideos: number;
  metricCounts: Record<string, number>;
  missingByVideo: Array<{
    bvid: string;
    title: string;
    missing: string[];
    reasons: string[];
  }>;
  warnings: string[];
  sourceFields?: {
    archiveStat: string[];
    compareStat: string[];
    overviewStat: string[];
    overview: string[];
  };
  plannedNotIntegrated?: string[];
};
type Acquisition = {
  status: "running" | "success" | "partial" | "failed";
  coverage: number;
  details?: CoverageDetails;
  started_at: string;
  finished_at: string | null;
  error_code?: string | null;
  safe_error_detail?: string | null;
};
type Summary = {
  configured: boolean;
  freshnessMinutes: number | null;
  summary: {
    videos?: number;
    fresh?: string;
    views?: number;
    followers?: number;
    cover_ctr?: number;
    avg_watch_percent?: number;
    avg_watch_seconds?: number;
    interaction_rate?: number;
  };
  acquisition?: Acquisition | null;
};
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error((j as ApiError).error?.message || `请求失败 (${r.status})`);
  return j as T;
}
const compact = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n >= 10000
      ? `${(n / 10000).toFixed(1)}万`
      : n.toLocaleString("zh-CN");
const percent = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : `${n.toFixed(d)}%`;
const seconds = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `${Math.floor(n / 60)
        .toString()
        .padStart(2, "0")}:${Math.round(n % 60)
        .toString()
        .padStart(2, "0")}`;
const date = (v: string | null | undefined) =>
  v
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(v))
    : "—";
const coverSrc = (
  video: Pick<Video, "id">,
  variant: "cover" | "thumb" = "cover",
) =>
  `/api/covers/${encodeURIComponent(video.id)}${variant === "thumb" ? "?variant=thumb" : ""}`;

function Logo() {
  return (
    <div className="logo">
      <div className="logoMark">
        <Play size={18} fill="currentColor" />
      </div>
      <div>
        <b>哔哩哔哩数据看板</b>
        <span>私人创作者分析</span>
      </div>
    </div>
  );
}
const nav = [
  ["概览", Home],
  ["表现地图", Map],
  ["稿件", FileChartColumn],
  ["分析实验室", FlaskConical],
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
            className={page === label ? "active" : ""}
            onClick={() => setPage(label)}
            key={label}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sideBottom">
        <button onClick={() => setPage("数据源")}>
          <Upload />
          <span>历史导入</span>
        </button>
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
            <span>凭据加密保存在本地</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
function Topbar({
  theme,
  setTheme,
  onAI,
  summary,
}: {
  theme: Theme;
  setTheme: (t: Theme, e: React.MouseEvent) => void;
  onAI: () => void;
  summary?: Summary;
}) {
  const fresh = summary?.configured;
  const complete = summary?.acquisition?.status === "success";
  return (
    <header className="topbar">
      <div className="fresh">
        <span
          className={`liveDot ${fresh ? (complete ? "online" : "warning") : ""}`}
        />
        <b>
          {fresh
            ? complete
              ? "真实数据 · 完整"
              : "真实数据 · 采集不完整"
            : "等待真实数据"}
        </b>
        <span>
          {fresh
            ? `${summary?.freshnessMinutes ?? 0} 分钟前刷新`
            : "请在数据源中连接 B 站"}
        </span>
      </div>
      <div className="topActions">
        <button className="date">
          <Clock3 />
          全部历史
          <ChevronDown />
        </button>
        <button className="iconButton" aria-label="通知">
          <Bell />
        </button>
        <button className="aiButton" onClick={onAI}>
          <Sparkles />
          问问数据
        </button>
        <button
          className="themeSwitch"
          onClick={(e) => setTheme(theme === "light" ? "dark" : "light", e)}
          aria-label="切换深浅色"
        >
          <Sun />
          <span className={theme === "dark" ? "right" : ""} />
          <Moon />
        </button>
      </div>
    </header>
  );
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
function KpiStrip({ summary }: { summary: Summary }) {
  const s = summary.summary;
  const items = [
    ["播放总量", compact(s.views)],
    ["涨粉总量", compact(s.followers)],
    ["封面点击率", percent(s.cover_ctr)],
    ["平均播放百分比", percent(s.avg_watch_percent)],
    ["平均播放时长", seconds(s.avg_watch_seconds)],
    ["综合互动率", percent(s.interaction_rate)],
  ];
  return (
    <section className="kpiStrip">
      {items.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>最新真实快照</small>
        </article>
      ))}
    </section>
  );
}
const coverageMetricLabels: Record<string, string> = {
  views: "播放量",
  coverCtr: "封面点击率",
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
  impressions: "曝光量",
  retentionCurve: "留存曲线",
  trafficSources: "流量来源",
  viewerArea: "观众地区",
  viewerGender: "观众性别",
  viewerAge: "观众年龄",
  realtimePlays: "实时播放",
};
function SourceFieldSummary({ details }: { details: CoverageDetails }) {
  const sourceCount = details.sourceFields
    ? new Set([
        ...details.sourceFields.archiveStat,
        ...details.sourceFields.compareStat,
        ...details.sourceFields.overviewStat,
        ...details.sourceFields.overview,
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
  if (!acquisition || acquisition.status === "success") return null;
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
          <div className="coverageMetrics">
            {Object.entries(details.metricCounts).map(([key, count]) => (
              <span
                className={count === total ? "complete" : "missing"}
                key={key}
              >
                {coverageMetricLabels[key] || key} {count}/{total}
              </span>
            ))}
          </div>
          {details.missingByVideo.length > 0 && (
            <details>
              <summary>查看缺失稿件与原因</summary>
              <ul>
                {details.missingByVideo.map((video) => (
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
function useData() {
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => request<{ ok: true } & Summary>("/api/dashboard/summary"),
  });
  const videos = useQuery({
    queryKey: ["videos"],
    queryFn: () => request<{ ok: true; videos: Video[] }>("/api/videos"),
  });
  return {
    summary: summary.data,
    videos: videos.data?.videos ?? [],
    pending: summary.isPending || videos.isPending,
    error: summary.error || videos.error,
  };
}
function Chart({
  option,
  className,
  events,
}: {
  option: any;
  className: string;
  events?: Record<string, (p: any) => void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    for (const [name, fn] of Object.entries(events || {})) chart.on(name, fn);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [option, events]);
  return <div ref={ref} className={className} />;
}
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
  const xMid = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const yMid = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
  return {
    animationDuration: 420,
    animationEasing: "cubicOut",
    grid: { left: 54, right: 24, top: 50, bottom: 48 },
    tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        `<b>${p.data.title}</b><br/>${metricLabels[x]} ${p.value[0]?.toFixed?.(1) ?? "—"} · ${metricLabels[y]} ${p.value[1]?.toFixed?.(1) ?? "—"}<br/>${metricLabels[size]} ${compact(p.value[2])}`,
    },
    xAxis: {
      name: metricLabels[x],
      min: 0,
      axisLabel: {
        formatter: (v: number) => (x === "cover_ctr" ? `${v}%` : v),
      },
      splitLine: {
        lineStyle: { type: "dashed", color: dark ? "#313746" : "#dfe5ed" },
      },
    },
    yAxis: {
      name: metricLabels[y],
      min: 0,
      axisLabel: {
        formatter: (v: number) => (y === "avg_watch_percent" ? `${v}%` : v),
      },
      splitLine: {
        lineStyle: { type: "dashed", color: dark ? "#313746" : "#dfe5ed" },
      },
    },
    series: [
      {
        type: "custom",
        data: plottable.map((v) => ({
          value: [
            Number(v[x]),
            Number(v[y]),
            v[size] == null ? 1 : Number(v[size]),
          ],
          title: v.title,
          videoId: v.id,
        })),
        renderItem: (params: any, api: any) => {
          const data = plottable[params.dataIndex] || plottable[0];
          const point = api.coord([api.value(0), api.value(1)]);
          const volume = Math.max(1, Number(api.value(2)) || 1);
          const selected = data?.id === selectedId;
          const radius = selected
            ? 38
            : Math.max(15, Math.min(29, Math.sqrt(volume) * 0.28));
          return {
            type: "group",
            children: [
              {
                type: "circle",
                shape: {
                  cx: point[0],
                  cy: point[1],
                  r: radius + (selected ? 7 : 4),
                },
                style: {
                  fill: selected
                    ? "rgba(20,119,255,.18)"
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
                  stroke: selected ? "#1477ff" : "#fff",
                  lineWidth: selected ? 3 : 2,
                  shadowBlur: selected ? 12 : 7,
                  shadowColor: selected
                    ? "rgba(20,119,255,.32)"
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
  cover_ctr: "封面点击率",
  avg_watch_seconds: "平均播放时长",
  avg_watch_percent: "平均播放百分比",
  followers_gained: "涨粉量",
  duration_seconds: "视频时长",
  published_at: "发布时间",
};
function TrendChart({ videos }: { videos: Video[] }) {
  const option = useMemo(
    () => ({
      grid: { left: 45, right: 16, top: 20, bottom: 35 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: videos
          .slice()
          .reverse()
          .map((v) => date(v.published_at).slice(0, 5)),
        axisLine: { show: false },
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "line",
          smooth: 0.3,
          symbolSize: 7,
          data: videos
            .slice()
            .reverse()
            .map((v) => v.views),
          lineStyle: { width: 3, color: "#247bff" },
          itemStyle: { color: "#247bff" },
          areaStyle: { color: "rgba(36,123,255,.12)" },
        },
      ],
    }),
    [videos],
  );
  return <Chart className="trendChart" option={option} />;
}

function OverviewPage({ setPage }: { setPage: (p: string) => void }) {
  const { summary, videos, pending, error } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    videos.find((v) => v.id === (selectedId || videos[0]?.id)) || videos[0];
  const mapOption = useMemo(
    () =>
      performanceOption(
        videos,
        "cover_ctr",
        "avg_watch_percent",
        "views",
        selected?.id,
      ),
    [videos, selected?.id],
  );
  const mapEvents = useMemo(
    () => ({
      click: (p: any) => p.data?.videoId && setSelectedId(p.data.videoId),
    }),
    [],
  );
  const plottable = videos.filter(
    (video) => video.cover_ctr != null && video.avg_watch_percent != null,
  ).length;
  if (pending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <>
      {!summary?.configured ? (
        <>
          <PageIntro
            eyebrow="创作者全局快照"
            title="现在表现如何，哪些内容正在生长？"
          />
          <EmptyState />
        </>
      ) : (
        <div className="referenceDashboard">
          <CoverageNotice acquisition={summary.acquisition} />
          <KpiStrip summary={summary} />
          <div className="referenceGrid">
            <section className="panel overviewMap">
              <div className="panelHead">
                <div>
                  <h2>
                    表现地图{" "}
                    <small>气泡大小 = 播放量，粉色光环 = 涨粉效率</small>
                  </h2>
                  <p
                    className={
                      plottable === videos.length
                        ? "mapCoverage complete"
                        : "mapCoverage warning"
                    }
                  >
                    {plottable === videos.length
                      ? `${videos.length} / ${videos.length} 篇指标完整，全部已绘制`
                      : `${plottable} / ${videos.length} 篇具备横纵轴真实值；缺失稿件未以 0 代替`}
                  </p>
                </div>
                <button className="mapHelp">如何看图？</button>
              </div>
              <div className="quadrantCards" aria-hidden="true">
                <span className="qa">
                  低点击 高留存<small>内容强，标题需优化</small>
                </span>
                <span className="qb">
                  高点击 高留存<small>优质爆款区</small>
                </span>
                <span className="qc">
                  低点击 低留存<small>需全面优化</small>
                </span>
                <span className="qd">
                  高点击 低留存<small>标题强，内容需优化</small>
                </span>
              </div>
              <Chart
                className="overviewMapChart"
                option={mapOption}
                events={mapEvents}
              />
            </section>
            <OverviewInspector
              video={selected}
              index={
                Math.max(
                  0,
                  videos.findIndex((v) => v.id === selected?.id),
                ) + 1
              }
              total={videos.length}
              previous={() => {
                const i = videos.findIndex((v) => v.id === selected?.id);
                setSelectedId(
                  videos[(i - 1 + videos.length) % videos.length]?.id,
                );
              }}
              next={() => {
                const i = videos.findIndex((v) => v.id === selected?.id);
                setSelectedId(videos[(i + 1) % videos.length]?.id);
              }}
              openDetails={() => setPage("稿件")}
            />
            <OverviewTrend video={selected} />
          </div>
        </div>
      )}
    </>
  );
}
function OverviewInspector({
  video,
  index,
  total,
  previous,
  next,
  openDetails,
}: {
  video?: Video;
  index: number;
  total: number;
  previous: () => void;
  next: () => void;
  openDetails: () => void;
}) {
  if (!video) return null;
  return (
    <aside className="panel overviewInspector">
      <div className="inspectorHead">
        <h2>已选视频</h2>
        <span>
          {index} / {total}
        </span>
        <div>
          <button aria-label="上一个视频" onClick={previous}>
            ‹
          </button>
          <button aria-label="下一个视频" onClick={next}>
            ›
          </button>
        </div>
      </div>
      <img className="overviewCover" src={coverSrc(video)} />
      <h3>{video.title}</h3>
      <p>发布于 {date(video.published_at)}</p>
      <div className="overviewMetrics">
        <Metric label="播放量" value={compact(video.views)} />
        <Metric label="封标点击率" value={percent(video.cover_ctr)} />
        <Metric
          label="3秒跳出率"
          value={percent(video.metrics.threeSecondBounceRate)}
        />
        <Metric label="平均播放" value={seconds(video.avg_watch_seconds)} />
        <Metric label="互动率" value={percent(video.metrics.interactionRate)} />
        <Metric label="涨粉量" value={compact(video.followers_gained)} />
      </div>
      <div className="diagnosticSignals">
        <div className="signalGood">
          <b>封标点击率表现</b>
          <span>
            {video.cover_ctr == null
              ? "暂无数据"
              : video.cover_ctr >= 3
                ? "高于个人基线的潜力区间"
                : "仍有封面与标题优化空间"}
          </span>
        </div>
        <div className="signalWarn">
          <b>平均播放深度</b>
          <span>
            {video.avg_watch_percent == null
              ? "暂无数据"
              : video.avg_watch_percent >= 45
                ? "观看承接较稳定"
                : "开头与中段可能存在流失"}
          </span>
        </div>
        <div className="signalGood">
          <b>互动与转粉</b>
          <span>结论基于当前真实快照，仅代表数据关联。</span>
        </div>
      </div>
      <button className="primary inspectorPrimary" onClick={openDetails}>
        进入诊断详情 →
      </button>
      <button className="secondary inspectorSecondary" onClick={next}>
        对比其他视频
      </button>
    </aside>
  );
}
function OverviewTrend({ video }: { video?: Video }) {
  const q = useQuery({
    queryKey: ["overview-timeseries", video?.id],
    queryFn: () =>
      request<{ points: any[] }>(`/api/videos/${video?.id}/timeseries`),
    enabled: Boolean(video),
  });
  const points = q.data?.points || [];
  const option = useMemo(
    () => ({
      grid: { left: 44, right: 18, top: 54, bottom: 34 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((p) => date(p.captured_at)),
        axisLabel: { fontSize: 9 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(125,139,158,.16)" } },
      },
      series: [
        {
          type: "line",
          smooth: 0.22,
          symbolSize: 6,
          data: points.map((p) => p.views),
          lineStyle: { color: "#1477ff", width: 2.5 },
          itemStyle: { color: "#1477ff" },
          areaStyle: { color: "rgba(20,119,255,.13)" },
        },
      ],
    }),
    [points],
  );
  return (
    <section className="panel overviewTrend">
      <div className="panelHead">
        <div>
          <h2>
            播放趋势 <small>15 分钟粒度</small>
          </h2>
          <p>
            {points.length > 1
              ? "展示工具自身记录的真实快照变化"
              : "完成更多轮采集后形成真实趋势；不会补造曲线"}
          </p>
        </div>
      </div>
      <div className="trendSide">
        <Metric label="累计播放" value={compact(video?.views)} />
        <Metric label="累计涨粉" value={compact(video?.followers_gained)} />
        <Metric label="发布时间" value={date(video?.published_at)} />
        <Metric
          label="当前阶段"
          value={points.length > 1 ? "持续追踪中" : "建立基线"}
        />
      </div>
      <Chart className="overviewTrendChart" option={option} />
    </section>
  );
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
        eyebrow="自由组合三个维度"
        title="表现地图"
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
                <span>气泡：{metricLabels[size]}</span>
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
              <Chart className="mapChart" option={option} events={events} />
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
            : "气泡"}
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
        <Metric label="点击率" value={percent(video.cover_ctr)} />
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
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function VideosPage() {
  const { summary, videos, pending, error } = useData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("published");
  const [selected, setSelected] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      videos
        .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) =>
          sort === "views"
            ? (b.views || 0) - (a.views || 0)
            : sort === "followers"
              ? (b.followers_gained || 0) - (a.followers_gained || 0)
              : b.published_at.localeCompare(a.published_at),
        ),
    [videos, search, sort],
  );
  const current = shown.find((v) => v.id === (selected || shown[0]?.id));
  if (pending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  return (
    <>
      <PageIntro eyebrow={`${videos.length} 篇稿件`} title="稿件" />
      <div className="videoToolbar">
        <label className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题或 BV 号"
          />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="published">最新发布</option>
          <option value="views">播放量</option>
          <option value="followers">涨粉量</option>
        </select>
      </div>
      {!summary?.configured ? (
        <EmptyState />
      ) : (
        <div className="videosWorkspace">
          <section className="panel videoTable">
            {shown.map((v) => (
              <button
                key={v.id}
                className={v.id === current?.id ? "selected" : ""}
                onClick={() => setSelected(v.id)}
              >
                <img src={v.cover_url || ""} />
                <span>
                  <strong>{v.title}</strong>
                  <small>
                    {v.bvid} · {date(v.published_at)}
                  </small>
                </span>
                <Metric label="播放" value={compact(v.views)} />
                <Metric label="点击率" value={percent(v.cover_ctr)} />
                <Metric label="进度" value={percent(v.avg_watch_percent)} />
                <Metric label="涨粉" value={compact(v.followers_gained)} />
              </button>
            ))}
          </section>
          <VideoDetail video={current} />
        </div>
      )}
    </>
  );
}
function VideoDetail({ video }: { video?: Video }) {
  const q = useQuery({
    queryKey: ["timeseries", video?.id],
    queryFn: () =>
      request<{ points: any[] }>(`/api/videos/${video?.id}/timeseries`),
    enabled: Boolean(video),
  });
  if (!video) return null;
  const option = {
    grid: { left: 42, right: 14, top: 18, bottom: 30 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: (q.data?.points || []).map((p) => date(p.captured_at)),
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: (q.data?.points || []).map((p) => p.views),
        lineStyle: { color: "#247bff", width: 3 },
      },
    ],
  };
  return (
    <aside className="panel videoDetail">
      <img className="detailCover" src={video.cover_url || ""} />
      <h2>{video.title}</h2>
      <p>
        {video.bvid} · {seconds(video.duration_seconds)}
      </p>
      <div className="metricGrid">
        <Metric label="播放" value={compact(video.views)} />
        <Metric label="封面点击率" value={percent(video.cover_ctr)} />
        <Metric label="平均播放" value={seconds(video.avg_watch_seconds)} />
        <Metric label="平均进度" value={percent(video.avg_watch_percent)} />
        <Metric label="互动率" value={percent(video.metrics.interactionRate)} />
        <Metric
          label="播转粉率"
          value={percent(video.metrics.playToFollowRate)}
        />
      </div>
      <h3>采集历史</h3>
      {(q.data?.points?.length || 0) > 1 ? (
        <Chart className="detailTrend" option={option} />
      ) : (
        <p className="muted">完成至少两次采集后显示真实变化趋势。</p>
      )}
      <div className="audience">
        <Metric
          label="粉丝观众"
          value={percent(video.metrics.fanAudiencePercent)}
        />
        <Metric
          label="游客观众"
          value={percent(video.metrics.guestAudiencePercent)}
        />
      </div>
    </aside>
  );
}
function AnalysisLabPage() {
  const { summary } = useData();
  const [x, setX] = useState("cover_ctr");
  const [y, setY] = useState("avg_watch_percent");
  const [chart, setChart] = useState("scatter");
  const [rows, setRows] = useState<any[]>([]);
  const mutation = useMutation({
    mutationFn: () =>
      request<{ rows: any[] }>("/api/lab/query", {
        method: "POST",
        body: JSON.stringify({
          metrics: [x, y],
          xAxis: x,
          yAxis: y,
          from: "2000-01-01T00:00:00.000Z",
          to: "2100-01-01T00:00:00.000Z",
          chart,
        }),
      }),
    onSuccess: (d) => setRows(d.rows),
  });
  const option = useMemo(
    () =>
      chart === "scatter"
        ? {
            grid: { left: 52, right: 20, top: 25, bottom: 45 },
            tooltip: { trigger: "item" },
            xAxis: { name: metricLabels[x] },
            yAxis: { name: metricLabels[y] },
            series: [
              {
                type: "scatter",
                symbolSize: 18,
                data: rows.map((r) => [r[x], r[y]]),
                itemStyle: { color: "#247bff" },
              },
            ],
          }
        : {
            grid: { left: 52, right: 20, top: 25, bottom: 60 },
            tooltip: { trigger: "axis" },
            xAxis: {
              type: "category",
              data: rows.map((r) => r.title),
              axisLabel: { show: false },
            },
            yAxis: { type: "value" },
            series: [
              {
                type: chart,
                data: rows.map((r) => r[y]),
                itemStyle: { color: "#247bff" },
                lineStyle: { color: "#247bff" },
              },
            ],
          },
    [rows, x, y, chart],
  );
  return (
    <>
      <PageIntro eyebrow="组合指标、轴和图表" title="分析实验室" />
      <section className="labBuilder panel">
        <div className="labControls">
          <label>
            <span>横轴</span>
            <select value={x} onChange={(e) => setX(e.target.value)}>
              {Object.entries(metricLabels)
                .filter(([id]) => id !== "published_at")
                .map(([id, l]) => (
                  <option value={id} key={id}>
                    {l}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>纵轴</span>
            <select value={y} onChange={(e) => setY(e.target.value)}>
              {Object.entries(metricLabels)
                .filter(([id]) => id !== "published_at")
                .map(([id, l]) => (
                  <option value={id} key={id}>
                    {l}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>图表</span>
            <select value={chart} onChange={(e) => setChart(e.target.value)}>
              <option value="scatter">散点图</option>
              <option value="bar">柱状图</option>
              <option value="line">折线图</option>
            </select>
          </label>
          <button
            className="primary small"
            disabled={!summary?.configured || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <BarChart3 />
            {mutation.isPending ? "查询中" : "运行查询"}
          </button>
        </div>
        {mutation.error && <InlineError error={mutation.error} />}{" "}
        {!summary?.configured ? (
          <EmptyState />
        ) : rows.length ? (
          <Chart className="labChart" option={option} />
        ) : (
          <div className="labEmpty">
            <FlaskConical />
            <h2>构造一次真实查询</h2>
            <p>选择轴和图表后运行；结果来自 D1 的最新真实快照。</p>
          </div>
        )}
      </section>
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
    const timer = setInterval(async () => {
      try {
        const d = await request<{ state: string }>(
          `/api/bilibili/qr/status/${qr.key}`,
        );
        setQrState(d.state);
        if (d.state === "confirmed") {
          setQr(null);
          await qc.invalidateQueries({ queryKey: ["bili-status"] });
        }
      } catch (e) {
        setError((e as Error).message);
        setQrState("expired");
      }
    }, 1800);
    return () => clearInterval(timer);
  }, [qr, qrState, qc]);
  const collect = useMutation({
    mutationFn: () =>
      request<any>("/api/bilibili/collect-now", { method: "POST" }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["bili-status"] }),
        qc.invalidateQueries({ queryKey: ["summary"] }),
        qc.invalidateQueries({ queryKey: ["videos"] }),
      ]);
    },
  });
  const disconnect = useMutation({
    mutationFn: () =>
      request("/api/bilibili/qr/disconnect", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bili-status"] }),
  });
  const run = status.data?.lastRun;
  return (
    <>
      <PageIntro eyebrow="工具自身持有会话并主动采集" title="数据源" />
      <div className="sourceGrid">
        <section className="panel connectionCard">
          <div className="serviceIcon bilibili">
            <Play fill="currentColor" />
          </div>
          <h2>B 站创作中心</h2>
          <p>扫码产生本项目专用会话；不读取 Codex 或其他浏览器的 Cookie。</p>
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
              <button className="secondary" onClick={() => disconnect.mutate()}>
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
        </section>
        <section className="panel runCard">
          <div className="panelHead">
            <div>
              <h2>最近一次采集</h2>
              <p>15 分钟任务使用相同的数据源适配器</p>
            </div>
          </div>
          {run ? (
            <>
              <div className="runHero">
                <b className={run.status}>{run.status}</b>
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
                  <dt>字段覆盖</dt>
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
            <p>用于补齐扫码连接前的历史，不会替代自动采集。</p>
          </div>
          <button className="secondary">选择 CSV / Excel</button>
        </section>
      </div>
    </>
  );
}
function SettingsPage() {
  return (
    <>
      <PageIntro eyebrow="凭据、备份与设备" title="设置" />
      <div className="settingsGrid">
        <DeepSeekSettings />
        <section className="panel settingCard">
          <div className="settingIcon">
            <Upload />
          </div>
          <div>
            <h2>Google Drive 备份</h2>
            <p>
              Codex 的 Drive 授权不能转交给这个独立网页。网页仍需自己的 Google
              OAuth Client，配置后在这里授权一次。
            </p>
            <span className="statusPill">等待 OAuth 客户端</span>
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
function AIChat({ close }: { close: () => void }) {
  return (
    <div className="sheetScrim" onClick={close}>
      <section className="aiSheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheetHead">
          <div className="aiOrb">
            <Bot />
          </div>
          <div>
            <h2>问问数据</h2>
            <p>仅发送规范化数据；聊天只保留在当前会话</p>
          </div>
          <button className="iconButton" onClick={close}>
            <X />
          </button>
        </div>
        <div className="chatBody">
          <div className="message">
            先在设置中填写并测试 DeepSeek API Key，再连接真实 B
            站快照。当前不会发送演示数据。
          </div>
        </div>
        <div className="composer">
          <input placeholder="问一个关于真实数据的问题…" />
          <button>发送</button>
        </div>
      </section>
    </div>
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
  return (
    <section className="empty panel">
      <X />
      <h2>无法读取数据</h2>
      <p>{(error as Error).message}</p>
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
        {Object.entries(details.metricCounts).map(([key, count]) => (
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
      {details.missingByVideo.length > 0 && (
        <details>
          <summary>
            {details.missingByVideo.length} 篇稿件存在未返回字段
          </summary>
          <ul>
            {details.missingByVideo.map((video) => (
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
  const [page, setPage] = useState("概览");
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const [ai, setAi] = useState(false);
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
      <OverviewPage setPage={setPage} />
    ) : page === "表现地图" ? (
      <PerformanceMapPage />
    ) : page === "稿件" ? (
      <VideosPage />
    ) : page === "分析实验室" ? (
      <AnalysisLabPage />
    ) : page === "数据源" ? (
      <DataSourcePage />
    ) : (
      <SettingsPage />
    );
  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />
      <main>
        <Topbar
          theme={theme}
          setTheme={setTheme}
          onAI={() => setAi(true)}
          summary={summary.data}
        />
        <div className="mobileHeader">
          <Logo />
          <button className="iconButton">
            <Menu />
          </button>
        </div>
        <div className="pageStage" key={page}>
          {content}
        </div>
      </main>
      <nav className="mobileNav">
        {[
          ["概览", Home],
          ["稿件", FileChartColumn],
          ["分析实验室", FlaskConical],
          ["设置", Settings],
        ].map(([p, I]: any) => (
          <button
            key={p}
            className={page === p ? "active" : ""}
            onClick={() => setPage(p)}
          >
            <I />
            <span>{p === "分析实验室" ? "实验室" : p}</span>
          </button>
        ))}
      </nav>
      {ai && <AIChat close={() => setAi(false)} />}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
