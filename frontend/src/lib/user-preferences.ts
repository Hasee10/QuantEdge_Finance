export const SETTINGS_UPDATED_EVENT = 'qe-settings-updated'

export type AccountSettings = {
  name: string
  dob: string | null
  language: string
}

export type NotificationSettings = {
  type: 'all' | 'mentions' | 'none'
  mobile: boolean
  communication_emails: boolean
  social_emails: boolean
  marketing_emails: boolean
  security_emails: boolean
}

export type DisplaySettings = {
  items: string[]
}

type UserPreferences = {
  account: AccountSettings
  notifications: NotificationSettings
  display: DisplaySettings
}

const STORAGE_PREFIX = 'qe-user-preferences'

const DEFAULT_PREFERENCES: UserPreferences = {
  account: {
    name: '',
    dob: null,
    language: 'en',
  },
  notifications: {
    type: 'mentions',
    mobile: false,
    communication_emails: false,
    social_emails: true,
    marketing_emails: false,
    security_emails: true,
  },
  display: {
    items: [
      '/news',
      '/bookmarks',
      '/merger-analysis',
      '/lbo-model',
      '/dcf',
      '/history',
      '/firm-library',
      '/tasks',
      '/users',
      '/chats',
      '/settings/notifications',
      '/settings',
      '/help-center',
    ],
  },
}

function getStorageKey(userId: string | null | undefined) {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

export function getUserPreferences(userId: string | null | undefined): UserPreferences {
  if (!canUseStorage()) return DEFAULT_PREFERENCES

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(userId))
    if (!rawValue) return DEFAULT_PREFERENCES

    const parsed = JSON.parse(rawValue) as Partial<UserPreferences>
    return {
      account: {
        ...DEFAULT_PREFERENCES.account,
        ...parsed.account,
      },
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...parsed.notifications,
      },
      display: {
        ...DEFAULT_PREFERENCES.display,
        ...parsed.display,
        items:
          parsed.display?.items?.length
            ? parsed.display.items
            : DEFAULT_PREFERENCES.display.items,
      },
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveUserPreferences(
  userId: string | null | undefined,
  updates: Partial<UserPreferences>
) {
  if (!canUseStorage()) return DEFAULT_PREFERENCES

  const nextPreferences = {
    ...getUserPreferences(userId),
    ...updates,
    account: {
      ...getUserPreferences(userId).account,
      ...updates.account,
    },
    notifications: {
      ...getUserPreferences(userId).notifications,
      ...updates.notifications,
    },
    display: {
      ...getUserPreferences(userId).display,
      ...updates.display,
    },
  }

  window.localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(nextPreferences)
  )
  window.dispatchEvent(
    new CustomEvent(SETTINGS_UPDATED_EVENT, {
      detail: {
        userId: userId ?? null,
        preferences: nextPreferences,
      },
    })
  )

  return nextPreferences
}

export function getDefaultUserPreferences() {
  return DEFAULT_PREFERENCES
}
