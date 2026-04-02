// POST /api/afk/upload-screenshot
// Body: { image: "<base64 PNG sin prefijo>", filename: "...", tournamentName: "..." }
// Sube la imagen a Google Drive en una subcarpeta por torneo.

import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_PARENT_FOLDER_ID = '1wLFXCRD5SVBZBFvfCHy2tiBgh5OsR9jQ';

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no configurado');
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

async function findOrCreateFolder(drive, name, parentId) {
  const safeName = name.replace(/[\/\\]/g, '-').trim().slice(0, 200) || 'Sin torneo';
  // Buscar carpeta existente
  const res = await drive.files.list({
    q: `name = ${JSON.stringify(safeName)} and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  // Crear carpeta
  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return created.data.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { image, filename, tournamentName } = req.body || {};
  if (!image || !filename) {
    return res.status(400).json({ error: 'image y filename son requeridos' });
  }

  // Validar que filename no sea peligroso
  const safeName = filename.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ ()_\-.,]/g, '').slice(0, 220);
  if (!safeName) return res.status(400).json({ error: 'filename inválido' });

  const finalFilename = safeName.endsWith('.png') ? safeName : safeName + '.png';

  try {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Obtener o crear subcarpeta del torneo
    const folderName = (tournamentName || '').trim() || 'Sin torneo';
    const folderId = await findOrCreateFolder(drive, folderName, DRIVE_PARENT_FOLDER_ID);

    // Convertir base64 → stream
    const buffer = Buffer.from(image, 'base64');
    const stream = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: {
        name: finalFilename,
        parents: [folderId],
        mimeType: 'image/png',
      },
      media: {
        mimeType: 'image/png',
        body: stream,
      },
      fields: 'id, webViewLink, name',
    });

    return res.status(200).json({
      ok: true,
      name: uploaded.data.name,
      webViewLink: uploaded.data.webViewLink,
      fileId: uploaded.data.id,
    });
  } catch (err) {
    console.error('[upload-screenshot]', err);
    return res.status(500).json({ error: err.message || 'Error al subir a Drive' });
  }
}
