import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { getUserPreferences, saveUserPreferences } from '@/lib/user-preferences'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DatePicker } from '@/components/date-picker'

const languages = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
] as const

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters.')
    .max(60, 'Name must not be longer than 60 characters.'),
  dob: z.date().optional(),
  language: z.string().min(1, 'Please select a language.'),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

export function AccountForm() {
  const user = useAuthStore((state) => state.auth.user)
  const setSession = useAuthStore((state) => state.auth.setSession)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      dob: undefined,
      language: 'en',
    },
  })

  useEffect(() => {
    if (!user?.id) return

    const saved = getUserPreferences(user.id)
    form.reset({
      name:
        saved.account.name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        '',
      dob: saved.account.dob ? new Date(saved.account.dob) : undefined,
      language: saved.account.language,
    })
  }, [form, user])

  async function onSubmit(data: AccountFormValues) {
    if (!user?.id) return

    setIsSaving(true)

    try {
      const fullName = data.name.trim()
      const dateOfBirth = data.dob ? data.dob.toISOString() : null

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
        } as never)
        .eq('id', user.id)

      if (profileError) throw profileError

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: fullName,
          preferred_language: data.language,
          date_of_birth: dateOfBirth,
        },
      })

      if (authError) throw authError

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) setSession(session)

      saveUserPreferences(user.id, {
        account: {
          name: fullName,
          dob: dateOfBirth,
          language: data.language,
        },
      })

      toast.success('Account preferences updated.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update account.'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder='Your name' {...field} />
              </FormControl>
              <FormDescription>
                This is the name that will be displayed on your profile and in
                emails.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='dob'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>Date of birth</FormLabel>
              <DatePicker
                selected={field.value}
                onSelect={field.onChange}
                placeholder='Pick a date'
              />
              <FormDescription>
                Optional. We use this only for your personal profile context.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='language'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>Language</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant='outline'
                      role='combobox'
                      className={cn(
                        'w-[200px] justify-between',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value
                        ? languages.find(
                            (language) => language.value === field.value
                          )?.label
                        : 'Select language'}
                      <CaretSortIcon className='ms-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className='w-[200px] p-0'>
                  <Command>
                    <CommandInput placeholder='Search language...' />
                    <CommandEmpty>No language found.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {languages.map((language) => (
                          <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                              form.setValue('language', language.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                'size-4',
                                language.value === field.value
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                This is the language that will be used in the dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Update account'}
        </Button>
      </form>
    </Form>
  )
}
