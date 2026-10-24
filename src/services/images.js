import { BACKEND, MAX_IMAGE_MB } from '../config/env.js';
import { validateImageFile } from './validators.js';
import { supabase } from '../repositories/supabaseClient.js';
import { uid } from '../utils/html.js';

const BUCKET = 'public-images';
const MAX_SIDE = 1600;

/** Redimensiona y recomprime a WebP en el navegador (optimiza peso y descarta metadatos EXIF). */
async function optimize(file, maxSide = MAX_SIDE, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blob;
}

const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

/** Devuelve la URL pública (Supabase) o un data URL reducido (demo local). */
export async function uploadImage(file, folder = 'general') {
  const err = validateImageFile(file, MAX_IMAGE_MB);
  if (err) throw new Error(err);
  if (BACKEND === 'local') return blobToDataUrl(await optimize(file, 900, 0.7)); // cabe en localStorage
  const blob = await optimize(file);
  const path = `${folder.replace(/[^a-z0-9-]/gi, '')}/${uid()}.webp`; // nombre generado: nunca el del usuario
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw new Error('No se pudo subir la imagen: ' + error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borra el archivo anterior (mejor esfuerzo) si pertenece a nuestro bucket. */
export async function deleteImageByUrl(url) {
  if (BACKEND !== 'supabase' || !url) return;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  await supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
}
