// Actualizar latestVersion cuando haya una nueva release
export default function handler(req, res) {
  res.status(200).json({
    latestVersion: '1.1.0',
    downloadUrl: 'https://github.com/Gabrielb-Webdev/Smash-Ban-Stages/releases/download/v1.1.0/afk-smash.apk',
  });
}
