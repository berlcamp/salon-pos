// components/AddItemTypeModal.tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAppDispatch } from '@/lib/redux/hook'
import { addItem, updateList } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'

import { Branch, User } from '@/types'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

// Always update this on other pages
type ItemType = User
const table = 'users'
const title = 'Staff'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  editData?: ItemType | null // Optional prop for editing existing item
}

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required'),
  position: z.string().min(1, 'Position is required'),
  type: z.string().min(1, 'Account Type is required'),
  branch_id: z.coerce.number().min(1, 'Branch is required') // ✅ coercion fixes string->number from inputs
})

type FormType = z.infer<typeof FormSchema>

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  //
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])

  const dispatch = useAppDispatch()

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: editData ? editData.name : '',
      email: editData ? editData.email : '',
      position: editData ? editData.position : '',
      type: editData ? editData.type : '',
      branch_id: editData ? editData.branch_id : 0
    }
  })

  // Submit handler
  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return // 🚫 Prevent double-submit
    setIsSubmitting(true)

    try {
      // 🔹 Step 1: Get or create auth user
      const { data: authUserId, error: authError } = await supabase.rpc(
        'get_user_id_by_email',
        { p_email: data.email }
      )

      if (authError)
        throw new Error(`Error fetching auth user: ${authError.message}`)

      let user_id = authUserId

      // 🔹 Step 2: If no auth user found, create one
      if (!user_id) {
        const { data: newAuth, error: createAuthError } =
          await supabase.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            password: process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || 'Password123!' // ✅ Default password (configurable)
          })

        if (createAuthError)
          throw new Error(
            `Error creating auth user: ${createAuthError.message}`
          )

        user_id = newAuth.user.id
      }

      // 🔹 Step 3: Prepare user data for your app table
      const newData = {
        name: data.name.trim(),
        email: data.email,
        position: data.position,
        user_id,
        type: data.type,
        branch_id: data.branch_id,
        org_id: process.env.NEXT_PUBLIC_ORG_ID
      }

      // 🔹 Step 4: Insert or Update logic
      if (editData?.id) {
        const { error } = await supabase
          .from(table)
          .update(newData)
          .eq('id', editData.id)

        if (error) throw new Error(error.message)

        dispatch(updateList({ ...newData, id: editData.id }))
        onClose()
      } else {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([newData])
          .select()
          .single()

        if (error) {
          if (error.code === '23505') toast.error('Email already exists')
          throw new Error(error.message)
        }

        dispatch(addItem(inserted))
        onClose()
      }

      toast.success('Successfully saved!')
    } catch (err) {
      console.error('Submission error:', err)
      toast.error(err instanceof Error ? err.message : 'Error saving user')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase
        .from('branches')
        .select()
        .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID)
      if (data) setBranches(data)
    }
    fetchBranches()
  }, [])

  useEffect(() => {
    form.reset({
      name: editData?.name || '',
      email: editData?.email || '',
      position: editData?.position || '',
      type: editData?.type || '',
      branch_id: editData?.branch_id || 0
    })
  }, [form, editData, isOpen])

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-50 focus:outline-none"
      onClose={() => {}}
    >
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-600 opacity-80"
        aria-hidden="true"
      />

      {/* Centered panel container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPanel transition className="app__modal_dialog_panel_sm">
          {/* Sticky Header */}
          <div className="app__modal_dialog_title_container">
            <DialogTitle as="h3" className="text-base font-medium">
              {editData ? 'Edit' : 'Add'} {title}
            </DialogTitle>
          </div>
          {/* Scrollable Form Content */}
          <div className="app__modal_dialog_content">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                  <div>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__formlabel_standard">
                            Staff Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="app__input_standard"
                              placeholder="Staff Name"
                              type="text"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__formlabel_standard">
                            Google Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="app__input_standard"
                              placeholder="Email"
                              type="text"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Google email is use to login
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__formlabel_standard">
                            Position
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="app__input_standard"
                              placeholder="Ex. Nurse"
                              type="text"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Account Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="branch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <Select
                            // Always pass a string to keep it controlled
                            onValueChange={(value) =>
                              field.onChange(Number(value))
                            }
                            value={field.value ? String(field.value) : ''}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="app__modal_dialog_footer">
                  <Button type="button" onClick={onClose} variant="outline">
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editData ? (
                      'Update'
                    ) : (
                      <span>{isSubmitting ? 'Saving..' : 'Save'}</span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
