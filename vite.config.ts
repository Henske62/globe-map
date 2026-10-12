import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' -> der Build läuft auf jedem statischen Hoster und in Unterordnern.
export default defineConfig({
  base: './',
  plugins: [react()],
  // three.js (Globus) ist groß, wird aber erst bei Bedarf nachgeladen.
  build: { chunkSizeWarningLimit: 2500 },
});
