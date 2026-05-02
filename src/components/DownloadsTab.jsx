import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Lock, ShieldAlert } from "lucide-react";
import { getDownloadItems } from "@/lib/downloads";

function isLightColor(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function badgeStyle(status, accent) {
  if (status === "maintenance") {
    return {
      color: "#f59e0b",
      borderColor: "rgba(245, 158, 11, 0.35)",
      background: "rgba(245, 158, 11, 0.12)",
      label: "MAINTENANCE",
    };
  }
  if (status === "down") {
    return {
      color: "#ef4444",
      borderColor: "rgba(239, 68, 68, 0.35)",
      background: "rgba(239, 68, 68, 0.12)",
      label: "DOWN",
    };
  }
  return {
    color: accent || "#22c55e",
    borderColor: `${accent || "#22c55e"}50`,
    background: `${accent || "#22c55e"}15`,
    label: "STABLE",
  };
}

export default function DownloadsTab({ accent, session }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getDownloadItems();
      if (!cancelled) setItems(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  function handlePrimary(item) {
    if (!item.file_url || item.status !== "stable") return;
    const isInternal = (item.name || "").toLowerCase().includes("internal");
    if (isInternal && !session?.internal_license) {
      alert("Internal downloads are restricted to Internal License holders.");
      return;
    }
    window.open(item.file_url, "_blank", "noopener,noreferrer");
  }

  function handleOpen(item) {
    if (!item.open_url) return;
    const isInternal = (item.name || "").toLowerCase().includes("internal");
    if (isInternal && !session?.internal_license) {
      alert("Internal resources are restricted to Internal License holders.");
      return;
    }
    window.open(item.open_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 pt-4">
      {sortedItems.length === 0 && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl px-6 py-5">
          <p className="text-zinc-500 text-sm">No download items configured yet.</p>
        </div>
      )}
      {sortedItems.map((item) => {
        const isInternal = (item.name || "").toLowerCase().includes("internal");
        const hasInternalLicense = !!session?.internal_license;
        const isRestricted = isInternal && !hasInternalLicense;

        const badge = badgeStyle(item.status, accent);
        const disabledPrimary = item.status !== "stable" || !item.file_url || isRestricted;
        const accentText = isLightColor(accent) ? "#000" : "#fff";
        const accentBorder = isLightColor(accent) ? "1px solid #444" : "none";
        return (
          <div
            key={item.id}
            className={`bg-[#111114] border border-zinc-800/60 rounded-xl px-6 py-4 flex items-center justify-between transition-opacity ${isRestricted ? 'opacity-75' : ''}`}
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-white font-semibold text-2xl ${isRestricted ? 'text-zinc-500' : ''}`}>
                  {item.name}
                </span>
                {isRestricted ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500">
                    <Lock size={10} />
                    INTERNAL ONLY
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      color: badge.color,
                      borderColor: badge.borderColor,
                      background: badge.background,
                    }}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              <p className="text-zinc-600 text-xs">{item.version}</p>
            </div>
            <div className="flex items-center gap-2">
              {isRestricted ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1 uppercase tracking-wider font-bold">
                    <ShieldAlert size={10} /> License Required
                  </span>
                  <p className="text-[9px] text-zinc-600 max-w-[150px] text-right">Upgrade to internal to unlock this download.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handlePrimary(item)}
                    disabled={disabledPrimary}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: disabledPrimary ? "#1a1a1e" : accent,
                      color: disabledPrimary ? "#71717a" : accentText,
                      border: disabledPrimary ? "1px solid rgb(63 63 70 / 0.6)" : accentBorder,
                    }}
                  >
                    <Download size={12} />
                    {item.action_label || "DOWNLOAD"}
                  </button>
                  {!!item.open_url && (
                    <button
                      onClick={() => handleOpen(item)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-300 hover:text-white hover:border-zinc-500"
                    >
                      <ExternalLink size={12} />
                      OPEN
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
