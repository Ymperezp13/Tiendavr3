
import { useEffect, useState } from "react";
import Encabezado from "./componentes/Encabezado.jsx";
import CuadriculaProductos from "./componentes/CuadriculaProductos.jsx";
import CarritoPanel from "./componentes/CarritoPanel.jsx";
import LiveDashboard from "./componentes/LiveDashboard.jsx";
import { listProducts, seed } from "./servicios/api.js";
import Inicio from "./componentes/Inicio.jsx";

export default function App() {
  const [vista, setVista] = useState("catalogo"); // "catalogo" | "datos"
  const [carritoOpen, setCarritoOpen] = useState(false);
  const [productos, setProductos] = useState([]);

  async function cargar() {
    try {
      const ps = await listProducts();
      if (!ps.length) { await seed(); } // si no hay productos, siembra demo
      setProductos(await listProducts());
    } catch {}
  }
  useEffect(() => { cargar(); }, []);

  return (
    <div style={{ maxWidth: 1100, margin:"24px auto", padding:16, fontFamily:"system-ui,sans-serif" }}>
      <Encabezado
        vista={vista}
        onGoInicio={() => setVista("inicio")}
        onGoCatalogo={() => setVista("catalogo")}
        onGoDatos={() => setVista("datos")}
        onGoAdmin={() => alert("Admin demo")}
        onToggleCarrito={() => setCarritoOpen(v => !v)}
      />
      {vista === "inicio" && <Inicio irDatos={() => setVista("datos")} irCatalogo={() => setVista("catalogo")} irAdmin={() => alert("Admin demo")} />}
      {vista === "catalogo" && <CuadriculaProductos productos={productos} />}
      {vista === "datos" && <LiveDashboard days={30} initialMetric="cantidad" limit={6} top={5} />}

      <CarritoPanel abierto={carritoOpen} onClose={()=>setCarritoOpen(false)} />
    </div>
  );
}
