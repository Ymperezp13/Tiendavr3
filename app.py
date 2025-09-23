# backend/app.py
import os, time, sqlite3, random
from datetime import datetime, timedelta
from threading import Event as ThreadEvent
from collections import defaultdict, OrderedDict

from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "tienda.db")

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/events": {"origins": "*"},
})
ventas_event = ThreadEvent()

def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=15, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@app.errorhandler(Exception)
def handle_any_error(e):
    if isinstance(e, HTTPException):
        return e
    app.logger.exception("Unhandled error")
    return jsonify({"error": type(e).__name__, "message": str(e)}), 500

# --- Bootstrap DB ---
with get_conn() as conn:
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            precio REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            correo TEXT NOT NULL,
            creado_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pedido_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );
    """)

@app.get("/")
def home():
    return "<h2>API Tienda OK</h2><ul><li>/api/health</li><li>/api/productos</li><li>/api/pedidos (POST)</li><li>/api/ventas-top</li><li>/api/ventas-serie</li><li>/api/ventas-resumen</li><li>/api/seed (POST)</li><li>/events (SSE)</li></ul>"

@app.get("/api/health")
def health():
    return {"ok": True}

# -------- Productos --------
@app.get("/api/productos")
def productos_listar():
    with get_conn() as conn:
        rows = conn.execute("SELECT id, titulo, precio FROM productos ORDER BY id").fetchall()
        return jsonify([dict(r) for r in rows])

@app.post("/api/productos")
def productos_crear():
    data = request.get_json(force=True) or {}
    titulo = str(data.get("titulo") or "").strip()
    try:
        precio = float(data.get("precio"))
    except Exception:
        return jsonify({"error": "Precio inválido"}), 400
    if not titulo:
        return jsonify({"error": "Título requerido"}), 400
    with get_conn() as conn:
        cur = conn.execute("INSERT INTO productos(titulo, precio) VALUES(?,?)", (titulo, precio))
        new_id = cur.lastrowid
        row = conn.execute("SELECT id, titulo, precio FROM productos WHERE id=?", (new_id,)).fetchone()
        return jsonify(dict(row)), 201

# -------- Pedidos (pago simple) --------
@app.post("/api/pedidos")
def pedidos_crear():
    data = request.get_json(force=True) or {}
    nombre = str(data.get("nombre") or "").strip()
    correo = str(data.get("correo") or "").strip()
    items  = data.get("items") or []
    if not nombre or not correo or not isinstance(items, list) or len(items) == 0:
        return jsonify({"error":"Datos incompletos"}), 400

    with get_conn() as conn:
        cur = conn.cursor()
        ts = datetime.now().isoformat(timespec="seconds")
        cur.execute("INSERT INTO pedidos(nombre, correo, creado_en) VALUES(?,?,?)", (nombre, correo, ts))
        pedido_id = cur.lastrowid

        for it in items:
            pid = it.get("id")
            titulo = str(it.get("titulo") or "").strip()
            qty = int(it.get("qty") or 1)
            try:
                precio_unit = float(it.get("precio"))
            except Exception:
                precio_unit = 0.0

            prod_row = None
            if pid is not None:
                prod_row = cur.execute("SELECT id, precio FROM productos WHERE id=?", (int(pid),)).fetchone()
            if prod_row is None and titulo:
                prod_row = cur.execute(
                    "SELECT id, precio FROM productos WHERE lower(trim(titulo))=lower(trim(?))", (titulo,)
                ).fetchone()
            if prod_row is None:
                cur.execute("INSERT INTO productos(titulo, precio) VALUES(?,?)", (titulo, precio_unit))
                producto_id = cur.lastrowid
            else:
                producto_id = prod_row["id"]
                if not precio_unit:
                    precio_unit = float(prod_row["precio"])

            cur.execute(
                "INSERT INTO pedido_items(pedido_id, producto_id, cantidad, precio_unitario) VALUES(?,?,?,?)",
                (pedido_id, producto_id, qty, precio_unit)
            )
        conn.commit()
        try: ventas_event.set()
        except: pass

    return jsonify({"ok": True, "pedido_id": pedido_id})

# -------- Analítica para Recharts --------
@app.get("/api/ventas-top")
def ventas_top():
    try:
        days = int(request.args.get("days", 30))
        metric = request.args.get("metric", "cantidad")
        limit = int(request.args.get("limit", 6))
        if metric not in ("cantidad","ingreso"):
            metric = "cantidad"
    except Exception:
        return jsonify({"error":"params inválidos"}), 400

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT prod.titulo AS titulo,
                   SUM(pi.cantidad) AS cantidad,
                   SUM(pi.cantidad * pi.precio_unitario) AS ingreso
            FROM pedidos ped
            JOIN pedido_items pi ON pi.pedido_id = ped.id
            JOIN productos prod  ON prod.id = pi.producto_id
            WHERE ped.creado_en >= DATETIME('now', ?)
            GROUP BY prod.titulo
            ORDER BY CASE WHEN ?='cantidad' THEN SUM(pi.cantidad)
                          ELSE SUM(pi.cantidad * pi.precio_unitario) END DESC
            LIMIT ?
            """, (f"-{days} days", metric, limit)
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.get("/api/ventas-serie")
def ventas_serie():
    try:
        days = int(request.args.get("days", 30))
        metric = request.args.get("metric", "cantidad")
        top_n = int(request.args.get("top", 5))
        if metric not in ("cantidad","ingreso"):
            metric = "cantidad"
    except Exception:
        return jsonify({"error":"params inválidos"}), 400

    with get_conn() as conn:
        top_rows = conn.execute(
            """
            SELECT prod.titulo AS titulo,
                   SUM(pi.cantidad) AS cantidad,
                   SUM(pi.cantidad * pi.precio_unitario) AS ingreso
            FROM pedidos ped
            JOIN pedido_items pi ON pi.pedido_id = ped.id
            JOIN productos prod  ON prod.id = pi.producto_id
            WHERE ped.creado_en >= DATETIME('now', ?)
            GROUP BY prod.titulo
            ORDER BY CASE WHEN ?='cantidad' THEN SUM(pi.cantidad)
                          ELSE SUM(pi.cantidad * pi.precio_unitario) END DESC
            LIMIT ?
            """, (f"-{days} days", metric, top_n)
        ).fetchall()
        top_titulos = [r["titulo"] for r in top_rows]
        if not top_titulos:
            return jsonify({"labels": [], "series": []})

        qmarks = ",".join(["?"]*len(top_titulos))
        detalle = conn.execute(
            f"""
            SELECT DATE(ped.creado_en) AS fecha, prod.titulo AS titulo,
                   SUM(pi.cantidad) AS cantidad,
                   SUM(pi.cantidad * pi.precio_unitario) AS ingreso
            FROM pedidos ped
            JOIN pedido_items pi ON pi.pedido_id = ped.id
            JOIN productos prod  ON prod.id = pi.producto_id
            WHERE ped.creado_en >= DATETIME('now', ?) AND prod.titulo IN ({qmarks})
            GROUP BY fecha, titulo
            ORDER BY fecha ASC, titulo ASC
            """, (f"-{days} days", *top_titulos)
        ).fetchall()

    by_title = defaultdict(lambda: OrderedDict())
    fechas_set = set()
    for r in detalle:
        f = r["fecha"]; t = r["titulo"]; val = r[metric]
        fechas_set.add(f); by_title[t][f] = float(val or 0.0)

    labels = sorted(list(fechas_set))
    series = []
    for t in top_titulos:
        od = by_title.get(t, {})
        data = [float(od.get(f, 0.0)) for f in labels]
        series.append({"titulo": t, "data": data})
    return jsonify({"labels": labels, "series": series})

# -------- Resumen agregado (nuevo) --------
@app.get("/api/ventas-resumen")
def ventas_resumen():
    try:
        days = int(request.args.get("days", 30))
    except Exception:
        return jsonify({"error":"params inválidos"}), 400

    with get_conn() as conn:
        r = conn.execute(
            """
            SELECT 
              COUNT(DISTINCT ped.id) AS pedidos,
              SUM(pi.cantidad)       AS items,
              SUM(pi.cantidad * pi.precio_unitario) AS ingreso
            FROM pedidos ped
            JOIN pedido_items pi ON pi.pedido_id = ped.id
            WHERE ped.creado_en >= DATETIME('now', ?)
            """, (f"-{days} days",)
        ).fetchone()
    return jsonify({
        "pedidos": int(r["pedidos"] or 0),
        "items":   float(r["items"] or 0),
        "ingreso": float(r["ingreso"] or 0.0)
    })

# -------- SSE: refresco en vivo --------
@app.get("/api/ventas-sse")
def ventas_sse():
    def generate():
        yield "retry: 3000\n\n"
        yield f"data: {int(time.time())}\n\n"
        while True:
            ventas_event.wait(timeout=60)
            ventas_event.clear()
            yield f"data: {int(time.time())}\n\n"
    headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    return Response(generate(), mimetype="text/event-stream", headers=headers)

# Alias que esperan muchos frontends (EventSource a /events)
@app.get("/events")
def events_alias():
    return ventas_sse()

# -------- Seed de datos --------
@app.post("/api/seed")
def seed():
    titles = ["Leggings Pro", "Top Compresión", "Jogger Fit", "Short Runner", "Camiseta Dry"]
    precios = [120000, 90000, 135000, 80000, 70000]
    hoy = datetime.now()

    with get_conn() as conn:
        cur = conn.cursor()
        for t, p in zip(titles, precios):
            cur.execute("INSERT INTO productos(titulo, precio) VALUES(?,?)", (t, p))
        for i in range(12):
            fecha = (hoy - timedelta(days=random.randint(0, 14))).replace(hour=12, minute=0, second=0)
            cur.execute("INSERT INTO pedidos(nombre, correo, creado_en) VALUES(?,?,?)",
                        (f"Cliente {i+1}", f"c{i+1}@mail.com", fecha.isoformat(timespec="seconds")))
            pedido_id = cur.lastrowid
            for _ in range(random.randint(1, 3)):
                prod = cur.execute("SELECT id, precio FROM productos ORDER BY RANDOM() LIMIT 1").fetchone()
                qty = random.randint(1, 4)
                cur.execute(
                    "INSERT INTO pedido_items(pedido_id, producto_id, cantidad, precio_unitario) VALUES(?,?,?,?)",
                    (pedido_id, prod["id"], qty, prod["precio"])
                )
        conn.commit()
        try: ventas_event.set()
        except: pass
    return {"ok": True, "msg": "Sembrado con éxito"}

# --- DEBUG / UTILIDADES ---

# GET alternativo para sembrar (atajo si lo abres en el navegador)
@app.get("/api/seed-get")
def seed_get_alias():
    return seed()

# Conteos rápidos para verificar que hay datos en la DB
@app.get("/api/debug-stats")
def debug_stats():
    with get_conn() as conn:
        prod = conn.execute("SELECT COUNT(*) AS n FROM productos").fetchone()["n"]
        ped  = conn.execute("SELECT COUNT(*) AS n FROM pedidos").fetchone()["n"]
        it   = conn.execute("SELECT COUNT(*) AS n FROM pedido_items").fetchone()["n"]
    return jsonify({"productos": prod, "pedidos": ped, "items": it})

# Inserta un producto de prueba (para descartar permisos de escritura)
@app.post("/api/debug-add-producto")
def debug_add_producto():
    with get_conn() as conn:
        cur = conn.execute("INSERT INTO productos(titulo, precio) VALUES(?,?)", ("TEST-DEBUG", 12345))
        new_id = cur.lastrowid
        row = conn.execute("SELECT id, titulo, precio FROM productos WHERE id=?", (new_id,)).fetchone()
        return jsonify(dict(row)), 201

# --- Entrypoint ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Render inyecta PORT
    app.run(host="0.0.0.0", port=port, debug=True)
