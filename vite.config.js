import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host:true so you can open the dev server on your phone over LAN
  server: { host: true, port: 5173 },
});
