import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
createRoot(document.getElementById("root")).render(<React.StrictMode><ThemeProvider><CartProvider><App/></CartProvider></ThemeProvider></React.StrictMode>);
