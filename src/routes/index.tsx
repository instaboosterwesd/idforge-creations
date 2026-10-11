import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fb, genId, type AppRec, type Vars } from "@/lib/fb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "App ID Console — Manage your app IDs" },
      { name: "description", content: "Create, edit, pause and resume app IDs stored in Firebase." },
      { property: "og:title", content: "App ID Console" },
      { property: "og:description", content: "Create, edit, pause and resume app IDs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const empty: Vars = { deposit: "", name: "", image: "", telegram: "", domain: "", invitecode: "" };
const FIELDS: { k: keyof Vars; label: string; ph: string }[] = [
  { k: "name", label: "Name", ph: "My App" },
  { k: "deposit", label: "Deposit", ph: "100" },
  { k: "image", label: "Image URL", ph: "https://i.ibb.co/…/24.jpg" },
  { k: "telegram", label: "Telegram", ph: "https://t.me/…" },
  { k: "domain", label: "Domain", ph: "https://aap-ki-website.com" },
  { k: "invitecode", label: "Invite code", ph: "ABC123" },
];

function Index() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(sessionStorage.getItem("auth") === "1"), []);
  return authed ? (
    <Dashboard onLogout={() => { sessionStorage.removeItem("auth"); setAuthed(false); }} />
  ) : (
    <Login onOk={() => { sessionStorage.setItem("auth", "1"); setAuthed(true); }} />
  );
}

function Login({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (pw === (await fb.getPassword())) onOk();
      else setErr("Galat password");
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="m3-card w-full max-w-sm space-y-5 p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl text-primary-foreground">🔐</div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Password daal kar login karein</p>
        </div>
        <label className="m3-field">
          <span>Password</span>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className="m3-btn w-full" disabled={busy}>{busy ? "Checking…" : "Login"}</button>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [apps, setApps] = useState<Record<string, AppRec>>({});
  const [bin, setBin] = useState<Record<string, AppRec>>({});
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"live" | "bin">("live");
  const [form, setForm] = useState<Vars>(empty);
  const [customId, setCustomId] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try { const [a, b] = await Promise.all([fb.listApps(), fb.listBin()]); setApps(a); setBin(b); }
    catch (x) { setMsg((x as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setMsg("Name zaroori hai");
    const id = editing ?? (customId.trim().replace(/[.#$[\]/]/g, "") || genId());
    if (!editing && (apps[id] || bin[id])) return setMsg("Ye ID pehle se hai");
    await fb.putApp(id, { switch: "ON", variables: form });
    setCreated(editing ? null : id);
    setMsg(editing ? `Updated ${id}` : "");
    setForm(empty); setCustomId(""); setEditing(null);
    load();
  };

  const list = useMemo(() => {
    const src = tab === "live" ? apps : bin;
    const s = q.toLowerCase();
    return Object.entries(src).filter(([id, r]) =>
      !s || id.toLowerCase().includes(s) || Object.values(r.variables ?? {}).some((v) => String(v).toLowerCase().includes(s)));
  }, [apps, bin, q, tab]);

  const act = async (fn: () => Promise<unknown>) => { try { await fn(); await load(); } catch (x) { setMsg((x as Error).message); } };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">App ID Console</h1>
        <div className="flex gap-2">
          <button className="m3-btn-tonal" onClick={() => setShowPw(true)}>Password</button>
          <button className="m3-btn-text" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <form onSubmit={save} className="m3-card space-y-4 p-6">
        <h2 className="text-lg font-medium">{editing ? `Edit: ${editing}` : "Create new ID"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {!editing && (
            <label className="m3-field"><span>App ID (khali chhodo = auto)</span>
              <input value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder="auto-generate" /></label>
          )}
          {FIELDS.map((f) => (
            <label key={f.k} className="m3-field"><span>{f.label}</span>
              <input value={form[f.k]} placeholder={f.ph} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} /></label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="m3-btn">{editing ? "Save changes" : "Generate ID"}</button>
          {editing && <button type="button" className="m3-btn-text" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
        </div>
        {created && (
          <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
            ID ban gayi: <code className="font-mono font-bold">{created}</code>
            <button type="button" className="m3-btn-text ml-2" onClick={() => navigator.clipboard.writeText(created)}>Copy</button>
          </div>
        )}
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </form>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-secondary p-1">
            {(["live", "bin"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`m3-chip ${tab === t ? "m3-chip-on" : ""}`}>
                {t === "live" ? `Live (${Object.keys(apps).length})` : `Bin (${Object.keys(bin).length})`}
              </button>
            ))}
          </div>
          <input className="m3-search flex-1" placeholder="Search ID, name, domain…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {list.length === 0 && <p className="py-8 text-center text-muted-foreground">Kuch nahi mila</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(([id, r]) => (
            <article key={id} className="m3-card space-y-3 p-5">
              <div className="flex items-center gap-3">
                {r.variables?.image ? <img src={r.variables.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  : <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">{r.variables?.name?.[0] ?? "?"}</div>}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{r.variables?.name}</h3>
                  <code className="text-xs text-muted-foreground">{id}</code>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{tab === "live" ? r.switch : r.pausedAs}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {FIELDS.filter((f) => f.k !== "name" && f.k !== "image").map((f) => (
                  <div key={f.k} className="min-w-0"><dt className="text-muted-foreground">{f.label}</dt><dd className="truncate">{r.variables?.[f.k] || "—"}</dd></div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                {tab === "live" ? (<>
                  <button className="m3-btn-tonal" onClick={() => { setEditing(id); setForm({ ...empty, ...r.variables }); setCreated(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <button className="m3-btn-tonal" onClick={() => act(() => fb.toBin(id, r, "paused"))}>Pause</button>
                  <button className="m3-btn-tonal" onClick={() => act(() => fb.toBin(id, r, "stopped"))}>Stop</button>
                  <button className="m3-btn-danger" onClick={() => confirm(`Delete ${id}?`) && act(() => fb.delApp(id))}>Delete</button>
                </>) : (<>
                  <button className="m3-btn" onClick={() => act(() => fb.resume(id, r))}>Resume</button>
                  <button className="m3-btn-danger" onClick={() => confirm(`Permanently delete ${id}?`) && act(() => fb.delBin(id))}>Delete forever</button>
                </>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      {showPw && <PwDialog onClose={() => setShowPw(false)} />}
    </div>
  );
}

function PwDialog({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [m, setM] = useState("");
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cur !== (await fb.getPassword())) return setM("Current password galat hai");
    if (nw.length < 3) return setM("Kam se kam 3 characters");
    await fb.setPassword(nw); setM("Password badal gaya ✓"); setCur(""); setNw("");
  };
  return (
    <div className="fixed inset-0 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <form onSubmit={go} onClick={(e) => e.stopPropagation()} className="m3-card w-full max-w-sm space-y-4 p-6">
        <h2 className="text-lg font-medium">Change password</h2>
        <label className="m3-field"><span>Current</span><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
        <label className="m3-field"><span>New</span><input type="password" value={nw} onChange={(e) => setNw(e.target.value)} /></label>
        {m && <p className="text-sm text-muted-foreground">{m}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="m3-btn-text" onClick={onClose}>Close</button><button className="m3-btn">Update</button></div>
      </form>
    </div>
  );
}
