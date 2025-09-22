
import { useEffect, useMemo, useState } from "react";
import { ventasTop, ventasSerie, seed } from "../servicios/api.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

const API_BASE = import.meta.env?.VITE_API_URL || "http://127.0.0.1:5001/api";

export default function LiveDashboard({ days=30, initialMetric="cantidad", limit=6, top=5, fallbackMs=15000 }) {
  const [metric, setMetric] = useState(initialMetric);
  const [topData, setTopData] = useState([]);
  const [serie, setSerie] = useState({ labels: [], series: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function cargar() {
    try {
      setLoading(true);
      const [t, s] = await Promise.all([ ventasTop(days, metric, limit), ventasSerie(days, metric, top) ]);
      setTopData(Array.isArray(t) ? t : []);
      setSerie(s?.labels ? s : { labels: [], series: [] });
      setErr("");
    } catch (e) { setErr(e.message || "Error cargando datos"); }
    finally { setLoading(false); }
  }
  useEffect(() => { cargar(); }, [days, metric, limit, top]);

  useEffect(() => {
    let es; let id = setInterval(cargar, fallbackMs);
    try {
      es = new EventSource(`${API_BASE}/ventas-sse`);
      es.onmessage = () => cargar();
    } catch {}
    return () => { clearInterval(id); if (es && es.close) es.close(); };
  }, [fallbackMs, days, metric, limit, top]);

  const barData = useMemo(() => {
    const sorted = [...topData].sort((a,b)=> (b[metric]||0)-(a[metric]||0));
    return sorted.map(r => ({ titulo: r.titulo, valor: Number(r[metric] || 0) }));
  }, [topData, metric]);

  const lineData = useMemo(() => {
    const arr = [];
    for (let i = 0; i < (serie.labels?.length || 0); i++) {
      const row = { fecha: serie.labels[i] };
      for (const s of (serie.series || [])) row[s.titulo] = s.data[i] || 0;
      arr.push(row);
    }
    return arr;
  }, [serie]);

  const fmt = (n)=> new Intl.NumberFormat("es-CO").format(n);

  async function handleSeed() {
    setMsg("");
    try { const r = await seed(); setMsg(r?.msg || "Datos generados"); await cargar(); }
    catch(e) { setMsg(e.message || "Error al sembrar"); }
  }

  return (
    <section style={{ display:"grid", gap:16, marginTop:16 }}>
      <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
        <h3 style={{ margin:0 }}>Ventas</h3>
        <label>últimos {days} días</label>
        <label style={{ marginLeft:"auto" }}>
          Métrica:&nbsp;
          <select value={metric} onChange={e=>setMetric(e.target.value)}>
            <option value="cantidad">Cantidad</option>
            <option value="ingreso">Ingreso</option>
          </select>
        </label>
        <button onClick={handleSeed} style={{ background:"#e11d48", color:"#fff", border:"none", padding:"6px 10px", borderRadius:6 }}>
          Sembrar datos
        </button>
        {loading && <small style={{ opacity:.6 }}>Actualizando…</small>}
        {err && <small style={{ color:"crimson" }}>{err}</small>}
        {msg && <small style={{ color:"seagreen" }}>{msg}</small>}
      </div>

      <div style={{ width:"100%", height:320, border:"1px solid #ddd", borderRadius:8, padding:8 }}>
        <h4 style={{ margin:0, marginBottom:8 }}>Top {limit} por {metric}</h4>
        <ResponsiveContainer>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="titulo" hide />
            <YAxis tickFormatter={fmt} />
            <Tooltip formatter={(v)=>fmt(v)} />
            <Legend />
            <Bar dataKey="valor" name={metric==="cantidad" ? "Unidades" : "Ingreso"} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:8 }}>
          {barData.map(d => <span key={d.titulo} style={{ fontSize:12, background:"#eee", padding:"2px 6px", borderRadius:6 }}>{d.titulo}</span>)}
        </div>
      </div>

      <div style={{ width:"100%", height:360, border:"1px solid #ddd", borderRadius:8, padding:8 }}>
        <h4 style={{ margin:0, marginBottom:8 }}>Serie diaria (top {top}) · {metric}</h4>
        <ResponsiveContainer>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis tickFormatter={fmt} />
            <Tooltip formatter={(v)=>fmt(v)} />
            <Legend />
            {(serie.series || []).map(s => <Line key={s.titulo} type="monotone" dataKey={s.titulo} dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
