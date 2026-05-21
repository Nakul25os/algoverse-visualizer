import { useEffect, useMemo, useRef, useState } from "react";
import {
  algorithmCatalog,
  compareAlgorithms,
  getAlgorithmById,
  runAlgorithm,
  sections,
} from "./data/algorithmCatalog";
import { usePlayback } from "./hooks/usePlayback";

const ACTION_TONES = {
  compare: "compare",
  probe: "current",
  swap: "swap",
  shift: "swap",
  overwrite: "swap",
  insert: "current",
  select: "current",
  highlight: "current",
  "mark-sorted": "sorted",
  done: "sorted",
  found: "found",
  visit: "current",
  enqueue: "current",
  dequeue: "swap",
  push: "current",
  pop: "swap",
  backtrack: "error",
  reject: "error",
  prune: "error",
};

const DEFAULT_INPUTS = [
  "12,5,18,2,9,1,16,7",
  "31,14,7,22,4,18,29,10",
  "8,3,15,6,2,19,11,5",
];

function speedToDelay(speedMultiplier) {
  return Math.round(900 / speedMultiplier);
}

function formatSpeed(value) {
  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 2)}x`;
}

function createRandomArray() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 44) + 4).join(",");
}

function inferPseudoLine(step, pseudocode) {
  if (!step || !pseudocode.length) return 0;
  const op = step.operation.toLowerCase();
  const line = step.codeLine?.toLowerCase();
  const searchTerms = [line, op, step.prediction?.toLowerCase()].filter(Boolean);
  const found = pseudocode.findIndex((item) => searchTerms.some((term) => item.toLowerCase().includes(term)));
  if (found >= 0) return found;
  if (op.includes("compare") || op.includes("probe")) return Math.min(1, pseudocode.length - 1);
  if (op.includes("swap") || op.includes("insert") || op.includes("update") || op.includes("fill")) return Math.min(2, pseudocode.length - 1);
  if (op.includes("done") || op.includes("found")) return pseudocode.length - 1;
  return 0;
}

function buildEvent(step, index, speedMultiplier) {
  return {
    id: `evt-${index}`,
    type: step?.operation ?? "idle",
    payload: step?.state ?? {},
    caption: step?.caption ?? "Waiting for a generated step.",
    duration: speedToDelay(speedMultiplier),
  };
}

function getSafeComparatorId(primaryId, preferredId) {
  const primary = getAlgorithmById(primaryId);
  const sameSection = algorithmCatalog.filter((entry) => entry.section === primary.section && entry.id !== primaryId);
  return sameSection.some((entry) => entry.id === preferredId) ? preferredId : sameSection[0]?.id ?? primaryId;
}

function App() {
  const firstAlgorithm = algorithmCatalog[0];
  const [selectedId, setSelectedId] = useState(firstAlgorithm.id);
  const [input, setInput] = useState(firstAlgorithm.defaultInput);
  const [result, setResult] = useState(() => runAlgorithm(firstAlgorithm.id, firstAlgorithm.defaultInput));
  const [speed, setSpeed] = useState(1);
  const [comparatorId, setComparatorId] = useState(algorithmCatalog[1].id);
  const [comparison, setComparison] = useState(() => compareAlgorithms(firstAlgorithm.id, algorithmCatalog[1].id, firstAlgorithm.defaultInput));
  const [topic, setTopic] = useState(firstAlgorithm.section);
  const [searchTerm, setSearchTerm] = useState("");
  const [isStageFocus, setIsStageFocus] = useState(false);
  const [stageZoom, setStageZoom] = useState(1);
  const stagePanRef = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });
  const stageViewportRef = useRef(null);
  const playback = usePlayback(result.steps.length, speedToDelay(speed));

  const currentStep = result.steps[playback.currentStep] ?? result.steps[0];
  const selectedAlgorithm = getAlgorithmById(selectedId);
  const activeEvent = buildEvent(currentStep, playback.currentStep, speed);
  const activeTone = ACTION_TONES[currentStep?.operation] ?? "current";
  const pseudocodeLine = inferPseudoLine(currentStep, selectedAlgorithm.pseudocode);
  const comparatorOptions = useMemo(
    () => algorithmCatalog.filter((entry) => entry.id !== selectedId && entry.section === selectedAlgorithm.section),
    [selectedAlgorithm.section, selectedId],
  );
  const topicAlgorithms = useMemo(
    () =>
      algorithmCatalog.filter((entry) => {
        const inTopic = entry.section === topic;
        const matchesSearch =
          !searchTerm ||
          entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.section.toLowerCase().includes(searchTerm.toLowerCase());
        return inTopic && matchesSearch;
      }),
    [searchTerm, topic],
  );
  const stepProgress = result.steps.length > 1 ? Math.round((playback.currentStep / (result.steps.length - 1)) * 100) : 0;
  const completedSteps = result.steps.slice(0, playback.currentStep + 1).reverse();
  const upcomingSteps = result.steps.slice(playback.currentStep + 1, playback.currentStep + 7);

  useEffect(() => {
    if (!comparatorOptions.some((entry) => entry.id === comparatorId)) {
      setComparatorId(comparatorOptions[0]?.id ?? algorithmCatalog.find((entry) => entry.id !== selectedId)?.id ?? selectedId);
    }
  }, [comparatorId, comparatorOptions, selectedId]);

  useEffect(() => {
    setComparison(compareAlgorithms(selectedId, comparatorId, input));
  }, [selectedId, comparatorId, input]);

  useEffect(() => {
    if (!playback.isPlaying || playback.currentStep !== result.steps.length - 1) {
      return;
    }
    playback.setIsPlaying(false);
  }, [playback, result.steps.length]);

  useEffect(() => {
    document.body.classList.toggle("stage-focus-lock", isStageFocus);
    return () => document.body.classList.remove("stage-focus-lock");
  }, [isStageFocus]);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!isStageFocus || !viewport) return undefined;

    function handleNativePinch(event) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setStageZoom((value) => Math.min(2.5, Math.max(0.55, Number((value + direction * 0.08).toFixed(2)))));
    }

    viewport.addEventListener("wheel", handleNativePinch, { passive: false });
    return () => viewport.removeEventListener("wheel", handleNativePinch);
  }, [isStageFocus]);

  function prepareRun(nextId = selectedId, nextInput = input, options = {}) {
    const safeComparatorId = getSafeComparatorId(nextId, options.comparatorId ?? comparatorId);
    const nextResult = runAlgorithm(nextId, nextInput);
    setResult(nextResult);
    setComparatorId(safeComparatorId);
    playback.reset();
    setComparison(compareAlgorithms(nextId, safeComparatorId, nextInput));
    if (options.autoPlay) {
      window.requestAnimationFrame(() => playback.play());
    }
  }

  function handleAlgorithmChange(nextId) {
    const algorithm = getAlgorithmById(nextId);
    const safeComparatorId = getSafeComparatorId(nextId, comparatorId);
    setSelectedId(nextId);
    setTopic(algorithm.section);
    setInput(algorithm.defaultInput);
    prepareRun(nextId, algorithm.defaultInput, { comparatorId: safeComparatorId, autoPlay: true });
  }

  function handleTopicChange(nextTopic) {
    setTopic(nextTopic);
    const nextAlgorithm = algorithmCatalog.find((entry) => entry.section === nextTopic) ?? firstAlgorithm;
    handleAlgorithmChange(nextAlgorithm.id);
  }

  function randomizeInput() {
    const nextInput = selectedAlgorithm.section.includes("Sorting") ? createRandomArray() : selectedAlgorithm.defaultInput;
    setInput(nextInput);
    prepareRun(selectedId, nextInput, { autoPlay: true });
  }

  function getPanPoint(event) {
    const point = event.touches?.[0] ?? event;
    return { x: point.clientX, y: point.clientY };
  }

  function beginStagePan(event) {
    if (!isStageFocus || event.target.closest("button,input,select,textarea")) return;
    const viewport = stageViewportRef.current;
    if (!viewport) return;
    const point = getPanPoint(event);
    stagePanRef.current = {
      active: true,
      x: point.x,
      y: point.y,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.classList.add("dragging");
  }

  function moveStagePan(event) {
    if (!stagePanRef.current.active || !stageViewportRef.current) return;
    event.preventDefault();
    const point = getPanPoint(event);
    const dx = point.x - stagePanRef.current.x;
    const dy = point.y - stagePanRef.current.y;
    stageViewportRef.current.scrollLeft = stagePanRef.current.left - dx;
    stageViewportRef.current.scrollTop = stagePanRef.current.top - dy;
  }

  function endStagePan() {
    stagePanRef.current.active = false;
    stageViewportRef.current?.classList.remove("dragging");
  }

  function handleStageWheel(event) {
    if (!isStageFocus || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setStageZoom((value) => Math.min(2.5, Math.max(0.55, Number((value + direction * 0.08).toFixed(2)))));
  }

  return (
    <div className="product-shell">
      <aside className="module-rail">
        <div className="brand-lockup">
          <span className="brand-mark">AV</span>
          <div>
            <p className="eyebrow">AlgoVerse Studio</p>
            <h1>DSA Visualizer</h1>
          </div>
        </div>

        <label className="search-box">
          <span>Search</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="sorting, AVL, Dijkstra" />
        </label>

        <div className="topic-tabs">
          {sections.map((section) => (
            <button key={section} className={section === topic ? "active" : ""} onClick={() => handleTopicChange(section)}>
              <span>{section}</span>
              <small>{algorithmCatalog.filter((entry) => entry.section === section).length}</small>
            </button>
          ))}
        </div>

        <div className="module-list">
          {topicAlgorithms.map((entry) => (
            <button key={entry.id} className={entry.id === selectedId ? "active" : ""} onClick={() => handleAlgorithmChange(entry.id)}>
              <span>{entry.title}</span>
              <small>{entry.complexity.time}</small>
            </button>
          ))}
        </div>
      </aside>

      <main className="studio">
        <header className="studio-header">
          <div>
            <p className="eyebrow">{selectedAlgorithm.section}</p>
            <h2>{selectedAlgorithm.title}</h2>
            <p className="muted">{selectedAlgorithm.description}</p>
          </div>
          <div className="status-cluster">
            <MetricCard label="Step" value={`${playback.currentStep + 1}/${result.steps.length}`} detail={`${stepProgress}% complete`} />
            <MetricCard label="Time" value={selectedAlgorithm.complexity.time} detail={`Space ${selectedAlgorithm.complexity.space}`} />
            <MetricCard label="Ops" value={result.steps.length} detail={`${result.metrics.durationMs}ms generated`} />
          </div>
        </header>

        <section className="control-deck">
          <label className="input-group source-input">
            <span>{selectedAlgorithm.inputLabel}</span>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} />
            <small>{selectedAlgorithm.inputHint}</small>
          </label>
          <label className="input-group">
            <span>Algorithm</span>
            <select value={selectedId} onChange={(event) => handleAlgorithmChange(event.target.value)}>
              {algorithmCatalog.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          <label className="input-group">
            <span>Compare</span>
            <select value={comparatorId} onChange={(event) => setComparatorId(event.target.value)}>
              {comparatorOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          <label className="input-group speed-control">
            <span>Speed {formatSpeed(speed)}</span>
            <input type="range" min="0.25" max="5" step="0.25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
          </label>
          <div className="run-actions">
            <button className="primary-button" onClick={() => prepareRun(selectedId, input, { autoPlay: true })}>
              Run & Play
            </button>
            <button className="ghost-button" onClick={randomizeInput}>
              Random
            </button>
          </div>
        </section>

        <section className="workbench">
          <div className={`stage-panel ${isStageFocus ? "focus-mode" : ""}`}>
            <div className="stage-topline">
              <div>
                <p className="eyebrow">Simulation Stage</p>
                <h3>{currentStep?.caption}</h3>
              </div>
              <div className="stage-actions">
                {isStageFocus && <span className="zoom-pill">Zoom {Math.round(stageZoom * 100)}%</span>}
                {isStageFocus && <span className="gesture-pill">Pinch to zoom</span>}
                <span className={`event-pill ${activeTone}`}>{currentStep?.operation}</span>
                <button className="fullscreen-button" onClick={() => setIsStageFocus((value) => !value)}>
                  {isStageFocus ? "Minimize" : "Fullscreen"}
                </button>
              </div>
            </div>
            <div
              className="visual-stage-wrap"
              ref={stageViewportRef}
              onMouseDown={beginStagePan}
              onMouseMove={moveStagePan}
              onMouseUp={endStagePan}
              onMouseLeave={endStagePan}
              onTouchStart={beginStagePan}
              onTouchMove={moveStagePan}
              onTouchEnd={endStagePan}
              onWheel={handleStageWheel}
            >
              <div
                className="visual-stage-content"
                style={
                  isStageFocus
                    ? {
                        width: `${900 * stageZoom}px`,
                        height: `${620 * stageZoom}px`,
                      }
                    : undefined
                }
              >
                <div
                  className="visual-zoom-content"
                  style={isStageFocus ? { transform: `scale(${stageZoom})` } : undefined}
                >
                  <Visualization state={currentStep?.state} focusMode={isStageFocus} />
                </div>
              </div>
              <button className={`stage-play-button ${playback.isPlaying ? "playing" : ""}`} onClick={() => playback.toggle()}>
                <span>{playback.isPlaying ? "Pause" : "Play"}</span>
                <small>{playback.isPlaying ? "Animation running" : "Start automatic animation"}</small>
              </button>
            </div>
            <div className="stage-bottom">
              <div className="button-row">
                <button className="icon-button" aria-label="Previous step" onClick={() => playback.stepBackward()}>
                  Prev
                </button>
                <button className="icon-button primary-control" aria-label={playback.isPlaying ? "Pause" : "Play"} onClick={() => playback.toggle()}>
                  {playback.isPlaying ? "Pause" : "Play"}
                </button>
                <button className="icon-button" aria-label="Next step" onClick={() => playback.stepForward()}>
                  Next
                </button>
                <button className="ghost-button" onClick={() => playback.reset()}>
                  Reset
                </button>
              </div>
              <div className="timeline-scrubber">
                <input
                  type="range"
                  min="0"
                  max={Math.max(result.steps.length - 1, 0)}
                  value={playback.currentStep}
                  onChange={(event) => playback.setCurrentStep(Number(event.target.value))}
                />
                <div className="timeline-track">
                  {result.steps.slice(0, 42).map((step, index) => (
                    <span
                      key={`${step.operation}-${index}`}
                      className={`${index <= playback.currentStep ? "done" : ""} ${index === playback.currentStep ? "active" : ""}`}
                      style={{ width: `${100 / Math.min(result.steps.length, 42)}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="inspector">
            <section className="inspector-panel">
              <div className="panel-heading">
                <p className="eyebrow">Event Queue</p>
                <h3>{activeEvent.type}</h3>
              </div>
              <div className="event-readout">
                <span>duration</span>
                <strong>{activeEvent.duration}ms</strong>
                <span>payload</span>
                <code>{currentStep?.state?.notes || activeEvent.caption}</code>
              </div>
              <div className="legend-row">
                <LegendItem tone="compare" label="Compare" />
                <LegendItem tone="swap" label="Swap" />
                <LegendItem tone="sorted" label="Sorted" />
                <LegendItem tone="current" label="Current" />
                <LegendItem tone="found" label="Found" />
              </div>
            </section>

            <section className="inspector-panel">
              <div className="panel-heading">
                <p className="eyebrow">Pseudocode</p>
                <h3>Line {pseudocodeLine + 1}</h3>
              </div>
              <ol className="pseudo-list">
                {selectedAlgorithm.pseudocode.map((line, index) => (
                  <li key={`${line}-${index}`} className={index === pseudocodeLine ? "active" : ""}>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="inspector-panel logs-panel">
              <div className="panel-heading">
                <p className="eyebrow">Step Log</p>
                <h3>Completed</h3>
              </div>
              <div className="log-list">
                {completedSteps.slice(0, 10).map((step, index) => (
                  <article key={`${step.caption}-${index}`} className={index === 0 ? "active" : ""}>
                    <span>{playback.currentStep + 1 - index}</span>
                    <p>{step.caption}</p>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="analysis-strip">
          <div className="analysis-panel">
            <div className="panel-heading">
              <p className="eyebrow">Complexity Meter</p>
              <h3>Growth Trace</h3>
            </div>
            <ComplexityChart series={result.complexitySeries} />
          </div>
          <div className="analysis-panel">
            <div className="panel-heading">
              <p className="eyebrow">Algorithm Race</p>
              <h3>{comparison.map((entry) => entry.title).join(" vs ")}</h3>
            </div>
            <div className="comparison-grid">
              {comparison.map((entry) => (
                <div key={entry.id} className="comparison-card">
                  <h4>{entry.title}</h4>
                  <strong>{entry.steps} steps</strong>
                  <span>{entry.durationMs}ms generation</span>
                  <span>{entry.complexity.time}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="analysis-panel upcoming-panel">
            <div className="panel-heading">
              <p className="eyebrow">Upcoming</p>
              <h3>Next Events</h3>
            </div>
            {upcomingSteps.map((step, index) => (
              <div key={`${step.operation}-${index}`} className="queue-row">
                <span>{step.operation}</span>
                <p>{step.caption}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function LegendItem({ tone, label }) {
  return (
    <div className="legend-item">
      <span className={`legend-swatch ${tone}`} />
      <small>{label}</small>
    </div>
  );
}

function Visualization({ state, focusMode = false }) {
  if (!state) {
    return <div className="visual-placeholder">Prepare a run to render the visualization.</div>;
  }
  switch (state.view) {
    case "array":
      return <ArrayView state={state} />;
    case "structure":
      return <StructureView state={state} />;
    case "tree":
      return <TreeView state={state} focusMode={focusMode} />;
    case "graph":
      return <GraphView state={state} />;
    case "grid":
      return <GridView state={state} />;
    case "table":
      return <TableView state={state} />;
    case "timeline":
      return <TimelineView state={state} />;
    case "disk":
      return <DiskView state={state} />;
    case "recursion":
      return <RecursionView state={state} />;
    default:
      return <div className="visual-placeholder">Unsupported view.</div>;
  }
}

function ArrayView({ state }) {
  const max = Math.max(...state.values, 1);
  return (
    <div className="array-view">
      {state.values.map((value, index) => {
        const height = `${Math.max(12, (value / max) * 100)}%`;
        const classes = [
          state.sorted.includes(index) ? "sorted" : "",
          state.active.includes(index) ? "active" : "",
          state.compared.includes(index) ? "compared" : "",
          state.found.includes(index) ? "found" : "",
          state.eliminated.includes(index) ? "eliminated" : "",
        ].join(" ");
        return (
          <div key={`${value}-${index}`} className={`bar ${classes}`} style={{ height }}>
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function StructureView({ state }) {
  return (
    <div className={`structure-view ${state.layout}`}>
      {state.items.map((item) => (
        <div key={item.id} className={`structure-node ${item.state}`}>
          {item.value}
        </div>
      ))}
      {!!state.pointers.length && (
        <div className="pointer-row">
          {state.pointers.map((pointer) => (
            <span key={pointer}>{pointer}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView({ state, focusMode = false }) {
  const activeSet = new Set(state.activeNodes ?? []);
  const pathSet = new Set(state.pathNodes ?? []);
  return (
    <svg className="svg-stage" viewBox="0 0 560 360">
      {state.edges.map((edge) => {
        const from = state.nodes.find((node) => node.id === edge.from);
        const to = state.nodes.find((node) => node.id === edge.to);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={edge.color}
            strokeWidth={pathSet.has(Number(from.id)) && pathSet.has(Number(to.id)) ? "4" : "2"}
            strokeDasharray={pathSet.has(Number(from.id)) && pathSet.has(Number(to.id)) ? "0" : "5 5"}
          />
        );
      })}
      {state.nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={activeSet.has(node.value) ? "28" : "24"}
            fill={node.color}
            stroke={activeSet.has(node.value) ? "#f8fafc" : pathSet.has(node.value) ? "#facc15" : "transparent"}
            strokeWidth={activeSet.has(node.value) || pathSet.has(node.value) ? "3" : "0"}
          />
          <text x={node.x} y={node.y + 5} textAnchor="middle" fill={node.textColor ?? "#08111f"} fontWeight="700">
            {node.label}
          </text>
        </g>
      ))}
      {state.pendingValue !== null && (
        <g transform="translate(470 38)">
          <rect width="72" height="36" rx="18" fill="rgba(249, 115, 22, 0.16)" stroke="rgba(249, 115, 22, 0.35)" />
          <text x="36" y="23" textAnchor="middle" fill="var(--text)" fontWeight="700">
            {state.pendingValue}
          </text>
          <text x="36" y="52" textAnchor="middle" fill="var(--muted-ink)" fontSize="12">
            pending
          </text>
        </g>
      )}
      {state.footer && !focusMode && (
        <text x="20" y="338" fill="var(--muted-ink)" fontSize="14">
          {state.footer}
        </text>
      )}
    </svg>
  );
}

function GraphView({ state }) {
  return (
    <svg className="svg-stage" viewBox="0 0 560 360">
      {state.edges.map((edge) => {
        const from = state.nodes.find((node) => node.id === edge.from);
        const to = state.nodes.find((node) => node.id === edge.to);
        if (!from || !to) return null;
        return (
          <g key={edge.id}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.color} strokeWidth="3" />
            <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" fill="var(--muted-ink)">
              {edge.weight}
            </text>
          </g>
        );
      })}
      {state.nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="24" fill={node.color} />
          <text x={node.x} y={node.y + 5} textAnchor="middle" fill="#08111f" fontWeight="700">
            {node.label}
          </text>
        </g>
      ))}
      {state.footer && (
        <text x="20" y="338" fill="var(--muted-ink)" fontSize="14">
          {state.footer}
        </text>
      )}
    </svg>
  );
}

function GridView({ state }) {
  return (
    <div className="grid-view" style={{ gridTemplateColumns: `repeat(${state.grid[0]?.length || 1}, 1fr)` }}>
      {state.grid.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const highlighted = state.highlights.some(([r, c]) => r === rowIndex && c === colIndex);
          return (
            <div key={`${rowIndex}-${colIndex}`} className={`grid-cell ${highlighted ? "highlighted" : ""}`}>
              {cell}
            </div>
          );
        }),
      )}
    </div>
  );
}

function TableView({ state }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th />
            {state.colLabels.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.matrix.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              <th>{state.rowLabels[rowIndex] ?? rowIndex}</th>
              {row.map((value, colIndex) => {
                const highlighted = state.highlights.some(([r, c]) => r === rowIndex && c === colIndex);
                return (
                  <td key={`${rowIndex}-${colIndex}`} className={highlighted ? "highlighted" : ""}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineView({ state }) {
  const maxEnd = Math.max(...state.segments.map((segment) => segment.end), 1);
  return (
    <div className="timeline-view">
      <div className="timeline-bar">
        {state.segments.map((segment) => (
          <div key={`${segment.label}-${segment.start}-${segment.end}`} className="timeline-segment" style={{ width: `${((segment.end - segment.start) / maxEnd) * 100}%`, background: segment.color }}>
            <span>{segment.label}</span>
            <small>
              {segment.start}-{segment.end}
            </small>
          </div>
        ))}
      </div>
      <div className="timeline-metrics">
        {Object.entries(state.metrics).map(([key, value]) => (
          <div key={key} className="timeline-metric">
            <strong>{key}</strong>
            <span>{typeof value === "object" ? JSON.stringify(value) : value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiskView({ state }) {
  const points = state.path.map((value, index) => `${20 + (index / Math.max(state.path.length - 1, 1)) * 500},${260 - (value / state.maxTrack) * 220}`).join(" ");
  return (
    <svg className="svg-stage" viewBox="0 0 560 320">
      <polyline fill="none" stroke="#7dd3fc" strokeWidth="4" points={points} />
      {state.path.map((value, index) => {
        const x = 20 + (index / Math.max(state.path.length - 1, 1)) * 500;
        const y = 260 - (value / state.maxTrack) * 220;
        return (
          <g key={`${value}-${index}`}>
            <circle cx={x} cy={y} r="7" fill="#f97316" />
            <text x={x} y={y - 12} textAnchor="middle" fill="var(--muted-ink)">
              {value}
            </text>
          </g>
        );
      })}
      <text x="20" y="300" fill="var(--muted-ink)">
        Total seek: {state.totalSeek}
      </text>
    </svg>
  );
}

function RecursionView({ state }) {
  return (
    <div className="recursion-layout">
      <svg className="svg-stage compact" viewBox="0 0 560 260">
        {state.edges.map((edge) => {
          const from = state.nodes.find((node) => node.id === edge.from);
          const to = state.nodes.find((node) => node.id === edge.to);
          if (!from || !to) return null;
          return <line key={`${edge.from}-${edge.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.color} strokeWidth="2" />;
        })}
        {state.nodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="18" fill={node.color} />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#08111f" fontWeight="700" fontSize="10">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="call-stack">
        {state.stack.map((frame, index) => (
          <div key={`${frame}-${index}`} className="stack-frame">
            {frame}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplexityChart({ series }) {
  const maxSteps = Math.max(...series.map((item) => item.steps), 1);
  const maxTime = Math.max(...series.map((item) => item.time), 1);
  const stepPoints = series
    .map((item, index) => `${20 + index * 90},${220 - (item.steps / maxSteps) * 180}`)
    .join(" ");
  const timePoints = series
    .map((item, index) => `${20 + index * 90},${220 - (item.time / maxTime) * 180}`)
    .join(" ");
  return (
    <svg className="svg-stage compact" viewBox="0 0 460 240">
      <polyline fill="none" stroke="#34d399" strokeWidth="4" points={stepPoints} />
      <polyline fill="none" stroke="#f97316" strokeWidth="4" points={timePoints} />
      {series.map((item, index) => (
        <g key={item.size}>
          <circle cx={20 + index * 90} cy={220 - (item.steps / maxSteps) * 180} r="5" fill="#34d399" />
          <circle cx={20 + index * 90} cy={220 - (item.time / maxTime) * 180} r="5" fill="#f97316" />
          <text x={20 + index * 90} y="235" textAnchor="middle" fill="var(--muted-ink)">
            {item.size}
          </text>
        </g>
      ))}
      <text x="20" y="18" fill="#34d399">
        Step count
      </text>
      <text x="110" y="18" fill="#f97316">
        Runtime (ms)
      </text>
    </svg>
  );
}

export default App;
