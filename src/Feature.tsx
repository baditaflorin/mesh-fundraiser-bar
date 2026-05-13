import { useEffect, useMemo, useState } from "react";
import type { MeshConfig, YRoom } from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Contribution = { name: string; amount: number; ts: number };

const NAME_KEY = (prefix: string) => `${prefix}:displayName`;
const newId = () => Math.random().toString(36).slice(2, 10);

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="fund-screen">
        <h1>fundraiser bar</h1>
        <p className="fund-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [amount, setAmount] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const contribs = room.doc.getMap<Contribution>("contribs");
    const meta = room.doc.getMap<string | number>("meta");
    const onChange = () => rerender((n) => n + 1);
    contribs.observe(onChange);
    meta.observe(onChange);
    return () => {
      contribs.unobserve(onChange);
      meta.unobserve(onChange);
    };
  }, [room]);

  const contribs = room.doc.getMap<Contribution>("contribs");
  const meta = room.doc.getMap<string | number>("meta");
  const goal = Number(meta.get("goal") ?? 0) || 0;
  const title = String(meta.get("title") ?? "");

  const entries = useMemo(() => {
    const arr: Array<Contribution & { id: string }> = [];
    contribs.forEach((v, k) => arr.push({ ...v, id: k }));
    arr.sort((a, b) => b.ts - a.ts);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, contribs.size]);

  const total = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);

  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  const fillPct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;

  const add = () => {
    const n = Number(amount);
    if (!name.trim() || !Number.isFinite(n) || n <= 0) return;
    contribs.set(newId(), { name: name.trim(), amount: Math.round(n * 100) / 100, ts: Date.now() });
    setAmount("");
  };

  const remove = (id: string) => contribs.delete(id);

  const saveGoal = () => {
    const n = Number(goalDraft);
    if (!Number.isFinite(n) || n < 0) return;
    meta.set("goal", n);
    setEditingGoal(false);
  };

  const saveTitle = () => {
    meta.set("title", titleDraft.trim());
    setEditingTitle(false);
  };

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="fund-screen">
      <header className="fund-header">
        <h1>fundraiser bar</h1>
        <p className="fund-status">
          {entries.length} {entries.length === 1 ? "contribution" : "contributions"} ·{" "}
          {room.peerCount + 1} present
        </p>
      </header>

      <div className="fund-title">
        {editingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTitle();
            }}
            className="fund-edit"
          >
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="campaign title"
              autoFocus
              maxLength={120}
            />
            <button type="submit">save</button>
            <button type="button" onClick={() => setEditingTitle(false)}>
              cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="fund-title-display"
            onClick={() => {
              setTitleDraft(title);
              setEditingTitle(true);
            }}
          >
            {title || <em>tap to set a campaign title</em>}
          </button>
        )}
      </div>

      <div
        className="fund-thermo"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <svg viewBox="0 0 100 220" className="fund-thermo-svg" aria-hidden="true">
          <defs>
            <clipPath id="bulb-clip">
              <rect x="0" y="0" width="100" height="220" />
            </clipPath>
          </defs>
          <rect x="38" y="8" width="24" height="180" rx="12" fill="rgba(255,255,255,0.07)" />
          <circle cx="50" cy="195" r="22" fill="rgba(255,255,255,0.07)" />
          <g clipPath="url(#bulb-clip)">
            <rect
              x="38"
              y={8 + (180 * (100 - fillPct)) / 100}
              width="24"
              height={(180 * fillPct) / 100}
              rx="12"
              fill="var(--mesh-accent)"
            />
            <circle cx="50" cy="195" r="22" fill="var(--mesh-accent)" />
          </g>
        </svg>
        <div className="fund-thermo-numbers">
          <div className="fund-total">${fmt(total)}</div>
          <div className="fund-goal">
            {goal > 0 ? (
              <>
                of <strong>${fmt(goal)}</strong> goal · <strong>{pct}%</strong>
              </>
            ) : (
              <em>no goal set</em>
            )}
          </div>
          {editingGoal ? (
            <form
              className="fund-edit"
              onSubmit={(e) => {
                e.preventDefault();
                saveGoal();
              }}
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="goal amount"
                autoFocus
              />
              <button type="submit">save</button>
              <button type="button" onClick={() => setEditingGoal(false)}>
                cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="fund-edit-goal"
              onClick={() => {
                setGoalDraft(goal ? String(goal) : "");
                setEditingGoal(true);
              }}
            >
              {goal > 0 ? "edit goal" : "set goal"}
            </button>
          )}
        </div>
      </div>

      <div className="fund-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>

      <form
        className="fund-add"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amount"
          aria-label="amount"
        />
        <button type="submit" disabled={!name.trim() || !Number(amount)}>
          + add
        </button>
      </form>

      <section className="fund-list-wrap">
        <h2 className="fund-list-title">contributions</h2>
        {entries.length === 0 ? (
          <p className="fund-empty">no contributions yet</p>
        ) : (
          <ul className="fund-list">
            {entries.map((e) => (
              <li key={e.id} className="fund-entry">
                <span className="fund-entry-name">{e.name}</span>
                <span className="fund-entry-amount">${fmt(e.amount)}</span>
                <span className="fund-entry-time">{new Date(e.ts).toLocaleTimeString()}</span>
                <button
                  type="button"
                  className="fund-entry-rm"
                  onClick={() => remove(e.id)}
                  aria-label={`remove ${e.name} ${e.amount}`}
                  title="remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
