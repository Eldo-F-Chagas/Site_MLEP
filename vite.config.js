import { copyFileSync, cpSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const webRoot = resolve(process.cwd(), 'web');
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const pagesBase = '/Site_MLEP/';
const htmlEntries = Object.fromEntries(
  readdirSync(webRoot)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file.replace(/\.html$/, ''), resolve(webRoot, file)]),
);

export default defineConfig({
  root: webRoot,
  base: isGitHubPages ? pagesBase : '/',
  build: {
    outDir: resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      input: htmlEntries,
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: 'github-pages-links',
      transformIndexHtml(html) {
        if (!isGitHubPages) return html;
        const pages = '(about|aula|contact|curso|cursos|events|forum-topic|forum|index|login|materiais|news|profile|projects|publications|register|research|resources|settings|team)';
        return html
          .replace(/href="\/(?:index)?"/g, `href="${pagesBase}index.html"`)
          .replace(new RegExp(`href="/${pages}([?#][^"]*)?"`, 'g'), (_, page, suffix = '') => (
            `href="${pagesBase}${page}.html${suffix}"`
          ));
      },
    },
    {
      name: 'copy-service-worker',
      closeBundle() {
        ['sw.js', 'robots.txt', 'sitemap.xml'].forEach((file) => {
          copyFileSync(resolve(webRoot, file), resolve(process.cwd(), 'dist', file));
        });
        cpSync(resolve(webRoot, 'i18n'), resolve(process.cwd(), 'dist', 'i18n'), { recursive: true });
      },
    },
  ],
});
