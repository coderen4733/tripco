// 조직 관리 페이지의 목록 카드 1개(부서/팀/직위/직책/직무/고용형태 공용)입니다.
// 6종 모두 표 구조(드래그 앤 드롭 순서변경 + 활성/비활성 토글 + 추가/수정/
// 삭제)가 완전히 똑같기 때문에, 컬럼 구성과 추가/수정 폼만 바깥에서
// 넘겨받는 형태의 범용 컴포넌트로 만들었습니다.
import { useState, type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRightLeft, GripVertical, Loader2, Pencil, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { isReassignRequiredDetail, type OrgOrderedItem } from '@/types/organization'

export interface OrgColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  className?: string
}

interface OrgListCardProps<T extends OrgOrderedItem> {
  title: string
  addLabel: string
  emptyMessage: string
  items: T[]
  isLoading: boolean
  canManage: boolean
  columns: OrgColumn<T>[]
  // 재배치 선택 목록에 표시할 이름 (예: "SMD 세일즈마케팅부")
  getLabel: (item: T) => string
  // 목록을 낙관적으로 다시 그리기 위해 부모의 items state를 그대로 넘겨받습니다.
  setItems: (updater: (prev: T[]) => T[]) => void
  onReorder: (
    id: string,
    prevId: string | null,
    nextId: string | null,
  ) => Promise<unknown>
  onToggleStatus: (id: string, nextStatus: boolean) => Promise<unknown>
  // reassignTo를 넘기면, 이 항목을 참조 중이던 임직원(팀 포함)을 그
  // 대상으로 옮긴 뒤 삭제합니다. (백엔드가 처리)
  onDelete: (id: string, reassignTo?: string) => Promise<unknown>
  // 실패했을 때 서버 기준으로 다시 맞추기 위한 전체 새로고침
  onReload: () => void
  // 추가/수정 다이얼로그 안에 들어갈 폼. item이 null이면 "추가" 모드입니다.
  renderForm: (props: { item: T | null; onDone: () => void }) => ReactNode
}

export function OrgListCard<T extends OrgOrderedItem>({
  title,
  addLabel,
  emptyMessage,
  items,
  isLoading,
  canManage,
  columns,
  getLabel,
  setItems,
  onReorder,
  onToggleStatus,
  onDelete,
  onReload,
  renderForm,
}: OrgListCardProps<T>) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  // 삭제 확인 단계: X를 누르면 바로 지우지 않고, 이 _id를 담아 "정말요?"부터 보여줍니다.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // 삭제하려는 항목을 아직 참조 중인 데이터가 있어, 재배치가 필요한 경우
  // 이 상태가 채워지며 재배치 다이얼로그가 뜹니다.
  const [reassignState, setReassignState] = useState<{
    id: string
    affectedCount: number
  } | null>(null)
  const [reassignTarget, setReassignTarget] = useState<string | null>(null)
  const [reassignError, setReassignError] = useState<string | null>(null)
  const [isReassigning, setIsReassigning] = useState(false)

  // 마우스를 살짝 눌렀다 떼기만 한 클릭은 드래그로 인식하지 않도록
  // 최소 이동거리(8px)를 두었습니다. (그래야 행 클릭/버튼 클릭이 정상 동작)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item._id === active.id)
    const newIndex = items.findIndex((item) => item._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // 1. 화면에는 먼저 옮겨진 순서를 그대로 반영합니다(낙관적 업데이트).
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(() => reordered)

    // 2. 옮겨진 위치의 바로 앞/뒤 항목 _id를 서버로 보내 order를 계산시킵니다.
    const movedIndex = reordered.findIndex((item) => item._id === active.id)
    const prevId = reordered[movedIndex - 1]?._id ?? null
    const nextId = reordered[movedIndex + 1]?._id ?? null
    onReorder(String(active.id), prevId, nextId).catch(() => onReload())
  }

  const handleToggleStatus = (id: string, nextStatus: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, status: nextStatus } : item,
      ),
    )
    onToggleStatus(id, nextStatus).catch(() => onReload())
  }

  // 삭제는 먼저 재배치가 필요한지 서버에 물어본 뒤(reassignTo 없이 시도)
  // 결과를 봐서 처리합니다. 즉시 지우지 않는 이유는, 참조 중인 데이터가
  // 있으면 재배치 다이얼로그부터 띄워야 하기 때문입니다.
  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null)
    try {
      await onDelete(id)
      setItems((prev) => prev.filter((item) => item._id !== id))
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        isReassignRequiredDetail(err.detail)
      ) {
        // 아직 이 항목을 참조 중인 데이터가 있다는 뜻 -> 재배치 다이얼로그로 전환
        setReassignState({ id, affectedCount: err.detail.affected_count })
        setReassignTarget(null)
        setReassignError(null)
        return
      }
      // 그 외의 실패(권한 없음, 네트워크 오류 등)는 서버 기준으로 되돌립니다.
      onReload()
    }
  }

  const handleReassignAndDelete = async () => {
    if (!reassignState || !reassignTarget) return
    setIsReassigning(true)
    setReassignError(null)
    try {
      await onDelete(reassignState.id, reassignTarget)
      setItems((prev) => prev.filter((item) => item._id !== reassignState.id))
      setReassignState(null)
      // 재배치된 대상(임직원/팀 등)도 최신 상태가 되도록 전체를 새로고침합니다.
      onReload()
    } catch (err) {
      setReassignError(
        err instanceof ApiError
          ? err.message
          : '재배치 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsReassigning(false)
    }
  }

  // 재배치 대상 후보: 삭제하려는 항목 자기 자신은 제외합니다.
  const reassignOptions = reassignState
    ? items.filter((item) => item._id !== reassignState.id)
    : []

  return (
    <Card className="gap-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus />
              {addLabel}
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="px-4 pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          // DndContext는 접근성용 안내 문구를 담은 숨김 <div>를 자기
          // children의 형제로 렌더링합니다. <tbody> 안에 두면 <div>가
          // <tr>이 아닌 자식으로 끼어들어 유효하지 않은 HTML(hydration
          // 경고)이 되므로, <Table> 전체를 감싸는 위치로 뺐습니다.
          // (실제로 순서를 바꾸는 <SortableContext>만 <TableBody> 안에 둡니다)
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {/* 드래그 핸들 자리 */}
                  <TableHead className="w-8" />
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn('text-center', col.className)}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">활성</TableHead>
                  {canManage && (
                    <TableHead className="text-center">관리</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + (canManage ? 3 : 2)}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext
                    items={items.map((item) => item._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item) => (
                      <SortableRow
                        key={item._id}
                        item={item}
                        columns={columns}
                        canManage={canManage}
                        isConfirmingDelete={confirmDeleteId === item._id}
                        onToggleStatus={(next) =>
                          handleToggleStatus(item._id, next)
                        }
                        onEdit={() => setEditingItem(item)}
                        onAskDelete={() => setConfirmDeleteId(item._id)}
                        onCancelDelete={() => setConfirmDeleteId(null)}
                        onConfirmDelete={() => handleDelete(item._id)}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
        )}
      </div>

      {/* 추가 다이얼로그 */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{addLabel}</DialogTitle>
            <DialogDescription>
              새 항목을 추가하면 목록 맨 끝에 등록됩니다.
            </DialogDescription>
          </DialogHeader>
          {isAddOpen &&
            renderForm({
              item: null,
              onDone: () => {
                setIsAddOpen(false)
                onReload()
              },
            })}
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title} 수정</DialogTitle>
            <DialogDescription>내용을 수정하고 저장하세요.</DialogDescription>
          </DialogHeader>
          {editingItem !== null &&
            renderForm({
              item: editingItem,
              onDone: () => {
                setEditingItem(null)
                onReload()
              },
            })}
        </DialogContent>
      </Dialog>

      {/* 재배치 다이얼로그: 삭제하려는 항목을 아직 참조 중인 데이터가
          있을 때만 뜹니다. 옮길 항목을 고르지 않으면 삭제를 진행할 수
          없습니다. */}
      <Dialog
        open={reassignState !== null}
        onOpenChange={(open) => !open && setReassignState(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>삭제 전 재배치가 필요합니다</DialogTitle>
            <DialogDescription>
              이 항목을 사용 중인 데이터가 {reassignState?.affectedCount}건
              있습니다. 삭제하면 그 값이 사라지므로, 먼저 어떤 항목으로 옮길지
              선택해 주세요. 선택한 항목으로 옮긴 뒤 바로 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reassign-target">옮길 항목</Label>
              <Select
                items={Object.fromEntries(
                  reassignOptions.map((item) => [item._id, getLabel(item)]),
                )}
                // value를 처음부터 항상 문자열로 고정해서(선택 전엔 빈
                // 문자열), Base UI Select가 "제어→비제어 전환" 경고를
                // 띄우지 않게 합니다.
                value={reassignTarget ?? ''}
                onValueChange={(v) => setReassignTarget(v as string)}
              >
                <SelectTrigger id="reassign-target" className="w-full">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {reassignOptions.map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {getLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reassignError && (
              <p className="text-xs text-destructive">{reassignError}</p>
            )}
            <Button
              type="button"
              disabled={!reassignTarget || isReassigning}
              onClick={handleReassignAndDelete}
              className="w-full"
            >
              {isReassigning ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ArrowRightLeft />
              )}
              이동 후 삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// 표 한 행. 드래그 핸들 + 컬럼들 + 활성 토글 + 수정/삭제 버튼으로 구성됩니다.
function SortableRow<T extends OrgOrderedItem>({
  item,
  columns,
  canManage,
  isConfirmingDelete,
  onToggleStatus,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  item: T
  columns: OrgColumn<T>[]
  canManage: boolean
  isConfirmingDelete: boolean
  onToggleStatus: (next: boolean) => void
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._id })

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        isDragging && 'relative z-10 bg-background shadow-md',
        // 비활성화된 항목은 회색으로 흐리게 표시해 눈에 덜 띄게 합니다.
        !item.status && 'opacity-45',
      )}
    >
      <TableCell className="w-8 px-2">
        {canManage && (
          <button
            type="button"
            className="flex cursor-grab items-center justify-center text-muted-foreground touch-none active:cursor-grabbing"
            aria-label="순서 변경"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      {columns.map((col) => (
        <TableCell key={col.key} className={cn('text-center', col.className)}>
          {col.render(item)}
        </TableCell>
      ))}
      <TableCell className="text-center">
        <Switch
          checked={item.status}
          onCheckedChange={onToggleStatus}
          disabled={!canManage}
          aria-label="활성 여부"
        />
      </TableCell>
      {canManage && (
        <TableCell className="text-center">
          {isConfirmingDelete ? (
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <span className="text-xs text-muted-foreground">삭제할까요?</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onConfirmDelete}
              >
                예
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onCancelDelete}
              >
                아니오
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                aria-label="수정"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onAskDelete}
                aria-label="삭제"
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}
