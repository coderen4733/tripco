// react-easy-crop이 알려주는 "픽셀 단위 크롭 영역"을 실제로 잘라내서
// 업로드용 이미지 Blob으로 만들어주는 헬퍼입니다.

export interface PixelCropArea {
  x: number
  y: number
  width: number
  height: number
}

// img 태그가 아니라 순수 URL(blob: URL 등)로부터 <img> 엘리먼트를 만들어 로드합니다.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (err) => reject(err))
    image.src = src
  })
}

// imageSrc(원본 미리보기 이미지)에서 crop 영역만 잘라내
// outputWidth x outputHeight 크기의 JPEG Blob으로 만들어 돌려줍니다.
export async function getCroppedImageBlob(
  imageSrc: string,
  crop: PixelCropArea,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('이미지를 자르는 데 필요한 캔버스를 생성할 수 없습니다.')
  }

  // crop 영역(원본 이미지 좌표계)을 그대로 출력 크기에 맞춰 그려 넣습니다.
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('이미지를 변환하는 데 실패했습니다.'))
      },
      'image/jpeg',
      0.9,
    )
  })
}
