import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

// Inyecta robots/OG según el modo y genera robots.txt (+ sitemap solo en producción con URL).
function novantiqPlugin(env) {
  const production = env.VITE_APP_MODE === 'production';
  const site = (env.VITE_SITE_URL || '').replace(/\/$/, '');
  return {
    name: 'novantiq-seo',
    transformIndexHtml(html, ctx) {
      const isAdmin = ctx.path.includes('/admin');
      const robots = !production || isAdmin ? 'noindex, nofollow' : 'index, follow';
      const og = !isAdmin && site ? `<meta property="og:url" content="${site}/">` : '';
      return html.replace('<!--ROBOTS-->', `<meta name="robots" content="${robots}">`).replace('<!--OG-->', og);
    },
    generateBundle() {
      const lines = production ? ['User-agent: *', 'Disallow: /admin/', ...(site ? [`Sitemap: ${site}/sitemap.xml`] : [])] : ['User-agent: *', 'Disallow: /'];
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: lines.join('\n') + '\n' });
      if (production && site) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url></urlset>\n` });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [novantiqPlugin(env)],
    build: {
      target: 'es2020',
      rollupOptions: { input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin/index.html') } },
    },
  };
});
