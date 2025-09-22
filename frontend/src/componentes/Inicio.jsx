// src/paginas/Inicio.jsx
export default function Inicio({ irCatalogo, irDatos, irAdmin }) {
  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Bienvenida</h2>
      <p>Elegí cómo querés usar la aplicación:</p>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Card
          titulo="Usuario final"
          descripcion="Explorá el catálogo, agregá al carrito y pagá con tu nombre/correo. También podés ver las gráficas de ventas."
          acciones={[
            { label: "Ir al catálogo", onClick: irCatalogo },
            { label: "Ver datos (Recharts)", onClick: irDatos },
          ]}
        />
        <Card
          titulo="Administración"
          descripcion="Gestión del catálogo: crear, editar y eliminar productos (CRUD)."
          acciones={[{ label: "Ir a Admin", onClick: irAdmin }]}
        />
      </section>
    </main>
  );
}

function Card({ titulo, descripcion, acciones = [] }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 8 }}>
      <h3 style={{ margin: 0 }}>{titulo}</h3>
      <p style={{ margin: 0, color: "#4b5563" }}>{descripcion}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {acciones.map((a, i) => (
          <button key={i} onClick={a.onClick} style={{ padding: "8px 10px", borderRadius: 8 }}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
// Fin src/paginas/Inicio.jsx