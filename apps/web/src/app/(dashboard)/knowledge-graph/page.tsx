"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { ApiResponse, GraphNode, GraphEdge, KnowledgeGraph } from "@linkvault/shared";

// Dynamic import — react-force-graph-2d uses canvas and must be client-only
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
    </div>
  ),
});

// ============================================================
// Knowledge Graph — Visual force-graph of link relationships
// ============================================================

type NodeTypeFilter = "link" | "tag" | "category" | "domain";

const NODE_COLORS: Record<string, string> = {
  link: "#e8e4de",     // paper
  tag: "#c45d3e",      // accent
  category: "#c9a84c", // gold
  domain: "#5a9e6f",   // success
};

const NODE_TYPE_LABELS: Record<string, string> = {
  link: "Links",
  tag: "Tags",
  category: "Categories",
  domain: "Domains",
};

export default function KnowledgeGraphPage() {
  const { accessToken } = useAuthStore();
  const { addToast } = useToastStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<NodeTypeFilter>>(
    new Set(["link", "tag", "category", "domain"])
  );
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const fetchGraph = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<KnowledgeGraph>>(
        "/graph?limit=300",
        accessToken
      );
      setGraph(res.data);
    } catch {
      addToast("Failed to load knowledge graph", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, addToast]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Resize observer for container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Filter graph data based on visible types
  const filteredGraph = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };

    const visibleNodes = graph.nodes.filter((n) =>
      visibleTypes.has(n.type as NodeTypeFilter)
    );
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    const visibleEdges = graph.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    return {
      nodes: visibleNodes.map((n) => ({
        ...n,
        color: NODE_COLORS[n.type] || "#e8e4de",
        val: (n.size || 3) * 1.5,
      })),
      links: visibleEdges.map((e) => ({
        source: e.source,
        target: e.target,
        value: e.weight,
      })),
    };
  }, [graph, visibleTypes]);

  function toggleType(type: NodeTypeFilter) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow removing all types
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  // Stats
  const stats = useMemo(() => {
    if (!graph) return null;
    const counts: Record<string, number> = {};
    for (const n of graph.nodes) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return {
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      counts,
    };
  }, [graph]);

  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="font-display text-display-sm text-paper font-bold tracking-tight">
          Knowledge Graph
        </h1>
        <p className="text-sm text-paper-dim font-body mt-1">
          Visual map of connections between your links, tags, categories, and domains
        </p>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 mb-4">
        {/* Type filters */}
        {(Object.keys(NODE_COLORS) as NodeTypeFilter[]).map((type) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-body font-medium border transition-all duration-200",
              visibleTypes.has(type)
                ? "border-ink-400 bg-ink-200 text-paper"
                : "border-ink-300 bg-ink-50 text-paper-faint"
            )}
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: NODE_COLORS[type],
                opacity: visibleTypes.has(type) ? 1 : 0.3,
              }}
            />
            {NODE_TYPE_LABELS[type]}
            {stats && (
              <span className="text-paper-faint tabular-nums">
                {stats.counts[type] || 0}
              </span>
            )}
          </button>
        ))}

        {/* Stats */}
        {stats && (
          <span className="ml-auto text-micro text-paper-faint tabular-nums">
            {stats.totalNodes} nodes / {stats.totalEdges} edges
          </span>
        )}
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        className="flex-1 border border-ink-300 bg-ink overflow-hidden relative"
        style={{ borderRadius: "var(--radius-md)", minHeight: "400px" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-ink-500 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-paper-dim font-body">Building graph...</p>
          </div>
        ) : !graph || graph.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="w-16 h-16 bg-ink-200 flex items-center justify-center"
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <svg className="w-8 h-8 text-paper-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-paper-dim font-body">No links to visualize</p>
            <p className="text-caption text-paper-faint">Save some links first to see your knowledge graph</p>
          </div>
        ) : (
          <ForceGraph2D
            graphData={filteredGraph}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#0a0a0c"
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            nodeColor={(node: any) => node.color || "#e8e4de"}
            nodeVal={(node: any) => node.val || 3}
            linkColor={() => "rgba(255,255,255,0.06)"}
            linkWidth={(link: any) => Math.max(0.5, (link.value || 1) * 0.5)}
            onNodeHover={(node: any) => setHoveredNode(node || null)}
            onNodeClick={(node: any) => {
              if (node.url) {
                try {
                  const parsed = new URL(node.url);
                  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                    window.open(node.url, "_blank", "noopener,noreferrer");
                  }
                } catch {
                  // Invalid URL — ignore click
                }
              }
            }}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const size = Math.sqrt(node.val || 3) * 2;
              const isHovered = hoveredNode?.id === node.id;

              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.fillStyle = node.color || "#e8e4de";
              ctx.globalAlpha = isHovered ? 1 : 0.8;
              ctx.fill();

              // Draw label only at sufficient zoom or if hovered
              if (globalScale > 1.5 || isHovered) {
                const label = node.label || "";
                const fontSize = isHovered ? 12 / globalScale : 10 / globalScale;
                ctx.font = `${fontSize}px "DM Sans", sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillStyle = isHovered ? "#e8e4de" : "rgba(232, 228, 222, 0.6)";
                ctx.globalAlpha = 1;
                ctx.fillText(
                  label.length > 25 ? label.slice(0, 22) + "..." : label,
                  node.x,
                  node.y + size + 2
                );
              }

              ctx.globalAlpha = 1;
            }}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}

        {/* Hovered node tooltip */}
        {hoveredNode && (
          <div
            className="absolute bottom-4 left-4 bg-ink-100 border border-ink-400 px-4 py-3 animate-fade-in pointer-events-none max-w-xs"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: NODE_COLORS[hoveredNode.type] }}
              />
              <span className="text-micro uppercase tracking-editorial text-paper-faint font-medium">
                {hoveredNode.type}
              </span>
            </div>
            <p className="text-sm text-paper font-body font-medium truncate">
              {hoveredNode.label}
            </p>
            {hoveredNode.url && (
              <p className="text-micro text-paper-faint mt-0.5 truncate">
                Click to open
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
