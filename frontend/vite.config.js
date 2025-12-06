import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: "",
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: false,
    allowedHosts: [
      "github-assets.preview.emergentagent.com",
      ".preview.emergentagent.com",
      "localhost"
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  },
  plugins: [],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      phaser: "phaser/dist/phaser.js",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/test/**/*.{test,spec}.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
})
