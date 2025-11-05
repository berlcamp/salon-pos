'use client'
import { AddModal as AddCustomerModal } from '@/app/(auth)/customers/AddModal'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hook'
import { addItem, updateList } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Booking, Customer as CustomerList } from '@/types'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

interface Service {
  id: string
  name: string
  duration_minutes?: number
}

interface User {
  id: string
  name: string
}

// ---------- ZOD SCHEMA ----------
const FormSchema = z.object({
  customer_id: z.coerce.number().min(1, 'Client is required'), // ✅ coercion fixes string->number from inputs
  schedule_date: z.string().min(1, 'Schedule date is required'),
  time_start: z.string().min(1, 'Start time is required'),
  service_id: z.coerce.number().min(1, 'Service is required'), // ✅ coercion fixes string->number from inputs
  attendants: z.array(z.string()).min(1, 'At least one attendant is required'),
  remarks: z.string().optional()
})
type FormType = z.infer<typeof FormSchema>

// ---------- MODAL PROPS ----------
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  editData?: Booking | null
}

// ---------- CONSTANTS ----------
const title = 'Booking'

// ---------- COMPONENT ----------
export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const dispatch = useAppDispatch()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [customers, setCustomers] = useState<CustomerList[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)

  const selectedBranchId = useAppSelector(
    (state) => state.branch.selectedBranchId
  )

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      customer_id: editData?.customer_id || 0,
      schedule_date: editData?.schedule_date || '',
      time_start: editData?.time_start || '',
      service_id: editData?.service_id || 0,
      attendants: editData?.attendants || [],
      remarks: editData?.remarks || ''
    }
  })

  const selectedCustomer = customers.find(
    (c: CustomerList) =>
      c.id.toString() === form.watch('customer_id')?.toString()
  )

  const filteredCustomers = customers.filter((c: CustomerList) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ---------- LOAD DROPDOWNS ----------
  useEffect(() => {
    const fetchData = async () => {
      const [c, s, u] = await Promise.all([
        supabase
          .from('customers')
          .select()
          .eq('branch_id', selectedBranchId)
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('services')
          .select('id, name, duration_minutes')
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('users')
          .select('id, name')
          .eq('branch_id', selectedBranchId)
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID)
      ])

      if (c.data) setCustomers(c.data)
      if (s.data) setServices(s.data)
      if (u.data) setUsers(u.data)
    }
    fetchData()
  }, [])

  const toTimestamp = (date: string, time: string) => {
    return new Date(`${date}T${time}:00`).toISOString()
  }

  // ---------- SUBMIT ----------
  const onSubmit = async (data: FormType) => {
    if (isSubmitting || !selectedBranchId) return
    setIsSubmitting(true)

    try {
      const org_id = process.env.NEXT_PUBLIC_ORG_ID as string

      const newData: Omit<Booking, 'id'> = {
        customer_id: data.customer_id,
        branch_id: selectedBranchId,
        schedule_date: data.schedule_date,
        time_start: toTimestamp(data.schedule_date, data.time_start),
        service_id: data.service_id,
        remarks: data.remarks || '',
        attendants: data.attendants,
        org_id,
        status: 'pending'
      }

      let bookingId: number

      // ✅ UPDATE booking
      if (editData?.id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update(newData)
          .eq('id', editData.id)
        if (updateError) throw new Error(updateError.message)

        bookingId = editData.id

        // 🧹 Remove old attendants first
        await supabase
          .from('booking_attendants')
          .delete()
          .eq('booking_id', bookingId)

        toast.success('✅ Booking updated successfully.')
        dispatch(updateList({ ...newData, id: bookingId }))
      } else {
        // ✅ INSERT booking
        const { data: inserted, error: insertError } = await supabase
          .from('bookings')
          .insert([newData])
          .select('id')
          .single()
        if (insertError) throw new Error(insertError.message)

        bookingId = inserted.id
        toast.success('✅ Booking added successfully.')
        dispatch(addItem({ ...newData, id: bookingId }))
      }

      // ✅ Insert attendants
      if (data.attendants && data.attendants.length > 0) {
        const attendantsData = data.attendants.map((user_id) => ({
          booking_id: bookingId,
          user_id: Number(user_id)
        }))

        const { error: attendantsError } = await supabase
          .from('booking_attendants')
          .insert(attendantsData)

        if (attendantsError) throw new Error(attendantsError.message)
      }

      onClose()
    } catch (err) {
      console.error('Error saving booking:', err)
      toast.error('Something went wrong while saving.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (editData) {
      const formatTime = (ts: string) => {
        if (!ts) return ''
        const d = new Date(ts)
        const hours = d.getHours().toString().padStart(2, '0')
        const minutes = d.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
      }

      form.reset({
        customer_id: editData.customer_id,
        schedule_date: editData.schedule_date,
        time_start: formatTime(editData.time_start),
        service_id: editData.service_id,
        remarks: editData.remarks,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attendants: (editData.attendants || []).map((a: any) =>
          typeof a === 'object' ? a.user_id.toString() : a.toString()
        )
      })
    }
  }, [form, editData, isOpen])

  // ---------- RENDER ----------
  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-40 focus:outline-none"
      onClose={() => {}}
    >
      <div
        className="fixed inset-0 bg-gray-600 opacity-80"
        aria-hidden="true"
      />
      {/* Centered panel container */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <DialogPanel transition className="app__modal_dialog_panel">
          <div className="app__modal_dialog_title_container">
            <DialogTitle as="h3" className="text-base font-medium">
              {editData ? 'Edit' : 'Add'} {title}
            </DialogTitle>
          </div>

          <div className="app__modal_dialog_content">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* CUSTOMER */}
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Client</FormLabel>
                        <Popover
                          open={isAddCustomerOpen}
                          onOpenChange={setIsAddCustomerOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {selectedCustomer
                                ? selectedCustomer.name
                                : 'Select client'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-full p-0">
                            <Command filter={() => 1}>
                              <CommandInput
                                placeholder="Search client name..."
                                onValueChange={(value) => setSearchTerm(value)}
                              />
                              {filteredCustomers.length === 0 ? (
                                <CommandEmpty>
                                  <div className="flex flex-col items-center justify-center gap-2 py-3">
                                    <span>No customer found.</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setAddCustomerOpen(true)
                                        setIsAddCustomerOpen(false)
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" /> Add new
                                      customer
                                    </Button>
                                  </div>
                                </CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {filteredCustomers.map((c: CustomerList) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.id.toString()}
                                      onSelect={() => {
                                        form.setValue(
                                          'customer_id',
                                          Number(c.id)
                                        )
                                        setIsAddCustomerOpen(false) // ✅ hide dropdown on select
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          c.id.toString() ===
                                            field.value?.toString()
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      {c.name}
                                    </CommandItem>
                                  ))}
                                  <div className="border-t mt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start mt-1"
                                      onClick={() => {
                                        setAddCustomerOpen(true)
                                        setIsAddCustomerOpen(false)
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" /> Add new
                                      customer
                                    </Button>
                                  </div>
                                </CommandGroup>
                              )}
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* SCHEDULE DATE */}
                  <FormField
                    control={form.control}
                    name="schedule_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* START TIME */}
                  <FormField
                    control={form.control}
                    name="time_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* SERVICE */}
                  <FormField
                    control={form.control}
                    name="service_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedures</FormLabel>
                        <Select
                          // Always pass a string to keep it controlled
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={field.value ? String(field.value) : ''}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ATTENDANTS */}
                  <FormField
                    control={form.control}
                    name="attendants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className={
                            form.formState.errors.attendants
                              ? 'text-red-500'
                              : ''
                          }
                        >
                          Docdors
                        </FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {users.map((u) => (
                            <Button
                              key={u.id}
                              type="button"
                              size="sm"
                              variant={
                                field.value.includes(u.id.toString())
                                  ? 'blue'
                                  : 'outline'
                              }
                              onClick={() => {
                                const exists = field.value.includes(
                                  u.id.toString()
                                )
                                const updated = exists
                                  ? field.value.filter(
                                      (id) => id !== u.id.toString()
                                    )
                                  : [...field.value, u.id.toString()] // ✅ convert to string
                                field.onChange(updated)
                                form.trigger('attendants')
                              }}
                            >
                              {u.name}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* REMARKS */}
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional remarks" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* FOOTER */}
                <div className="app__modal_dialog_footer">
                  <Button type="button" onClick={onClose} variant="outline">
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isSubmitting ? 'Saving...' : editData ? 'Update' : 'Save'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogPanel>
      </div>
      {/* 🔹 Add Customer Modal */}
      <AddCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        editData={null}
        onAdded={(data) => {
          // ✅ Add to local customers list
          const newCustomer = { ...data, id: Number(data.id) } // ✅ normalize
          setCustomers((prev) => [newCustomer, ...prev])
          // ✅ Set selected value in form
          form.setValue('customer_id', newCustomer.id)
        }}
      />
    </Dialog>
  )
}
