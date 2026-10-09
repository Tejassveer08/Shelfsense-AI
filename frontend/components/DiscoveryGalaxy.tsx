"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Filter, Star, BookOpen, Sparkles, X } from "lucide-react";
import { GalaxyNode } from "@/lib/types";

interface DiscoveryGalaxyProps {
  nodes: GalaxyNode[];
  categories: string[];
  onSelectBook?: (isbn13: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Fiction": "#F59E0B",
  "Mystery & Thriller": "#EF4444",
  "Sci-Fi & Fantasy": "#6366F1",
  "Romance": "#EC4899",
  "Biography & Memoir": "#10B981",
  "History & Politics": "#8B5CF6",
  "Philosophy & Religion": "#06B6D4",
  "Science & Nature": "#14B8A6",
  "Young Adult & Children": "#F97316",
  "Arts & Literature": "#3B82F6",
  "Comics & Graphic Novels": "#84CC16",
  "Business & Self-Help": "#D946EF",
};

export function DiscoveryGalaxy({ nodes, categories, onSelectBook }: DiscoveryGalaxyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover and selection state
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GalaxyNode | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Filtered nodes
  const visibleNodes = React.useMemo(() => {
    if (activeCategory === "All") return nodes;
    return nodes.filter((n) => n.category === activeCategory);
  }, [nodes, activeCategory]);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(550, window.innerHeight - 200),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Coordinate transformation helpers
  // UMAP coords are in [-100, 100]
  const toScreenX = useCallback((coordX: number, w: number) => {
    const cx = w / 2 + pan.x;
    const scale = (w / 240) * zoom;
    return cx + coordX * scale;
  }, [pan.x, zoom]);

  const toScreenY = useCallback((coordY: number, h: number) => {
    const cy = h / 2 + pan.y;
    const scale = (h / 240) * zoom;
    return cy + coordY * scale;
  }, [pan.y, zoom]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear background
    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#0A0D12" : "#F7F4EE";
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid lines
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
    ctx.lineWidth = 1;
    const step = 80 * zoom;
    for (let x = (pan.x % step); x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = (pan.y % step); y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw neighbor lines if node is selected
    if (selectedNode) {
      const sx = toScreenX(selectedNode.x, width);
      const sy = toScreenY(selectedNode.y, height);

      // Find 5 closest points in UMAP space
      const neighbors = [...nodes]
        .filter((n) => n.isbn13 !== selectedNode.isbn13)
        .sort((a, b) => {
          const distA = Math.hypot(a.x - selectedNode.x, a.y - selectedNode.y);
          const distB = Math.hypot(b.x - selectedNode.x, b.y - selectedNode.y);
          return distA - distB;
        })
        .slice(0, 6);

      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      neighbors.forEach((nb) => {
        const nx = toScreenX(nb.x, width);
        const ny = toScreenY(nb.y, height);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Draw nodes
    const nodeRadius = Math.max(2.5, Math.min(6, 3.2 * Math.sqrt(zoom)));

    visibleNodes.forEach((node) => {
      const px = toScreenX(node.x, width);
      const py = toScreenY(node.y, height);

      // Culling outside viewport
      if (px < -20 || px > width + 20 || py < -20 || py > height + 20) return;

      const isHovered = hoveredNode?.isbn13 === node.isbn13;
      const isSelected = selectedNode?.isbn13 === node.isbn13;

      const color = CATEGORY_COLORS[node.category] || "#94A3B8";

      ctx.beginPath();
      ctx.arc(px, py, isSelected ? nodeRadius * 2.2 : (isHovered ? nodeRadius * 1.8 : nodeRadius), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isSelected || isHovered ? 1.0 : 0.82;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1.0;
  }, [dimensions, visibleNodes, zoom, pan, hoveredNode, selectedNode, toScreenX, toScreenY, nodes]);

  // Mouse interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      // Check node hover
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let closest: GalaxyNode | null = null;
      let minDistance = 14; // pixels threshold

      const { width, height } = dimensions;
      for (const node of visibleNodes) {
        const sx = toScreenX(node.x, width);
        const sy = toScreenY(node.y, height);
        const dist = Math.hypot(sx - mouseX, sy - mouseY);
        if (dist < minDistance) {
          minDistance = dist;
          closest = node;
        }
      }

      setHoveredNode(closest);
      if (closest) {
        setHoverPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
    } else {
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => Math.max(0.4, Math.min(8.0, prev * factor)));
  };

  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <div ref={containerRef} className="relative w-full rounded-3xl overflow-hidden border border-[var(--border-library)] bg-[var(--bg-surface)] shadow-xl">
      {/* Top Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-library)] shadow-sm pointer-events-auto max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === "All"
                ? "bg-[var(--accent-amber)] text-white shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            All Genres ({nodes.length})
          </button>
          {categories.slice(0, 7).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-[var(--accent-amber)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] || "#94A3B8" }}
              />
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-library)] shadow-sm pointer-events-auto">
          <button
            onClick={() => setZoom((z) => Math.min(8.0, z * 1.25))}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height, cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="block touch-none"
      />

      {/* Hover Floating Card */}
      {hoveredNode && !isDragging && (
        <div
          className="fixed pointer-events-none z-50 p-3 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-library)] shadow-2xl flex gap-3 max-w-xs animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: Math.min(window.innerWidth - 280, hoverPos.x + 15),
            top: Math.min(window.innerHeight - 150, hoverPos.y + 15),
          }}
        >
          <img
            src={hoveredNode.cover}
            alt={hoveredNode.title}
            className="w-12 h-16 object-cover rounded-lg shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <span
              className="text-[10px] font-bold uppercase tracking-wider block truncate"
              style={{ color: CATEGORY_COLORS[hoveredNode.category] || "#F59E0B" }}
            >
              {hoveredNode.category}
            </span>
            <h4 className="font-editorial text-xs font-bold text-[var(--text-primary)] truncate">
              {hoveredNode.title}
            </h4>
            <p className="text-[10px] text-[var(--text-muted)] truncate">
              {hoveredNode.authors}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                {hoveredNode.rating}
              </span>
              <span>{hoveredNode.pages}p</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 z-20 p-4 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-library)] shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={selectedNode.cover}
              alt={selectedNode.title}
              className="w-12 h-16 object-cover rounded-lg shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: CATEGORY_COLORS[selectedNode.category] || "#F59E0B" }}
              >
                {selectedNode.category} &bull; Clicked Volume &amp; Semantic Cluster
              </span>
              <h3 className="font-editorial text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
                {selectedNode.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate">
                by {selectedNode.authors} ({selectedNode.year})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectBook && (
              <button
                onClick={() => onSelectBook(selectedNode.isbn13)}
                className="px-4 py-2 rounded-xl bg-[var(--accent-amber)] text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Open Book Page
              </button>
            )}
            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--border-library)] text-[var(--text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
