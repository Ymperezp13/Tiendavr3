
// frontend/src/servicios/api.js
export const API_BASE = import.meta.env?.VITE_API_URL || "/api";

async function toJSON(res) {
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

// -------- Productos --------
export const listProducts = () =>
  fetch(`${API_BASE}/productos`, { headers: { Accept: "application/json" } }).then(toJSON);

export const createProduct = (body) =>
  fetch(`${API_BASE}/productos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  }).then(toJSON);

// -------- Pedido (pago simple) --------
export const crearPedido = (nombre, correo, items) =>
  fetch(`${API_BASE}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ nombre, correo, items }),
  }).then(toJSON);

// -------- Analíticas --------
export const ventasTop = (days = 30, metric = "cantidad", limit = 8) =>
  fetch(`${API_BASE}/ventas-top?days=${days}&metric=${metric}&limit=${limit}`).then(toJSON);

export const ventasSerie = (days = 30, metric = "cantidad", top = 5) =>
  fetch(`${API_BASE}/ventas-serie?days=${days}&metric=${metric}&top=${top}`).then(toJSON);

export const ventasResumen = (days = 30) =>
  fetch(`${API_BASE}/ventas-resumen?days=${days}`, {
    headers: { Accept: "application/json" },
  }).then(toJSON);

// -------- Seed --------
export const seed = () =>
  fetch(`${API_BASE}/seed`, { method: "POST", headers: { Accept: "application/json" } }).then(toJSON);

// -------- Tiempo real (SSE) opcional --------
export function connectEvents(onMessage, onError) {
  const url = `${API_BASE.replace(/\/$/, "")}/events`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage?.(data);
    } catch {
      onMessage?.(e.data);
    }
  };
  es.onerror = (err) => {
    es.close();
    onError?.(err);
    // reconexión simple
    setTimeout(() => connectEvents(onMessage, onError), 2000);
  };
  return es;
}
