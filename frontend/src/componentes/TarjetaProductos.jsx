
import { useCart } from "../context/CartContext.jsx";

export default function TarjetaProductos({ producto }) {
  const { add } = useCart();

  return (
    <article style={{ border:"1px solid #eee", borderRadius:12, padding:12, display:"grid", gap:8 }}>
      <h4 style={{ margin:0 }}>{producto.titulo}</h4>
      <div style={{ opacity:.7 }}>${new Intl.NumberFormat("es-CO").format(producto.precio)}</div>
      <button onClick={() => add({ ...producto, qty: 1 })}>
        Agregar al carrito
      </button>
    </article>
  );
}
