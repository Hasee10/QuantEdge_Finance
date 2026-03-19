import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getUserPreferences, saveUserPreferences } from '@/lib/user-preferences'
import { useAuthStore } from '@/stores/auth-store'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one item.',
  }),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

export function DisplayForm() {
  const userId = useAuthStore((state) => state.auth.user?.id)
  const [isSaving, setIsSaving] = useState(false)

  const items = useMemo(
    () =>
      sidebarData.navGroups.flatMap((group) =>
        group.items
          .filter((item) => 'url' in item && typeof item.url === 'string')
          .map((item) => ({
            id: String(item.url),
            label: item.title,
          }))
      ),
    []
  )

  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      items: items.map((item) => item.id),
    },
  })

  useEffect(() => {
    if (!userId) return

    const saved = getUserPreferences(userId)
    form.reset({
      items: saved.display.items.length
        ? saved.display.items
        : items.map((item) => item.id),
    })
  }, [form, items, userId])

  function onSubmit(data: DisplayFormValues) {
    if (!userId) return

    setIsSaving(true)
    saveUserPreferences(userId, {
      display: {
        items: data.items,
      },
    })
    setIsSaving(false)
    toast.success('Display preferences updated.')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>Sidebar</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => (
                    <FormItem
                      key={item.id}
                      className='flex flex-row items-start'
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, item.id])
                              : field.onChange(
                                  field.value?.filter(
                                    (value) => value !== item.id
                                  )
                                )
                          }}
                        />
                      </FormControl>
                      <FormLabel className='font-normal'>
                        {item.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Update display'}
        </Button>
      </form>
    </Form>
  )
}
