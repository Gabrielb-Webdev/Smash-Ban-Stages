// Actualizar latestVersion cuando haya una nueva release
export default function handler(req, res) {
  res.status(200).json({
    latestVersion: '1.0.8',
    downloadUrl: 'https://github.com/Gabrielb-Webdev/Smash-Ban-Stages/releases/latest',
  });
}
