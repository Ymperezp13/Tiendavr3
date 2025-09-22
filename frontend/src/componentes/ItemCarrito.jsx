
export default function ItemCarrito({ item, onInc, onDec, onRemove }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:8, alignItems:"center" }}>
      <div>
        <div style={{ fontWeight:600 }}>{item.titulo}</div>
        <div style={{ fontSize:12, opacity:.7 }}>${new Intl.NumberFormat("es-CO").format(item.precio)}</div>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <button onClick={onDec}>-</button>
        <span>{item.qty}</span>
        <button onClick={onInc}>+</button>
      </div>
      <div>${new Intl.NumberFormat("es-CO").format(item.precio * item.qty)}</div>
      <button onClick={onRemove} style={{ color:"crimson" }}>Quitar</button>
    </div>
  );
}
