
import TarjetaProductos from "./TarjetaProductos.jsx";

export default function CuadriculaProductos({ productos }) {
  if (!productos?.length) return <p>No hay productos (usa el botón Sembrar en Datos o crea productos por API).</p>;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12 }}>
      {productos.map(p => <TarjetaProductos key={p.id} producto={p} />)}
    </div>
  );
}
