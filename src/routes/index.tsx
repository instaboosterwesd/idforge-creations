import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Lock, KeyRound, LogOut, Plus, X, Copy, Pencil, Pause, Square, Trash2,
  RotateCcw, Search, Globe, User, IndianRupee, Image as ImageIcon, Send, Ticket, Fingerprint, Upload,
} from "lucide-react";
import { fb, genId, type AppRec, type Vars } from "@/lib/fb";

const IMGBB_KEY = "5a449a45a5f05d8f16b450f1e3a7f6af";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok || !j?.data?.url) throw new Error(j?.error?.message ?? "Upload failed");
  return j.data.url as string;
}

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
const FIELDS: { k: keyof Vars; label: string; ph: string; icon: typeof User }[] = [
  { k: "name", label: "Name", ph: "My App", icon: User },
  { k: "deposit", label: "Deposit", ph: "100", icon: IndianRupee },
  { k: "image", label: "Image URL", ph: "https://i.ibb.co/…/24.jpg", icon: ImageIcon },
  { k: "telegram", label: "Telegram", ph: "https://t.me/…", icon: Send },
  { k: "domain", label: "Domain", ph: "https://your-website.com", icon: Globe },
  { k: "invitecode", label: "Invite code", ph: "ABC123", icon: Ticket },
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
      else setErr("Incorrect password");
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="m3-card w-full max-w-sm space-y-5 p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Lock className="h-7 w-7" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Enter your password to sign in</p>
        </div>
        <label className="m3-field">
          <span>Password</span>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className="m3-btn w-full" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
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
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setMsg("");
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (x) { setMsg((x as Error).message); }
    setUploading(false);
  };

  const load = async () => {
    try { const [a, b] = await Promise.all([fb.listApps(), fb.listBin()]); setApps(a); setBin(b); }
    catch (x) { setMsg((x as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(empty); setCustomId(""); setCreated(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setMsg("Name is required");
    const id = editing ?? (customId.trim().replace(/[.#$[\]/]/g, "") || genId());
    if (!editing && (apps[id] || bin[id])) return setMsg("This ID already exists");
    await fb.putApp(id, { switch: "ON", variables: form });
    setCreated(editing ? null : id);
    setMsg(editing ? `Updated ${id}` : "");
    setForm(empty); setCustomId("");
    if (editing) closeForm();
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
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Fingerprint className="h-6 w-6 text-primary" /> App ID Console
        </h1>
        <div className="flex gap-2">
          <button className="m3-btn-tonal inline-flex items-center gap-2" onClick={() => setShowPw(true)}>
            <KeyRound className="h-4 w-4" /> Password
          </button>
          <button className="m3-btn-text inline-flex items-center gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </header>

      {!showForm && (
        <button className="m3-btn inline-flex items-center gap-2" onClick={() => { setShowForm(true); setCreated(null); setMsg(""); }}>
          <Plus className="h-4 w-4" /> Create ID
        </button>
      )}

      {showForm && (
        <form onSubmit={save} className="m3-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{editing ? `Edit: ${editing}` : "Create new ID"}</h2>
            <button type="button" className="m3-btn-text inline-flex items-center gap-1" onClick={closeForm}>
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {!editing && (
              <label className="m3-field"><span>App ID (leave empty for auto)</span>
                <input value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder="auto-generate" /></label>
            )}
            {FIELDS.map((f) => (<div key={f.k} className="contents">
              {f.k === "invitecode" && <InvitePresetSearch onPick={(v) => setForm((fm) => ({ ...fm, invitecode: v }))} />}
              <label className="m3-field"><span className="inline-flex items-center gap-1.5"><f.icon className="h-3.5 w-3.5" /> {f.label}</span>
                {f.k === "image" ? (
                  <div className="flex gap-2">
                    <input className="flex-1" value={form.image} placeholder={f.ph} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                    <label className="m3-btn-tonal inline-flex shrink-0 cursor-pointer items-center gap-1.5">
                      <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={pickImage} />
                    </label>
                  </div>
                ) : (
                  <input value={form[f.k]} placeholder={f.ph} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                )}
              </label>
            </div>))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="m3-btn inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> {editing ? "Save changes" : "Generate ID"}
            </button>
          </div>
          {created && (
            <div className="flex items-center gap-2 rounded-2xl bg-accent p-4 text-accent-foreground">
              ID created: <code className="font-mono font-bold">{created}</code>
              <button type="button" className="m3-btn-text inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(created)}>
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
          )}
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </form>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-secondary p-1">
            {(["live", "bin"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`m3-chip ${tab === t ? "m3-chip-on" : ""}`}>
                {t === "live" ? `Live (${Object.keys(apps).length})` : `Bin (${Object.keys(bin).length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="m3-search w-full pl-11" placeholder="Search ID, name, domain…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {list.length === 0 && <p className="py-8 text-center text-muted-foreground">Nothing found</p>}
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
                  <button className="m3-btn-tonal inline-flex items-center gap-1.5" onClick={() => { setEditing(id); setForm({ ...empty, ...r.variables }); setShowForm(true); setCreated(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button className="m3-btn-tonal inline-flex items-center gap-1.5" onClick={() => act(() => fb.toBin(id, r, "paused"))}>
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                  <button className="m3-btn-tonal inline-flex items-center gap-1.5" onClick={() => act(() => fb.toBin(id, r, "stopped"))}>
                    <Square className="h-3.5 w-3.5" /> Stop
                  </button>
                  <button className="m3-btn-danger inline-flex items-center gap-1.5" onClick={() => confirm(`Delete ${id}?`) && act(() => fb.delApp(id))}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>) : (<>
                  <button className="m3-btn inline-flex items-center gap-1.5" onClick={() => act(() => fb.resume(id, r))}>
                    <RotateCcw className="h-3.5 w-3.5" /> Resume
                  </button>
                  <button className="m3-btn-danger inline-flex items-center gap-1.5" onClick={() => confirm(`Permanently delete ${id}?`) && act(() => fb.delBin(id))}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete forever
                  </button>
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
    if (cur !== (await fb.getPassword())) return setM("Current password is incorrect");
    if (nw.length < 3) return setM("At least 3 characters");
    await fb.setPassword(nw); setM("Password changed ✓"); setCur(""); setNw("");
  };
  return (
    <div className="fixed inset-0 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <form onSubmit={go} onClick={(e) => e.stopPropagation()} className="m3-card w-full max-w-sm space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-medium"><KeyRound className="h-5 w-5" /> Change password</h2>
        <label className="m3-field"><span>Current</span><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
        <label className="m3-field"><span>New</span><input type="password" value={nw} onChange={(e) => setNw(e.target.value)} /></label>
        {m && <p className="text-sm text-muted-foreground">{m}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="m3-btn-text" onClick={onClose}>Close</button><button className="m3-btn">Update</button></div>
      </form>
    </div>
  );
}
