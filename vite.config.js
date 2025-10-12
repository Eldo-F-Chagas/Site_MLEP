import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: 'web',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'web/index.html',
        about: 'web/about.html',
        research: 'web/research.html',
        publications: 'web/publications.html',
        projects: 'web/projects.html',
        team: 'web/team.html',
        news: 'web/news.html',
        events: 'web/events.html',
        resources: 'web/resources.html',
        contact: 'web/contact.html',
        cursos: 'web/cursos.html',
        curso: 'web/curso.html'
      },
      output: {
        manualChunks: {
          vendor: ['fastapi'],
          utils: ['web/assets/js/lazy-loader.js', 'web/assets/js/image-lazy-loader.js']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ]
});
