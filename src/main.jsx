import React from "react";
import ReactDOM from "react-dom/client";
import EdenMCApp from "./App.jsx";
import "./index.css";

// Sem isso, um erro de renderização em qualquer lugar do app derruba a
// árvore inteira e deixa só o fundo escuro aparecendo (parece "tela preta
// travada", sem nenhuma pista do que aconteceu). Com isso, mostra o erro
// de verdade na tela -- essencial pra diagnosticar problemas que só
// aparecem no app de verdade, já que não dá pra ver o console daqui.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Erro capturado pelo ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0F1712",
            color: "#E7E9E2",
            padding: "24px",
            fontFamily: "monospace",
            fontSize: "13px",
            whiteSpace: "pre-wrap",
            overflowY: "auto",
          }}
        >
          <h1 style={{ color: "#C96A5A", fontSize: "16px", marginBottom: "12px" }}>
            Ocorreu um erro (isso não deveria acontecer — manda esse texto pra investigarmos)
          </h1>
          <p>{String(this.state.error?.message || this.state.error)}</p>
          <p style={{ marginTop: "16px", opacity: 0.7 }}>{this.state.error?.stack}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <EdenMCApp />
    </ErrorBoundary>
  </React.StrictMode>
);
