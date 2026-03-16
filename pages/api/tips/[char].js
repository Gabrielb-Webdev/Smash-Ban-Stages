// API para tips por personaje — almacenamiento en memoria global

if (!global._smashTips) global._smashTips = {};

// ── Firmas mágicas de archivos permitidos (OWASP secure file upload) ────
const ALLOWED_SIGNATURES = [
  // JPEG
  { mime: 'image/jpeg', ext: 'jpg', sig: [0xFF, 0xD8, 0xFF] },
  // PNG
  { mime: 'image/png',  ext: 'png', sig: [0x89, 0x50, 0x4E, 0x47] },
  // GIF
  { mime: 'image/gif',  ext: 'gif', sig: [0x47, 0x49, 0x46, 0x38] },
  // WebP (RIFF....WEBP)
  { mime: 'image/webp', ext: 'webp', sig: [0x52, 0x49, 0x46, 0x46], extraOffset: 8, extraSig: [0x57, 0x45, 0x42, 0x50] },
  // MP4 / MOV (ISO Base Media — ftyp box after 4 bytes)
  { mime: 'video/mp4', ext: 'mp4', sig: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  // WebM
  { mime: 'video/webm', ext: 'webm', sig: [0x1A, 0x45, 0xDF, 0xA3] },
];

const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,  // 5 MB
  video: 40 * 1024 * 1024, // 40 MB
};

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 2000);
}

function validateFile(base64Data) {
  if (!base64Data) return null;

  // Decodificar los primeros 16 bytes para verificar firma
  let header;
  try {
    const raw = base64Data.replace(/^data:[^;]+;base64,/, '');
    const binary = Buffer.from(raw.slice(0, 32), 'base64');
    header = Array.from(binary);
  } catch {
    return { error: 'Archivo inválido' };
  }

  // Tamaño estimado en bytes desde base64
  const base64Body = base64Data.replace(/^data:[^;]+;base64,/, '');
  const estimatedBytes = Math.floor(base64Body.length * 0.75);

  for (const sig of ALLOWED_SIGNATURES) {
    const offset = sig.offset || 0;
    const match = sig.sig.every((b, i) => header[offset + i] === b);
    if (match) {
      const isVideo = sig.mime.startsWith('video/');
      const limit = isVideo ? FILE_SIZE_LIMITS.video : FILE_SIZE_LIMITS.image;
      if (estimatedBytes > limit) {
        return { error: `Archivo demasiado grande. Máximo: ${Math.floor(limit / (1024 * 1024))} MB` };
      }
      return { mime: sig.mime, ext: sig.ext, isVideo };
    }
  }

  return { error: 'Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, GIF, WebP, MP4, WebM' };
}

export const config = {
  api: { bodyParser: { sizeLimit: '45mb' } },
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Validar y normalizar el parámetro char
  const rawChar = req.query.char;
  if (!rawChar || typeof rawChar !== 'string') {
    return res.status(400).json({ error: 'Personaje inválido' });
  }
  const char = decodeURIComponent(rawChar).trim().slice(0, 80);
  if (!char) return res.status(400).json({ error: 'Personaje inválido' });

  // ── GET: obtener tips para un personaje ─────────────
  if (req.method === 'GET') {
    const tips = global._smashTips[char] || [];
    return res.status(200).json(tips);
  }

  // ── POST: subir nuevo tip ────────────────────────────
  if (req.method === 'POST') {
    const { author, text, mediaData, videoUrl } = req.body || {};

    // Validar texto
    const cleanText = text ? sanitize(text) : '';
    if (!cleanText && !mediaData && !videoUrl) {
      return res.status(400).json({ error: 'El tip debe tener texto, imagen o video' });
    }
    if (cleanText.length === 0 && !mediaData && !videoUrl) {
      return res.status(400).json({ error: 'Ingresá al menos texto o un archivo' });
    }

    // Validar archivo si se adjuntó
    let fileInfo = null;
    if (mediaData) {
      const result = validateFile(mediaData);
      if (result?.error) {
        return res.status(422).json({ error: result.error });
      }
      fileInfo = result;
    }

    // Validar URL de video si se proporcionó
    if (videoUrl) {
      // Solo permitir dominios de video conocidos
      const allowedHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitter.com', 'x.com'];
      try {
        const parsed = new URL(videoUrl);
        const allowed = allowedHosts.some(h => parsed.hostname.endsWith(h));
        if (!allowed) {
          return res.status(422).json({ error: 'URL de video no permitida. Usá YouTube o Vimeo.' });
        }
      } catch {
        return res.status(422).json({ error: 'URL de video inválida' });
      }
    }

    if (!global._smashTips[char]) global._smashTips[char] = [];

    const tip = {
      id: `tip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      char,
      author: author ? sanitize(author).slice(0, 50) : 'Anónimo',
      text: cleanText,
      mediaData: mediaData || null,         // base64 o null
      mediaType: fileInfo?.mime || null,
      mediaIsVideo: fileInfo?.isVideo || false,
      videoUrl: videoUrl || null,
      createdAt: new Date().toISOString(),
    };

    global._smashTips[char].push(tip);

    // Máximo 200 tips por personaje
    if (global._smashTips[char].length > 200) {
      global._smashTips[char] = global._smashTips[char].slice(-200);
    }

    return res.status(201).json({ success: true, tip: { ...tip, mediaData: undefined } });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
