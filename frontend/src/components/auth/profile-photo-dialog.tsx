// 헤더의 "프로필 사진 설정" 메뉴를 눌렀을 때 뜨는 사진 변경 전용 다이얼로그입니다.
// 사원 추가/상세 정보 폼의 ProfileAvatarUpload와 같은 3.5:4.5 크롭 로직을 쓰지만,
// 여기서는 화면에 동그라미 아바타를 따로 두지 않고, open이 true가 되는 즉시
// 파일 선택창부터 엽니다.
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
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
import {
  PROFILE_IMAGE_ASPECT,
  PROFILE_IMAGE_HEIGHT,
  PROFILE_IMAGE_WIDTH,
} from '@/config/profile-image'

interface ProfilePhotoDialogProps {
  // true가 되는 순간 파일 선택창을 자동으로 엽니다.
  open: boolean
  onOpenChange: (open: boolean) => void
  // 자르기가 끝난 사진(blob)을 넘겨받습니다. 실제 업로드는 호출부에서 처리합니다.
  onCropped: (blob: Blob) => void
}

export function ProfilePhotoDialog({
  open,
  onOpenChange,
  onCropped,
}: ProfilePhotoDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  )

  // "프로필 사진 설정" 메뉴를 눌러 open이 true가 되면 곧바로 파일 선택창을 띄웁니다.
  useEffect(() => {
    if (open && !sourceUrl) {
      fileInputRef.current?.click()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 파일 선택창을 취소(아무 파일도 고르지 않고 닫음)하면 이 이벤트가 발생합니다.
  // 이 경우 메뉴를 클릭하기 이전 상태로 그대로 되돌립니다.
  useEffect(() => {
    const input = fileInputRef.current
    if (!input) return
    const handleCancel = () => {
      if (!sourceUrl) onOpenChange(false)
    }
    input.addEventListener('cancel', handleCancel)
    return () => input.removeEventListener('cancel', handleCancel)
  }, [sourceUrl, onOpenChange])

  // 크롭용으로 만들었던 blob: URL은 다이얼로그가 닫힐 때 꼭 해제해줍니다.
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const closeAll = () => {
    setSourceUrl(null)
    onOpenChange(false)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // 같은 파일을 다시 선택해도 onChange가 또 발생하도록 값을 비워둡니다.
    event.target.value = ''
    if (!file) {
      onOpenChange(false)
      return
    }
    setSourceUrl(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
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
    closeAll()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog
        open={sourceUrl !== null}
        onOpenChange={(next) => {
          if (!next) closeAll()
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
    </>
  )
}
