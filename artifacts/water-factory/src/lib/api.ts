const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiGet(url: string) {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error("API Error");
  return res.json();
}

export async function apiPost(url: string, body: any) {
  const res = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("API Error");
  return res.json();
}