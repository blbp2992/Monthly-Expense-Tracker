import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Monthly-Expense-Tracker/',
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
});
