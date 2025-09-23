// src/App.jsx
import { useEffect, useState } from "react";
import Encabezado from "./componentes/Encabezado.jsx";
import CuadriculaProductos from "./componentes/CuadriculaProductos.jsx";
import CarritoPanel from "./componentes/CarritoPanel.jsx";
import LiveDashboard from "./componentes/LiveDashboard.jsx";
import { API_BASE, listProducts, seed } from "./servicios/api.js";
import Inicio from "./componentes/Inicio.jsx";

export default function App() {
  const [vista, setVista] = useState("catalogo"); // "catalogo" | "datos" | "inicio"
  const [carritoOpen, setCarritoOpen] = useState(false);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function cargar() {
    setLoading(true);
    setMsg("");
    try {
      console.log("GET", `${API_BASE}/productos`);
      const ps = await listProducts();
      if (!Array.isArray(ps) || ps.length === 0) {
        console.log("Sin productos: intento seed → POST", `${API_BASE}/seed`);
        await seed();                   // siembra demo
        const ps2 = await listProducts();
        setProductos(Array.isArray(ps2) ? ps2 : []);
        setMsg("Sembrado OK");
      } else {
        setProductos(ps);
      }
    } catch (e) {
      console.error("Error cargar():", e);
      setMsg("Error cargando productos: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedClick() {
    setLoading(true);
    setMsg("");
    try {
      console.log("FORZAR seed → POST", `${API_BASE}/seed`);
      await seed();
      const ps = await listProducts();
      setProductos(Array.isArray(ps) ? ps : []);
      setMsg("Sembrado OK (botón)");
    } catch (e) {
      console.error("Error seed():", e);
      setMsg("No se pudo sembrar: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log("API_BASE =", API_BASE);
    cargar();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16, fontFamily: "system-ui,sans-serif" }}>
      <Encabezado
        vista={vista}
        onGoInicio={() => setVista("inicio")}
        onGoCatalogo={() => setVista("catalogo")}
        onGoDatos={() => setVista("datos")}
        onGoAdmin={() => alert("Admin demo")}
        onToggleCarrito={() => setCarritoOpen((v) => !v)}
      />

      {/* Barra de utilidades */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
        <button onClick={cargar} disabled={loading}>↻ Recargar</button>
        <button onClick={handleSeedClick} disabled={loading}>🌱 Sembrar</button>
        <span style={{ opacity: 0.7, fontSize: 12 }}>API_BASE: {API_BASE}</span>
      </div>

      {msg && <p style={{ color: "#444" }}>{msg}</p>}

      {vista === "inicio" && (
        <Inicio
          irDatos={() => setVista("datos")}
          irCatalogo={() => setVista("catalogo")}
          irAdmin={() => alert("Admin demo")}
        />
      )}
      {vista === "catalogo" && <CuadriculaProductos productos={productos} />}
      {vista === "datos" && <LiveDashboard days={30} initialMetric="cantidad" limit={6} top={5} />}

      <CarritoPanel abierto={carritoOpen} onClose={() => setCarritoOpen(false)} />
    </div>
  );
}

