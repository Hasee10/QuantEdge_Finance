export const IDLE_SESSION_EXPIRED_KEY = 'qe-idle-session-expired'

export function setIdleSessionExpired(value: boolean) {
  if (typeof window === 'undefined') return

  if (value) {
    window.sessionStorage.setItem(IDLE_SESSION_EXPIRED_KEY, 'true')
    return
  }

  window.sessionStorage.removeItem(IDLE_SESSION_EXPIRED_KEY)
}

export function getIdleSessionExpired() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(IDLE_SESSION_EXPIRED_KEY) === 'true'
}
