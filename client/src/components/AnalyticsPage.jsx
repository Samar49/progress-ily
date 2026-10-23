import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAnalyticsSummary } from "../api.js";
import DatePicker from "./common/DatePicker.jsx";

const CATEGORY_COLORS = [
  "#07865c",
  "#4f83f1",
  "#9b75e8",
  "#f2a541",
  "#e56a75",
  "#31a6b8",
  "#8995a7",
];

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load analytics. Please try again."
  );
}

function Metric({ title, value, detail, icon: Icon, tone }) {
  return (
    <article className="metric">
      <div>
        <label>{title}</label>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>

      <span className={`icon-box ${tone}`} aria-hidden="true">
        <Icon size={22} />
      </span>
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <div
      style={{
        minHeight: 210,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        color: "var(--muted)",
        padding: 24,
      }}
    >
      <div>
        <Activity size={28} style={{ marginBottom: 8, opacity: 0.65 }} />
        <p style={{ margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAnalyticsSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setSummary(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    let active = true;

    async function fetchAnalytics() {
      setLoading(true);
      setError("");

      try {
        const result = await getAnalyticsSummary({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (active) {
          setSummary(result);
        }
      } catch (requestError) {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, [startDate, endDate]);

  const counts = summary?.taskCounts ?? {};
  const goalCounts = summary?.goalCounts ?? {};
  const trend = summary?.dailyTrend ?? [];
  const categories = summary?.categoryBreakdown ?? [];
  const priorities = summary?.priorityBreakdown ?? [];
  const goals = summary?.goals ?? [];

  const categoryData = categories.map((item) => ({
    name: item.name,
    value: item.count,
  }));

  const priorityData = priorities.map((item) => ({
    name: item.name,
    value: item.count,
  }));

  const activeGoals = goals.filter((goal) => goal.status === "Active");

  return (
    <main className="content">
      <div className="page-title">
        <div>
          <h1>Analytics</h1>
          <p>Understand your productivity through your saved tasks and goals.</p>
        </div>

        <button type="button" className="primary-button" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw size={16} />
          {loading ? "Loading..." : "Refresh data"}
        </button>
      </div>

      <section
        className="panel"
        style={{
          padding: 16,
          marginBottom: 20,
          display: "flex",
          alignItems: "end",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="analytics-start-date">Start date</label>
          <DatePicker
            id="analytics-start-date"
            value={startDate}
            max={endDate || undefined}
            clearable
            placeholder="Any start"
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="analytics-end-date">End date</label>
          <DatePicker
            id="analytics-end-date"
            value={endDate}
            min={startDate || undefined}
            clearable
            placeholder="Any end"
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="secondary-button"
          disabled={loading || (!startDate && !endDate)}
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
        >
          Clear dates
        </button>
      </section>

      {error && (
        <div className="feedback-message error" role="alert" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} />
          <p>{error}</p>
          <button type="button" onClick={loadAnalytics} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      {loading && !summary ? (
        <section className="panel" style={{ padding: 24 }}>
          <p role="status">Loading your analytics...</p>
        </section>
      ) : !error || summary ? (
        <>
          <section className="metrics four" aria-label="Task summary">
            <Metric
              title="Total tasks"
              value={counts.total ?? 0}
              detail="Tasks in selected period"
              icon={Activity}
              tone="blue"
            />

            <Metric
              title="Completed"
              value={counts.completed ?? 0}
              detail={`${summary?.completionRate ?? 0}% completion rate`}
              icon={CheckCircle2}
              tone="green"
            />

            <Metric
              title="Pending"
              value={counts.pending ?? 0}
              detail="Waiting to be started"
              icon={CircleDashed}
              tone="orange"
            />

            <Metric
              title="In progress"
              value={counts.inProgress ?? 0}
              detail={`${counts.highPriority ?? 0} high-priority tasks`}
              icon={TrendingUp}
              tone="purple"
            />
          </section>

          <section className="chart-grid" style={{ marginTop: 20 }}>
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Seven-day activity</h2>
                  <p
                    style={{
                      color: "var(--muted)",
                      margin: "5px 0 0",
                      fontSize: 13,
                    }}
                  >
                    Tasks grouped by scheduled date
                  </p>
                </div>
              </div>

              {trend.length === 0 ? (
                <EmptyState message="No trend data is available yet." />
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trend}
                      margin={{
                        top: 12,
                        right: 12,
                        left: -18,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                      <XAxis dataKey="label" tickLine={false} axisLine={false} />

                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />

                      <Tooltip />
                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Scheduled tasks"
                        stroke="#4f83f1"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="completed"
                        name="Completed tasks"
                        stroke="#07865c"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Tasks by category</h2>
                  <p
                    style={{
                      color: "var(--muted)",
                      margin: "5px 0 0",
                      fontSize: 13,
                    }}
                  >
                    Distribution in the selected period
                  </p>
                </div>
              </div>

              {categoryData.length === 0 ? (
                <EmptyState message="Add tasks to see category insights." />
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="46%"
                        outerRadius={82}
                        innerRadius={48}
                        paddingAngle={3}
                      >
                        {categoryData.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </section>

          <section className="chart-grid" style={{ marginTop: 20 }}>
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Tasks by priority</h2>
                  <p
                    style={{
                      color: "var(--muted)",
                      margin: "5px 0 0",
                      fontSize: 13,
                    }}
                  >
                    Current distribution
                  </p>
                </div>
              </div>

              {priorityData.length === 0 ? (
                <EmptyState message="No priority data is available." />
              ) : (
                <div style={{ display: "grid", gap: 18, padding: "20px 0" }}>
                  {priorityData.map((item) => {
                    const percentage = counts.total
                      ? Math.round((item.value / counts.total) * 100)
                      : 0;

                    return (
                      <div key={item.name}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 7,
                          }}
                        >
                          <strong>{item.name}</strong>
                          <span style={{ color: "var(--muted)" }}>
                            {item.value} ({percentage}%)
                          </span>
                        </div>

                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            overflow: "hidden",
                            background: "var(--border)",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${percentage}%`,
                              background:
                                item.name === "High"
                                  ? "#e56a75"
                                  : item.name === "Medium"
                                    ? "#f2a541"
                                    : "#07865c",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Goal overview</h2>
                  <p
                    style={{
                      color: "var(--muted)",
                      margin: "5px 0 0",
                      fontSize: 13,
                    }}
                  >
                    All your saved goals
                  </p>
                </div>

                <span className="icon-box green" aria-hidden="true">
                  <Target size={21} />
                </span>
              </div>

              <div className="metrics" style={{ marginTop: 18 }}>
                <Metric
                  title="Active"
                  value={goalCounts.active ?? 0}
                  detail="Currently active"
                  icon={Target}
                  tone="green"
                />

                <Metric
                  title="Completed"
                  value={goalCounts.completed ?? 0}
                  detail="Goals achieved"
                  icon={CheckCircle2}
                  tone="blue"
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  Average progress across active goals
                </p>

                <strong style={{ fontSize: 30 }}>{summary?.averageActiveGoalProgress ?? 0}%</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  marginTop: 12,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                <span>On hold: {goalCounts.onHold ?? 0}</span>
                <span>Overdue: {goalCounts.overdue ?? 0}</span>
                <span>Due soon: {goalCounts.dueSoon ?? 0}</span>
              </div>
            </article>
          </section>

          <section className="panel" style={{ marginTop: 20, padding: 22 }}>
            <div className="panel-heading">
              <div>
                <h2>Active goal progress</h2>
                <p
                  style={{
                    color: "var(--muted)",
                    margin: "5px 0 0",
                    fontSize: 13,
                  }}
                >
                  Progress calculated by the backend
                </p>
              </div>
            </div>

            {activeGoals.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>
                You have no active goals yet. Create a goal to start tracking long-term progress.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
                {activeGoals.map((goal) => {
                  const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));

                  return (
                    <div key={goal.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 7,
                        }}
                      >
                        <strong style={{ overflowWrap: "anywhere" }}>{goal.title}</strong>

                        <span
                          style={{
                            color: "var(--muted)",
                            flexShrink: 0,
                          }}
                        >
                          {progress}%
                        </span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label={`${goal.title} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        style={{
                          height: 8,
                          background: "var(--border)",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            background: "var(--primary, #07865c)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
