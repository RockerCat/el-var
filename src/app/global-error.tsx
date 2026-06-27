"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          background: "#0a0a12",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "320px" }}>
          <p style={{ fontSize: "32px", margin: "0 0 8px" }}>⚠️</p>
          <p style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>
            Algo salió mal
          </p>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px" }}>
            La aplicación encontró un error inesperado. Recarga para continuar.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              background: "#00c85a",
              color: "#0a0a12",
              fontWeight: 700,
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
