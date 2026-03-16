// Actualizar latestVersion cuando haya una nueva release
export default function handler(req, res) {
  res.status(200).json({
    latestVersion: '1.0.10',
    downloadUrl: 'https://github.com/Gabrielb-Webdev/Smash-Ban-Stages/releases/download/v1.0.10/afk-smash.apk',
  });
}
