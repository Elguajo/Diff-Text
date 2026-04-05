import { useState, useRef, useCallback, useEffect } from "react";
import { DiffEditor } from "@monaco-editor/react";
import type * as MonacoTypes from "monaco-editor";
import { Titlebar } from "./components/Titlebar";

// ─── Tauri ────────────────────────────────────────────────────────────────────
const IS_TAURI = Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__);

async function tauriOpenFile(): Promise<{ path: string; content: string } | null> {
  if (!IS_TAURI) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  const path = await open({
    filters: [{ name: "Text", extensions: ["txt","md","json","js","ts","tsx","jsx","py","rb","html","css","rs","go","java","kt","swift","c","cpp","h","yaml","yml","toml","sh"] }],
    multiple: false,
  });
  if (!path || typeof path !== "string") return null;
  return { path, content: await readTextFile(path) };
}

async function tauriSaveFile(defaultPath: string | undefined, content: string): Promise<string | null> {
  if (!IS_TAURI) {
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([content], { type: "text/plain" })),
      download: defaultPath?.split(/[\\/]/).pop() ?? "modified.txt",
    });
    a.click();
    return null;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const path = await save({ defaultPath });
  if (!path) return null;
  await writeTextFile(path, content);
  return path;
}

// ─── Persistence ──────────────────────────────────────────────────────────────
function lsGet<T>(k: string, d: T): T {
  try { const v = localStorage.getItem("td." + k); return v != null ? (JSON.parse(v) as T) : d; }
  catch { return d; }
}
function lsSet<T>(k: string, v: T) { localStorage.setItem("td." + k, JSON.stringify(v)); }

// ─── Types ────────────────────────────────────────────────────────────────────
type Theme = "kilo-dark" | "kilo-light";
type Mode  = "file" | "text";

interface Doc   { content: string; path?: string; label: string; }
interface Stats { total: number; added: number; removed: number; modified: number; }
interface Mark  { pct: number; kind: "add" | "del" | "mod"; }

// ─── Palette (Kilocode / GitHub dark) ────────────────────────────────────────
const DARK = {
  bg: "#0d1117", tab: "#161b22", tabBorder: "#30363d",
  text: "#e6edf3", muted: "#7d8590", dim: "#484f58",
  add: "#3fb950", del: "#f85149", mod: "#d29922",
  accent: "#58a6ff", mono: "'Fira Code','Cascadia Code',Consolas,monospace",
  statusBg: "#1f6feb",
};
const LIGHT = {
  bg: "#ffffff", tab: "#f6f8fa", tabBorder: "#d0d7de",
  text: "#1f2328", muted: "#656d76", dim: "#bbc1c8",
  add: "#1a7f37", del: "#cf222e", mod: "#9a6700",
  accent: "#0969da", mono: "'Fira Code','Cascadia Code',Consolas,monospace",
  statusBg: "#0969da",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const base = (p: string) => p.split(/[\\/]/).pop() || p;
const dirParts = (p: string) => p.split(/[\\/]/).slice(0, -1);

function detectLang(label: string) {
  const ext = label.split(".").pop()?.toLowerCase() ?? "";
  return ({"js":"javascript","jsx":"javascript","ts":"typescript","tsx":"typescript",
    "py":"python","rb":"ruby","rs":"rust","go":"go","java":"java","kt":"kotlin",
    "swift":"swift","c":"c","cpp":"cpp","h":"cpp","html":"html","css":"css",
    "json":"json","md":"markdown","sh":"shell","yaml":"yaml","yml":"yaml","toml":"toml"
  } as Record<string,string>)[ext] || "plaintext";
}

// ─── Tiny icon button ─────────────────────────────────────────────────────────
function IBtn({ onClick, children, title, disabled, active, accent }: {
  onClick: () => void; children: React.ReactNode; title?: string;
  disabled?: boolean; active?: boolean; accent?: string;
}) {
  const [hov, setHov] = useState(false);
  const col = accent ?? "#58a6ff";
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "2px 7px", borderRadius: 4, border: "none",
        background: active ? `${col}22` : hov && !disabled ? "rgba(255,255,255,0.07)" : "transparent",
        color: active ? col : disabled ? "#484f58" : "#7d8590",
        cursor: disabled ? "default" : "pointer", fontSize: 12,
        display: "flex", alignItems: "center", gap: 3,
        opacity: disabled ? 0.4 : 1, transition: "background 0.1s, color 0.1s",
        flexShrink: 0, whiteSpace: "nowrap",
      }}>
      {children}
    </button>
  );
}

// ─── Ruler ────────────────────────────────────────────────────────────────────
function Ruler({ marks, C }: { marks: Mark[]; C: typeof DARK }) {
  return (
    <div style={{ width: 12, flexShrink: 0, background: C.tab, borderLeft: `1px solid ${C.tabBorder}`, position: "relative", overflow: "hidden" }}>
      {marks.map((m, i) => (
        <div key={i} style={{ position: "absolute", top: `calc(${m.pct}% - 1px)`, left: 1, right: 1, height: 3, minHeight: 2, borderRadius: 1,
          background: m.kind === "add" ? C.add : m.kind === "del" ? C.del : C.mod }} />
      ))}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme,   rawTheme]  = useState<Theme>(  () => lsGet("theme",     "kilo-dark"));
  const [ignoreWS, rawIWS]   = useState<boolean>(() => lsGet("ignoreWS",  false));
  const [wordWrap, rawWrap]  = useState<boolean>(() => lsGet("wordWrap",  false));
  const [sideBySide, rawSBS] = useState<boolean>(() => lsGet("sideBySide",true));
  const [collapse, rawColl]  = useState<boolean>(() => lsGet("collapse",  false));

  const setTheme = (v: Theme)  => { rawTheme(v);  lsSet("theme",    v); };
  const togIWS   = () => rawIWS(p =>  { lsSet("ignoreWS",  !p); return !p; });
  const togWrap  = () => rawWrap(p => { lsSet("wordWrap",  !p); return !p; });
  const togSBS   = () => rawSBS(p =>  { lsSet("sideBySide",!p); return !p; });
  const togColl  = () => rawColl(p => { lsSet("collapse",  !p); return !p; });

  const [mode,  setMode]  = useState<Mode>("text");
  const [left,  setLeft]  = useState<Doc>({ content: "", label: "Оригинал" });
  const [right, setRight] = useState<Doc>({ content: "", label: "Изменённый" });
  const [stats, setStats] = useState<Stats>({ total: 0, added: 0, removed: 0, modified: 0 });
  const [cur,   setCur]   = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const diffRef  = useRef<MonacoTypes.editor.IStandaloneDiffEditor | null>(null);
  const totalRef = useRef(0);
  const themeRef = useRef<Theme>("kilo-dark");

  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { totalRef.current = stats.total; setCur(stats.total > 0 ? 1 : 0); }, [stats.total]);

  const C = theme === "kilo-dark" ? DARK : LIGHT;

  // ── Editor mount ─────────────────────────────────────────────────────────────
  const onMount = useCallback(
    (editor: MonacoTypes.editor.IStandaloneDiffEditor, monaco: typeof MonacoTypes) => {
      diffRef.current = editor;
      setReady(true);

      monaco.editor.defineTheme("kilo-dark", {
        base: "vs-dark", inherit: true, rules: [],
        colors: {
          "editor.background": "#0d1117",
          "editor.lineHighlightBackground": "#161b22",
          "editorLineNumber.foreground": "#484f58",
          "editorLineNumber.activeForeground": "#e6edf3",
          "diffEditor.insertedLineBackground": "#122117",
          "diffEditor.insertedTextBackground": "#1e4620",
          "diffEditor.removedLineBackground": "#200c0c",
          "diffEditor.removedTextBackground": "#551010",
          "diffEditor.diagonalFill": "#161b22",
          "diffEditorGutter.insertedLineBackground": "#152a18",
          "diffEditorGutter.removedLineBackground": "#250d0d",
        },
      });
      monaco.editor.defineTheme("kilo-light", {
        base: "vs", inherit: true, rules: [],
        colors: {
          "editor.background": "#ffffff",
          "diffEditor.insertedLineBackground": "#d4f8d4",
          "diffEditor.insertedTextBackground": "#90d890",
          "diffEditor.removedLineBackground": "#ffdddd",
          "diffEditor.removedTextBackground": "#f0a0a0",
          "diffEditor.diagonalFill": "#f0f0f0",
        },
      });
      monaco.editor.setTheme(themeRef.current);

      editor.addCommand(monaco.KeyCode.F7, () => { editor.goToDiff("next");     setCur(c => c >= totalRef.current ? 1 : c + 1); });
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F7, () => { editor.goToDiff("previous"); setCur(c => c <= 1 ? totalRef.current : c - 1); });

      editor.getModifiedEditor().onDidChangeCursorPosition(e =>
        setCursor({ line: e.position.lineNumber, col: e.position.column })
      );

      const sync = () => {
        const changes = editor.getLineChanges() ?? [];
        const total   = editor.getModifiedEditor().getModel()?.getLineCount() ?? 1;
        let added = 0, removed = 0, modified = 0;
        const m: Mark[] = [];
        for (const ch of changes) {
          const pct = ((ch.modifiedStartLineNumber || ch.originalStartLineNumber) / total) * 100;
          if      (ch.originalStartLineNumber === 0) { added++;    m.push({ pct, kind: "add" }); }
          else if (ch.modifiedStartLineNumber === 0) { removed++;  m.push({ pct, kind: "del" }); }
          else                                       { modified++; m.push({ pct, kind: "mod" }); }
        }
        setStats({ total: changes.length, added, removed, modified });
        setMarks(m);
      };
      editor.onDidUpdateDiff(sync);
      sync();
    },
    []
  );

  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).monaco?.editor.setTheme(theme);
  }, [theme, ready]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const goNext = useCallback(() => { diffRef.current?.goToDiff("next");     setCur(c => c >= totalRef.current ? 1 : c + 1); }, []);
  const goPrev = useCallback(() => { diffRef.current?.goToDiff("previous"); setCur(c => c <= 1 ? totalRef.current : c - 1); }, []);

  // ── File ops ─────────────────────────────────────────────────────────────────
  const openLeft  = async () => { const r = await tauriOpenFile(); if (r) setLeft({ content: r.content, path: r.path, label: base(r.path) }); };
  const openRight = async () => { const r = await tauriOpenFile(); if (r) setRight({ content: r.content, path: r.path, label: base(r.path) }); };
  const swap    = () => { setLeft({ ...right }); setRight({ ...left }); };
  const getContent = () => diffRef.current?.getModifiedEditor().getValue() ?? right.content;
  const save    = async () => { const p = await tauriSaveFile(right.path, getContent()); if (p) setRight(d => ({ ...d, path: p, label: base(p) })); };
  const saveAs  = async () => { const p = await tauriSaveFile(undefined,  getContent()); if (p) setRight(d => ({ ...d, path: p, label: base(p) })); };

  const drop = (side: "left" | "right") => (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = ev => { const c = ev.target?.result as string; side === "left" ? setLeft({ content: c, label: f.name }) : setRight({ content: c, label: f.name }); };
    fr.readAsText(f, "utf-8");
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const language   = detectLang(left.label !== "Оригинал" ? left.label : right.label);
  const hasContent = !!(left.content || right.content);
  const identical  = ready && stats.total === 0 && !!left.content && !!right.content;
  const modified   = hasContent; // "unsaved indicator"

  // Breadcrumb for file mode
  const leftDirs  = left.path  ? dirParts(left.path)  : [];
  const rightDirs = right.path ? dirParts(right.path) : [];
  const breadcrumb = leftDirs.length
    ? [...leftDirs.slice(-3), left.label].join(" › ")
    : right.path ? [...rightDirs.slice(-3), right.label].join(" › ") : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorOpts: any = {
    readOnly: false, originalEditable: false,
    renderSideBySide: sideBySide,
    ignoreTrimWhitespace: ignoreWS,
    wordWrap: wordWrap ? "on" : "off",
    lineNumbers: "on", glyphMargin: true, folding: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13, lineHeight: 21, fontFamily: C.mono,
    fontLigatures: true, renderWhitespace: "selection",
    diffAlgorithm: "advanced",
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    padding: { top: 8, bottom: 8 },
    hideUnchangedRegions: { enabled: collapse, revealLineCount: 3, minimumLineCount: 3, contextLineCount: 3 },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: C.text, fontFamily: "system-ui,-apple-system,sans-serif", overflow: "hidden", userSelect: "none" }}>

      <Titlebar bg={C.tab} color={C.muted} border={C.tabBorder} />

      {/* ═══ TAB BAR (Kilocode style) ═════════════════════════════════════════ */}
      <div style={{ height: 36, background: C.tab, borderBottom: `1px solid ${C.tabBorder}`, display: "flex", alignItems: "center", flexShrink: 0, padding: "0 4px 0 0" }}>

        {/* Tab */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: "100%", borderRight: `1px solid ${C.tabBorder}`, background: C.bg, borderTop: `2px solid ${C.accent}`, minWidth: 0, maxWidth: 420, overflow: "hidden" }}>
          {modified && <span style={{ color: C.mod, fontSize: 10, flexShrink: 0 }}>●</span>}
          <span style={{ fontSize: 12.5, fontFamily: C.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>
            {left.label} ↔ {right.label}
          </span>
          {mode === "text" && (
            <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>(Текст)</span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: mode, options, navigation, save, theme */}
        <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "0 4px" }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", border: `1px solid ${C.tabBorder}`, borderRadius: 4, overflow: "hidden", marginRight: 4 }}>
            {(["file","text"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "2px 9px", background: mode === m ? `${C.accent}18` : "transparent",
                color: mode === m ? C.accent : C.muted, border: "none", cursor: "pointer", fontSize: 11.5,
                fontWeight: mode === m ? 600 : 400,
              }}>
                {m === "file" ? "Файлы" : "Текст"}
              </button>
            ))}
          </div>

          {mode === "file" && (<>
            <IBtn onClick={openLeft}  accent={C.del} title="Открыть оригинал">📂−</IBtn>
            <IBtn onClick={openRight} accent={C.add} title="Открыть изменённый">📂+</IBtn>
            <IBtn onClick={swap} title="Поменять">⇄</IBtn>
          </>)}

          <div style={{ width: 1, height: 16, background: C.tabBorder, margin: "0 4px" }} />

          <IBtn onClick={togIWS}  active={ignoreWS}  accent={C.accent} title="Игнорировать пробелы">⌀</IBtn>
          <IBtn onClick={togWrap} active={wordWrap}   accent={C.accent} title="Перенос строк">↵</IBtn>
          <IBtn onClick={togColl} active={collapse}   accent={C.accent} title="Свернуть неизменённые">⊟</IBtn>
          <IBtn onClick={togSBS}  active={!sideBySide} accent={C.accent} title="Inline / Side-by-side">⊞</IBtn>

          <div style={{ width: 1, height: 16, background: C.tabBorder, margin: "0 4px" }} />

          {/* Navigation — like Kilocode's ↑↓ in top right */}
          <IBtn onClick={goPrev} disabled={stats.total === 0} title="Предыдущее (Shift+F7)">↑</IBtn>
          <IBtn onClick={goNext} disabled={stats.total === 0} title="Следующее (F7)">↓</IBtn>
          <span style={{ fontSize: 11, color: stats.total > 0 ? C.text : C.muted, fontFamily: C.mono, minWidth: 40, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {stats.total > 0 ? `${cur}/${stats.total}` : "0/0"}
          </span>

          <div style={{ width: 1, height: 16, background: C.tabBorder, margin: "0 4px" }} />

          <IBtn onClick={save}   disabled={!hasContent} accent={C.add}  title="Сохранить">💾</IBtn>
          <IBtn onClick={saveAs} disabled={!hasContent} accent={C.muted} title="Сохранить как…">↓</IBtn>
          <IBtn onClick={() => setTheme(theme === "kilo-dark" ? "kilo-light" : "kilo-dark")} title="Тема">
            {theme === "kilo-dark" ? "☀" : "☾"}
          </IBtn>
        </div>
      </div>

      {/* ═══ BREADCRUMB (Kilocode style, file mode only) ══════════════════════ */}
      {mode === "file" && (
        <div style={{ height: 22, background: C.bg, borderBottom: `1px solid ${C.tabBorder}`, display: "flex", alignItems: "center", padding: "0 12px", flexShrink: 0, gap: 0 }}>
          {breadcrumb ? (
            <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {breadcrumb}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: C.dim, fontStyle: "italic" }}>
              Перетащите файл или нажмите 📂 для открытия
            </span>
          )}
        </div>
      )}

      {/* ═══ TEXT PASTE PANELS ════════════════════════════════════════════════ */}
      {mode === "text" && (
        <div style={{ display: "flex", height: 190, flexShrink: 0, borderBottom: `1px solid ${C.tabBorder}` }}>
          {([
            { doc: left,  set: setLeft,  side: "left"  as const, col: C.del, ph: "Вставьте оригинальный текст или перетащите файл…" },
            { doc: right, set: setRight, side: "right" as const, col: C.add, ph: "Вставьте изменённый текст (ответ ИИ)…"            },
          ]).map(({ doc, set, side, col, ph }, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: i === 0 ? `1px solid ${C.tabBorder}` : "none" }}
              onDragOver={e => e.preventDefault()} onDrop={drop(side)}>
              <div style={{ padding: "2px 10px", fontSize: 11, color: col, background: `${col}0d`, borderBottom: `1px solid ${C.tabBorder}`, fontWeight: 600 }}>
                {i === 0 ? "− Оригинал" : "+ Изменённый"}
              </div>
              <textarea value={doc.content} onChange={e => set(d => ({ ...d, content: e.target.value }))} placeholder={ph}
                style={{ flex: 1, background: "transparent", color: C.text, border: "none", outline: "none", resize: "none", padding: "8px 10px", fontFamily: C.mono, fontSize: 12.5, lineHeight: 1.55, userSelect: "auto" }} />
            </div>
          ))}
        </div>
      )}

      {/* ═══ EDITOR ═══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <DiffEditor
            height="100%"
            original={left.content}
            modified={right.content}
            language={language}
            theme={theme}
            onMount={onMount}
            options={editorOpts}
          />
        </div>
        <Ruler marks={marks} C={C} />
      </div>

      {/* ═══ STATUS BAR (Kilocode / VSCode style) ════════════════════════════ */}
      <div style={{ height: 22, display: "flex", alignItems: "center", padding: "0 10px", background: C.statusBg, flexShrink: 0, fontSize: 11, color: "#fff", gap: 10 }}>
        <span>Ln {cursor.line}, Col {cursor.col}</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>Spaces: 2</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>UTF-8</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>{language}</span>
        <span style={{ opacity: 0.4 }}>|</span>
        {identical && <span style={{ color: "#a0f0a0", fontWeight: 600 }}>✓ Идентичны</span>}
        {stats.added   > 0 && <span style={{ color: "#80f080" }}>+{stats.added} доб.</span>}
        {stats.removed > 0 && <span style={{ color: "#f08080" }}>−{stats.removed} уд.</span>}
        {stats.modified > 0 && <span style={{ color: "#f0d080" }}>~{stats.modified} изм.</span>}
        <div style={{ flex: 1 }} />
        {!IS_TAURI && <span style={{ opacity: 0.6 }}>⚠ Браузер</span>}
      </div>
    </div>
  );
}
