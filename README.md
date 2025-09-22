
# Tienda React + Flask (Carrito + Pago simple + Recharts)

Incluye:
- **Flask** (SQLite) con CRUD de productos, **POST /api/pedidos** (nombre/correo) y endpoints de analítica para **Recharts**.
- **React** (Vite) con carrito, checkout modal y dashboard (Top/Serie) + botón **Sembrar datos**.

## 1) Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
# -> http://127.0.0.1:5001
```

## 2) Frontend
```bash
cd frontend
npm i
cp .env.example .env   # ajusta VITE_API_URL si cambias backend
npm run dev
# -> http://localhost:5173
```

## 3) Probar
- En **Catálogo**, agrega productos al carrito y realiza **Pagar** (pide nombre y correo).
- En **Datos**, verás las gráficas. Si no hay nada aún, pulsa **Sembrar datos**.

## Notas
- El almacenamiento es un archivo SQLite `tienda.db` en `backend/`.
- En producción, usa un servicio de BD persistente (Postgres) y un servidor WSGI (gunicorn).
