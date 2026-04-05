import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const IS_TAURI = Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__);

export function Titlebar({ bg, color, border }: { bg: string, color: string, border: string }) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!IS_TAURI) return;
    
    const appWindow = getCurrentWindow();
    
    // Check initial state
    appWindow.isMaximized().then(setIsMaximized);
    
    // Listen to resize events to toggle icon (optional, might not be necessary if toggleMaximize works)
    let unlisten: (() => void) | undefined;
    appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    }).then(u => unlisten = u);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (!IS_TAURI) return null;

  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 32,
        background: bg,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        flexShrink: 0,
        WebkitUserSelect: "none",
        userSelect: "none",
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div
        data-tauri-drag-region
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          fontSize: 12,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: color,
        }}
      >
        TextDiff
      </div>

      <div style={{ display: "flex", height: "100%" }}>
        <TitlebarButton
          icon="—"
          color={color}
          onClick={() => appWindow.minimize()}
        />
        <TitlebarButton
          icon={isMaximized ? "❐" : "◻"}
          color={color}
          onClick={() => appWindow.toggleMaximize()}
        />
        <TitlebarButton
          icon="✕"
          color={color}
          onClick={() => appWindow.close()}
          isClose
        />
      </div>
    </div>
  );
}

function TitlebarButton({ icon, onClick, isClose, color }: { icon: string, onClick: () => void, isClose?: boolean, color: string }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        width: 46,
        height: "100%",
        cursor: "default",
        color: hover && isClose ? "#fff" : color,
        background: hover ? (isClose ? "#e81123" : "rgba(128,128,128,0.2)") : "transparent",
        transition: "background 0.1s",
        fontSize: 12,
        fontFamily: "system-ui",
      }}
    >
      {icon}
    </div>
  );
}
