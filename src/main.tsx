/*
 * Purpose: Bootstraps the React app and mounts the root UI into the DOM.
 * Linked to: src/App.tsx, src/index.css, and the entire storefront/admin experience.
 * Note: This is the browser entry point for the frontend.
 */
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
