// 계정 정보 섹션 맨 위에 들어가는 프로필 사진 등록 위젯입니다.
// - 등록된 사진이 있으면 동그라미 안에 사진이, 없으면 이름 첫 글자가 표시됩니다.
// - 동그라미 오른쪽 아래 연필 버튼을 누르면 파일을 고를 수 있고,
//   고른 사진은 3.5:4.5(413x531) 비율에 맞춰 자른 뒤에야 실제로 쓰입니다.
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCroppedImageBlob } from '@/lib/crop-image'

// 국내 증명사진 표준 규격: 3.5cm x 4.5cm (권장 픽셀 413 x 531)
const PROFILE_IMAGE_WIDTH = 413
const PROFILE_IMAGE_HEIGHT = 531
const PROFILE_IMAGE_ASPECT = PROFILE_IMAGE_WIDTH / PROFILE_IMAGE_HEIGHT

interface ProfileAvatarUploadProps {
  // 사진이 없을 때 동그라미 안에 보여줄 이름 (첫 글자만 사용합니다)
  name: string
  // 기존에 등록된 사진 url, 혹은 방금 자른 사진의 미리보기 url. 없으면 null
  imageUrl: string | null
  // 실제 업로드가 진행 중인 동안 스피너를 겹쳐 보여줄 때 true로 둡니다
  isUploading?: boolean
  // 사용자가 자르기까지 마친 이미지를 넘겨받습니다. 실제 업로드는 호출부에서 처리합니다.
  onCropped: (blob: Blob) => void
}

export function ProfileAvatarUpload({
  name,
  imageUrl,
  isUploading = false,
  onCropped,
}: ProfileAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  )

  // 크롭용으로 만들었던 blob: URL은 다이얼로그가 닫힐 때 꼭 해제해줍니다.
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // 같은 파일을 다시 선택해도 onChange가 또 발생하도록 값을 비워둡니다.
    event.target.value = ''
    if (!file) return
    setSourceUrl(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const closeCropDialog = () => {
    setSourceUrl(null)
  }

  const confirmCrop = async () => {
    if (!sourceUrl || !croppedAreaPixels) return
    const blob = await getCroppedImageBlob(
      sourceUrl,
      croppedAreaPixels,
      PROFILE_IMAGE_WIDTH,
      PROFILE_IMAGE_HEIGHT,
    )
    onCropped(blob)
    closeCropDialog()
  }

  const initial = name.trim().charAt(0) || '?'

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="프로필 사진"
            className="h-20 w-20 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary ring-1 ring-border">
            {initial}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          </div>
        )}
        <button
          type="button"
          onClick={openFilePicker}
          disabled={isUploading}
          className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          aria-label="프로필 사진 등록"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        3.5 x 4.5cm 증명사진 규격으로 자동으로 잘리고 압축됩니다.
      </p>

      <Dialog
        open={sourceUrl !== null}
        onOpenChange={(open) => {
          if (!open) closeCropDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 사진 등록</DialogTitle>
            <DialogDescription>
              3.5 x 4.5 비율에 맞춰 사용할 부분을 선택해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {sourceUrl && (
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={PROFILE_IMAGE_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPixels) =>
                  setCroppedAreaPixels(areaPixels)
                }
              />
            )}
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
            aria-label="확대/축소"
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="button" onClick={confirmCrop}>
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
