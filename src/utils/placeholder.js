// Imágenes de reemplazo generadas (SVG). NO son fotografías del local.
export function placeholderImage(label = 'Imagen de ejemplo', hue = 28) {
  const safe = String(label).replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,16%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},60%,7%)"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="640" cy="120" r="150" fill="hsl(${hue},90%,55%)" opacity=".13"/><circle cx="130" cy="520" r="190" fill="hsl(${hue},90%,55%)" opacity=".08"/><text x="400" y="300" fill="#fff" fill-opacity=".85" font-family="system-ui,sans-serif" font-size="34" font-weight="700" text-anchor="middle">${safe}</text><text x="400" y="344" fill="#fff" fill-opacity=".5" font-family="system-ui,sans-serif" font-size="22" text-anchor="middle">Imagen de ejemplo · reemplazar</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
