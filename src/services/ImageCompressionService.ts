export class ImageCompressionService {
  async compress(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('请上传图片文件。')
    const bitmap = await createImageBitmap(file)
    const maxSize = 900
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.84)
  }
}

export const imageCompressionService = new ImageCompressionService()
