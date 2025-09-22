// src/componentes/Encabezado.jsx
import { useTheme } from "../context/ThemeContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Encabezado({ vista, onGoInicio, onGoCatalogo, onGoAdmin, onGoDatos, onToggleCarrito }) {
  const { theme, toggleTheme } = useTheme();
  const { count } = useCart();
  const is = (v) => vista === v;
  const btn = (a) => ({ opacity: a ? 0.6 : 1, fontWeight: a ? 700 : 500 });

  return (
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}}>
      <h1 style={{margin:0}}>Mi Tienda</h1>
      <nav style={{display:"flex",gap:8,alignItems:"center"}}>
        <button style={btn(is("inicio"))} onClick={onGoInicio}   disabled={is("inicio")}>Inicio</button>
        <button style={btn(is("catalogo"))} onClick={onGoCatalogo} disabled={is("catalogo")}>Ver tienda</button>
        <button style={btn(is("datos"))} onClick={onGoDatos} disabled={is("datos")}>Datos</button>
        <button onClick={toggleTheme}>🌓 {theme==="dark"?"Oscuro":"Claro"}</button>
        <button onClick={onToggleCarrito}>🛒 ({count})</button>
        <button style={btn(is("admin"))} onClick={onGoAdmin} disabled={is("admin")}>Admin</button>
      </nav>
    </header>
  );
}
// Fin src/componentes/Encabezado.jsx
