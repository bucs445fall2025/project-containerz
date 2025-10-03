import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [health, setHealth] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setHealth).catch(console.error);
  }, []);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Financial Analysis Tool</h1>
      <p>API health: {health ? JSON.stringify(health) : "loading..."}</p>
      <p>ML endpoint test: <code>/ml/health</code></p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
