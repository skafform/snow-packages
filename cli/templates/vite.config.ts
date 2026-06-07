import { reactRouter } from "@react-router/dev/vite"
import { defineConfig } from "vite"
import { skafform } from "@skafform/vite-plugin"

export default defineConfig({
  plugins: [reactRouter(), skafform()],
  resolve: {
    tsconfigPaths: true,
  },
})
