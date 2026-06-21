import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000, // handle warning on vendor.js bundle size
  },
  server: {
    // `true` disables the host check entirely so dynamic CodeSandbox
    // preview hosts (e.g. *.csb.app) are allowed.
    allowedHosts: true
  }
});
