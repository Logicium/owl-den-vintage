import { reactive } from 'vue'

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  /** Milliseconds until auto-dismiss. 0 disables auto-dismiss. */
  duration: number
}

interface ToastState { items: Toast[] }

const state = reactive<ToastState>({ items: [] })
let nextId = 1

function push(message: string, kind: ToastKind = 'info', duration = 3500) {
  const id = nextId++
  state.items.push({ id, kind, message, duration })
  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration)
  }
  return id
}

function dismiss(id: number) {
  const i = state.items.findIndex(t => t.id === id)
  if (i !== -1) state.items.splice(i, 1)
}

export function useToast() {
  return {
    items: state.items,
    dismiss,
    info:    (msg: string, duration?: number) => push(msg, 'info', duration),
    success: (msg: string, duration?: number) => push(msg, 'success', duration),
    error:   (msg: string, duration?: number) => push(msg, 'error', duration ?? 6000),
  }
}
