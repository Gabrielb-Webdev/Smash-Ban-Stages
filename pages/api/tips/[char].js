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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
    const { authorId, author, text, mediaData, videoUrl } = req.body || {};

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
      authorId: authorId ? sanitize(authorId).slice(0, 80) : null,
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

  // ── PATCH: editar tip propio ─────────────────────────
  if (req.method === 'PATCH') {
    const { tipId, userId, userName, text, mediaData: newMediaData, removeMedia, videoUrl } = req.body || {};
    if (!tipId || !userId) return res.status(400).json({ error: 'tipId y userId requeridos' });

    if (!global._smashTips[char]) return res.status(404).json({ error: 'Tip no encontrado' });
    const idx = global._smashTips[char].findIndex(t => t.id === String(sanitize(tipId).slice(0,80)));
    if (idx === -1) return res.status(404).json({ error: 'Tip no encontrado' });

    const existing = global._smashTips[char][idx];
    const cleanUserId = sanitize(userId).slice(0, 80);
    const cleanUserName = userName ? sanitize(userName).slice(0, 50) : null;
    // Permitir si coincide authorId, o si el tip no tiene authorId y el nombre coincide
    const ownsById   = existing.authorId && existing.authorId === cleanUserId;
    const ownsByName = !existing.authorId && cleanUserName &&
      existing.author && existing.author.trim().toLowerCase() === cleanUserName.trim().toLowerCase();
    if (!ownsById && !ownsByName) {
      return res.status(403).json({ error: 'No tenés permiso para editar este tip' });
    }

    const cleanText = text !== undefined ? sanitize(text) : existing.text;

    let fileInfo = null;
    if (newMediaData) {
      const result = validateFile(newMediaData);
      if (result?.error) return res.status(422).json({ error: result.error });
      fileInfo = result;
    }

    if (videoUrl) {
      const allowedHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitter.com', 'x.com'];
      try {
        const parsed = new URL(videoUrl);
        if (!allowedHosts.some(h => parsed.hostname.endsWith(h))) {
          return res.status(422).json({ error: 'URL de video no permitida. Usá YouTube o Vimeo.' });
        }
      } catch { return res.status(422).json({ error: 'URL de video inválida' }); }
    }

    global._smashTips[char][idx] = {
      ...existing,
      text: cleanText,
      mediaData: removeMedia ? null : (newMediaData || existing.mediaData),
      mediaType: removeMedia ? null : (fileInfo?.mime || existing.mediaType),
      mediaIsVideo: removeMedia ? false : (fileInfo?.isVideo ?? existing.mediaIsVideo),
      videoUrl: videoUrl !== undefined ? (videoUrl || null) : existing.videoUrl,
      updatedAt: new Date().toISOString(),
    };

    const updated = global._smashTips[char][idx];
    return res.status(200).json({ success: true, tip: { ...updated, mediaData: undefined } });
  }

  // ── DELETE: eliminar tip propio ──────────────────────
  if (req.method === 'DELETE') {
    const { tipId, userId, userName } = req.body || {};
    if (!tipId || !userId) return res.status(400).json({ error: 'tipId y userId requeridos' });

    if (!global._smashTips[char]) return res.status(404).json({ error: 'Tip no encontrado' });
    const idx = global._smashTips[char].findIndex(t => t.id === String(sanitize(tipId).slice(0,80)));
    if (idx === -1) return res.status(404).json({ error: 'Tip no encontrado' });

    const tip = global._smashTips[char][idx];
    const cleanUserId   = sanitize(userId).slice(0, 80);
    const cleanUserName = userName ? sanitize(userName).slice(0, 50) : null;
    const ownsById   = tip.authorId && tip.authorId === cleanUserId;
    const ownsByName = !tip.authorId && cleanUserName &&
      tip.author && tip.author.trim().toLowerCase() === cleanUserName.trim().toLowerCase();
    if (!ownsById && !ownsByName) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este tip' });
    }

    global._smashTips[char].splice(idx, 1);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
