import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile, UserRole } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const profileFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  role: z.enum(['analyst', 'associate', 'vp', 'director', 'md']),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'analyst', label: 'Analyst' },
  { value: 'associate', label: 'Associate' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'md', label: 'Managing Director' },
]

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Failed to read the selected file.'))
    reader.readAsDataURL(file)
  })
}

export function ProfileForm() {
  const user = useAuthStore((state) => state.auth.user)
  const setSession = useAuthStore((state) => state.auth.setSession)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      company: '',
      role: 'analyst',
    },
  })

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const nextProfile = data as Profile | null

      if (nextProfile) {
        setProfile(nextProfile)
        setAvatarUrl(nextProfile.avatar_url ?? null)
        form.reset({
          full_name: nextProfile.full_name,
          company: nextProfile.company ?? '',
          role: nextProfile.role ?? 'analyst',
        })
      }
    }

    void loadProfile()
  }, [form, user])

  async function syncAuthMetadata(values: {
    full_name?: string
    company?: string | null
    role?: UserRole
    avatar_url?: string | null
  }) {
    const { error } = await supabase.auth.updateUser({
      data: {
        ...(user?.user_metadata ?? {}),
        ...values,
      },
    })

    if (error) throw error

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) setSession(session)
  }

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return
    setIsLoading(true)

    try {
      const payload = {
        full_name: values.full_name.trim(),
        company: values.company?.trim() || null,
        role: values.role,
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload as never)
        .eq('id', user.id)

      if (error) throw error

      await syncAuthMetadata(payload)
      setProfile((current) =>
        current
          ? {
              ...current,
              ...payload,
            }
          : current
      )
      toast.success('Profile updated successfully.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }

    setAvatarUploading(true)

    try {
      const fileExtension = file.name.split('.').pop() || 'png'
      const filePath = `${user.id}/avatar.${fileExtension}`
      let nextAvatarUrl: string | null = null

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        nextAvatarUrl = urlData.publicUrl
      } else {
        nextAvatarUrl = await readFileAsDataUrl(file)
        toast.warning(
          'Storage upload is not configured yet, so the avatar was saved locally to your profile instead.'
        )
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: nextAvatarUrl } as never)
        .eq('id', user.id)

      if (profileError) throw profileError

      await syncAuthMetadata({ avatar_url: nextAvatarUrl })
      setAvatarUrl(nextAvatarUrl)
      setProfile((current) =>
        current
          ? {
              ...current,
              avatar_url: nextAvatarUrl,
            }
          : current
      )
      toast.success('Avatar updated.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Avatar upload failed.'
      toast.error(message)
    } finally {
      e.target.value = ''
      setAvatarUploading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <div className='relative h-16 w-16 overflow-hidden rounded-full border bg-muted'>
          {avatarUrl ? (
            <img src={avatarUrl} alt='Avatar' className='h-full w-full object-cover' />
          ) : (
            <div className='flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground'>
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
          >
            {avatarUploading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Upload className='mr-2 h-4 w-4' />
            )}
            {avatarUploading ? 'Uploading...' : 'Upload Avatar'}
          </Button>
          <p className='mt-1 text-xs text-muted-foreground'>JPG, PNG, GIF up to 2MB</p>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      <div className='space-y-1'>
        <label className='text-sm font-medium'>Email</label>
        <Input value={user?.email ?? ''} readOnly className='bg-muted text-muted-foreground' />
        <p className='text-xs text-muted-foreground'>
          To change your email,{' '}
          <a
            href='mailto:support@quantedge.finance?subject=QuantEdge%20email%20change%20request'
            className='underline underline-offset-4'
          >
            contact support
          </a>
          .
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='full_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder='Jane Smith' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='company'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder='Goldman Sachs' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='role'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select your role' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLES.map((roleOption) => (
                      <SelectItem key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' disabled={isLoading}>
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-2 h-4 w-4' />
            )}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  )
}
