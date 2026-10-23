import { defineConfig } from "vite";
import { pie } from "@tinyvolt/pie/vite";

export default defineConfig({
  plugins: [pie()],
});
