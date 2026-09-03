// 헤더 우측 상단의 "로그인" 버튼을 누르면 뜨는 로그인 폼입니다.
// (백엔드: apps/auth/router.py의 POST /auth/sign-in)
import { useState, type FormEvent } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { SignUpDialog } from '@/components/auth/sign-up-dialog'

export function LoginDialog() {
  const { signIn } = useAuth()
  const [open, setOpen] = useState(false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setLoginId('')
    setPassword('')
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signIn(loginId, password)
      handleOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : '로그인 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button size="sm" />}>
          <LogIn />
          로그인
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>로그인</DialogTitle>
            <DialogDescription>
              코스모진 ERP 계정으로 로그인해 주세요.
            </DialogDescription>
          </DialogHeader>

          {/* 실제로 본인 계정에 로그인하는 폼이라, 아이디/비밀번호 자동완성을
              굳이 막지 않고 브라우저 기본 동작(username/current-password)을 그대로 씁니다. */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signin_login_id">아이디</Label>
              <Input
                id="signin_login_id"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signin_password">비밀번호</Label>
              <Input
                id="signin_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* 아직 계정이 없는 임직원은 이 버튼으로 신규 계정 신청 폼을 열 수
                있습니다. (사원 추가는 관리자만 가능하지만, 이 신청은 누구나
                할 수 있고 관리자 승인을 거쳐야 완전히 등록됩니다) */}
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-start">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <LogIn />
                )}
                로그인
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOpen(false)
                  setIsSignUpOpen(true)
                }}
              >
                신규 계정 신청
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SignUpDialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen} />
    </>
  )
}
