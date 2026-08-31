import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Capacitor serve os arquivos do jeito que estão (file://), então caminho
  // relativo é obrigatório — sem isso os assets não carregam dentro do app.
  base: "./",
  build: {
    outDir: "dist",
  },
});
