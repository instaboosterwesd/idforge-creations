export const DB = "https://yususj-default-rtdb.firebaseio.com";

export type Vars = {
  deposit: string;
  name: string;
  logo: string;
  telegram: string;
  domain: string;
  invitecode: string;
};
export type AppRec = { status: string; variables: Vars; pausedAs?: string };

async function req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(`${DB}/${path}.json`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Database error ${r.status}`);
  return r.json();
}

export const fb = {
  getPassword: async () => (await req<string | null>("admin/password")) ?? "dev",
  setPassword: (p: string) => req("admin/password", "PUT", p),
  listApps: async () => (await req<Record<string, AppRec> | null>("apps")) ?? {},
  listBin: async () => (await req<Record<string, AppRec> | null>("bin")) ?? {},
  getApp: (id: string) => req<AppRec | null>(`apps/${id}`),
  putApp: (id: string, rec: AppRec) => req(`apps/${id}`, "PUT", rec),
  delApp: (id: string) => req(`apps/${id}`, "DELETE"),
  async toBin(id: string, rec: AppRec, as: "paused" | "stopped") {
    await req(`bin/${id}`, "PUT", { ...rec, pausedAs: as });
    await req(`apps/${id}`, "DELETE");
  },
  async resume(id: string, rec: AppRec) {
    const { pausedAs: _p, ...clean } = rec;
    await req(`apps/${id}`, "PUT", { ...clean, status: "ok" });
    await req(`bin/${id}`, "DELETE");
  },
  delBin: (id: string) => req(`bin/${id}`, "DELETE"),
};

export const genId = () =>
  Array.from({ length: 8 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");
