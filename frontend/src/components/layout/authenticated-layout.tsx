import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getIdleSessionExpired, setIdleSessionExpired } from '@/lib/auth/session-flags'
import { getCookie } from '@/lib/cookies'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { useAuthStore } from '@/stores/auth-store'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore((state) => state.auth.session)

  useEffect(() => {
    async function guardSignedOutAccess() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (currentSession) return
      if (getIdleSessionExpired()) return

      await navigate({
        to: '/sign-in',
        search: { redirect: location.href },
        replace: true,
      })
    }

    void guardSignedOutAccess()

    function handlePageShow() {
      void guardSignedOutAccess()
    }

    function handlePopState() {
      void guardSignedOutAccess()
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [location.href, navigate, session])

  useEffect(() => {
    if (!session) return

    let timeoutId: number | null = null

    const resetIdleTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId)

      timeoutId = window.setTimeout(async () => {
        setIdleSessionExpired(true)
        await supabase.auth.signOut()
        useAuthStore.getState().auth.reset()
      }, IDLE_TIMEOUT_MS)
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'focus',
    ]

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true })
    })

    resetIdleTimer()

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer)
      })
    }
  }, [session])

  useEffect(() => {
    if (!getIdleSessionExpired()) return

    async function requireFreshSignIn() {
      setIdleSessionExpired(false)
      toast.error('Your session expired due to inactivity. Please sign in again.')
      await navigate({
        to: '/sign-in',
        search: { redirect: location.href },
        replace: true,
      })
    }

    const promptReauth = () => {
      window.removeEventListener('pointerdown', promptReauth, true)
      window.removeEventListener('keydown', promptReauth, true)
      void requireFreshSignIn()
    }

    window.addEventListener('pointerdown', promptReauth, true)
    window.addEventListener('keydown', promptReauth, true)

    return () => {
      window.removeEventListener('pointerdown', promptReauth, true)
      window.removeEventListener('keydown', promptReauth, true)
    }
  }, [location.href, navigate, session])

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              // Set content container, so we can use container queries
              '@container/content',

              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              'has-data-[layout=fixed]:h-svh',

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - spacing (total margins) to prevent overflow
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            {children ?? <Outlet />}
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
