// Valores por defecto de la configuración. NADA de esto es información verificada del negocio:
// los campos de contacto quedan vacíos hasta que el cliente los confirme (se ocultan en la web).
export const DEFAULT_SETTINGS = {
  business_name: 'The One Bar Martínez',
  tagline: 'Gastronomía, coctelería y entretenimiento',
  about: '',
  logo_url: '',
  hero_image_url: '',
  accent_color: '#ff9d2e',
  whatsapp: '',
  phone: '',
  address: '',
  map_embed_url: '',
  instagram: '',
  facebook: '',
  hours: '',
  currency: 'ARS',
  orders_enabled: true,
  orders_note: 'Abrir WhatsApp no significa que el pedido fue recibido ni aceptado: el local debe confirmarlo.',
  reservations_enabled: true,
  reservations_max_party: 20,
  reservations_note: 'Tu solicitud queda pendiente hasta que el local la confirme.',
  private_events_enabled: true,
  show_unavailable_products: true,
  faq: [],
};

// Claves que el público puede leer (el backend aplica la misma lista vía RLS: is_public).
export const PUBLIC_SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
