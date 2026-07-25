import ffmpeg from 'fluent-ffmpeg'
import api from './api/api.js'

try {
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
  if (ffmpegInstaller?.path) ffmpeg.setFfmpegPath(ffmpegInstaller.path)
} catch {
  // usa ffmpeg do PATH do sistema, se disponível
}

export default api
