/**
 * /admin/agents — Monitoring dashboard for Ruflo agents
 * Shows: health status, last runs, success rates, error logs
 */

"use client";

import { useEffect, useState } from "react";

interface AgentStatus {
  agent: string;
  status: "healthy" | "degraded" | "down";
  last_run_at?: string;
  last_success_at?: string;
  success_rate_pct?: number;
  avg_duration_ms?: number;
  last_error_message?: string;
  recommendations?: string[];
}

export default function AgentsMonitoringPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const agentNames = ["agent-1-tse", "agent-2-institutos", "agent-3-validacao"];
      const results = await Promise.all(
        agentNames.map(async (name) => {
          const res = await fetch(`/api/health/${name}`);
          const data = await res.json();
          return {
            agent: name,
            status: data.status,
            ...data.metrics,
            recommendations: data.recommendations,
          };
        })
      );
      setAgents(results);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error fetching health:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "degraded":
        return "bg-yellow-100 text-yellow-800";
      case "down":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "healthy":
        return "✅";
      case "degraded":
        return "⚠️";
      case "down":
        return "🔴";
      default:
        return "❓";
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: "20px", borderBottom: "2px solid #ccc", paddingBottom: "10px" }}>
        <h1>🤖 Ruflo Agents Monitor</h1>
        <p>Last refresh: {lastRefresh}</p>
        <button
          onClick={fetchHealth}
          style={{
            padding: "8px 16px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {loading ? "Refreshing..." : "Refresh Now"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
        {agents.map((agent) => (
          <div
            key={agent.agent}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "16px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "18px" }}>{agent.agent}</h2>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
                className={getStatusColor(agent.status)}
              >
                {getStatusEmoji(agent.status)} {agent.status.toUpperCase()}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "12px",
                fontSize: "14px",
              }}
            >
              <div>
                <strong>Last Run:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                  {agent.last_run_at ? new Date(agent.last_run_at).toLocaleString() : "Never"}
                </p>
              </div>
              <div>
                <strong>Success Rate:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                  {agent.success_rate_pct !== undefined ? `${agent.success_rate_pct}%` : "N/A"}
                </p>
              </div>
              <div>
                <strong>Avg Duration:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                  {agent.avg_duration_ms ? `${agent.avg_duration_ms}ms` : "N/A"}
                </p>
              </div>
              <div>
                <strong>Last Success:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#666" }}>
                  {agent.last_success_at ? new Date(agent.last_success_at).toLocaleString() : "Never"}
                </p>
              </div>
            </div>

            {agent.last_error_message && (
              <div
                style={{
                  backgroundColor: "#fee",
                  padding: "8px",
                  borderRadius: "4px",
                  marginBottom: "12px",
                  fontSize: "13px",
                }}
              >
                <strong>Last Error:</strong> {agent.last_error_message}
              </div>
            )}

            {agent.recommendations && agent.recommendations.length > 0 && (
              <div
                style={{
                  backgroundColor: "#fef3cd",
                  padding: "8px",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
              >
                <strong>Recommendations:</strong>
                <ul style={{ margin: "4px 0 0 16px" }}>
                  {agent.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: "12px",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <p>
          <strong>Info:</strong> This dashboard queries the health API every 60 seconds. Each agent
          shows its status based on success rate:
        </p>
        <ul style={{ marginTop: "8px" }}>
          <li>✅ Healthy: &gt;90% success rate</li>
          <li>⚠️ Degraded: 50-90% success rate</li>
          <li>🔴 Down: &lt;50% success rate or no recent runs</li>
        </ul>
      </div>
    </div>
  );
}
