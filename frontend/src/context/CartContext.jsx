
import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // {id?, titulo, precio, qty}

  function add(p) {
    setItems(prev => {
      const idx = prev.findIndex(x => (x.id ?? x.titulo) === (p.id ?? p.titulo));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + (p.qty || 1) };
        return copy;
      }
      return [...prev, { ...p, qty: p.qty || 1 }];
    });
  }
  const inc = (p) => setItems(prev => prev.map(x => (x.id ?? x.titulo) === (p.id ?? p.titulo) ? { ...x, qty: x.qty + 1 } : x));
  const dec = (p) => setItems(prev => prev.map(x => (x.id ?? x.titulo) === (p.id ?? p.titulo) ? { ...x, qty: Math.max(1, x.qty - 1) } : x));
  const remove = (p) => setItems(prev => prev.filter(x => (x.id ?? x.titulo) !== (p.id ?? p.titulo)));
  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);
  const total = useMemo(() => items.reduce((s, it) => s + it.precio * it.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, inc, dec, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
