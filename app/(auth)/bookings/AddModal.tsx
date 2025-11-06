/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  Booking,
  Customer as CustomerList,
  Service,
  ServiceCategory
} from '@/types'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

// interface Service {
//   id: string
//   name: string
//   duration_minutes?: number
// }

interface User {
  id: string
  name: string
}

interface CategoryNode {
  id: number
  name: string
  parent_id?: number | null
  children: CategoryNode[]
  services: Service[]
}

// ---------- ZOD SCHEMA ----------
const FormSchema = z.object({
  customer_id: z.coerce.number().min(1, 'Client is required'), // ✅ coercion fixes string->number from inputs
  schedule_date: z.string().min(1, 'Schedule date is required'),
  time_start: z.string().min(1, 'Start time is required'),
  attendants: z.array(z.string()).optional(),
  procedures: z.array(z.string()).optional(),
  doctor_id: z.coerce.number().min(1, 'Physician is required'), // ✅ coercion fixes string->number from inputs
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
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)

  const [selectedServices, setSelectedServices] = useState<Service[]>([])

  const user = useAppSelector((state) => state.user.user)

  const selectedBranchId = useAppSelector(
    (state) => state.branch.selectedBranchId
  )

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema)
    // defaultValues: {
    //   customer_id: editData?.customer_id || 0,
    //   schedule_date: editData?.schedule_date || '',
    //   time_start: editData?.time_start || '',
    //   attendants: editData?.attendants || [],
    //   doctor_id: editData?.doctor_id || 0,
    //   remarks: editData?.remarks || ''
    // }
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
      const [c, s, u, cat] = await Promise.all([
        supabase
          .from('customers')
          .select()
          .eq('branch_id', selectedBranchId)
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('services')
          .select('*,category:category_id(name)')
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('users')
          .select('id, name')
          .eq('branch_id', selectedBranchId)
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('service_categories')
          .select('*')
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID)
      ])

      if (c.data) setCustomers(c.data)
      if (s.data) setServices(s.data)
      if (u.data) setUsers(u.data)
      if (cat.data) setCategories(cat.data)
    }
    fetchData()
  }, [selectedBranchId])

  const toTimestamp = (date: string, time: string) => {
    return new Date(`${date}T${time}:00`).toISOString()
  }

  // ---------- SUBMIT ----------
  const onSubmit = async (data: FormType) => {
    if (isSubmitting || !selectedBranchId) return
    setIsSubmitting(true)

    try {
      const org_id = process.env.NEXT_PUBLIC_ORG_ID as string
      let bookingId: number

      // ✅ Prepare data
      const newData = {
        customer_id: data.customer_id,
        doctor_id: data.doctor_id,
        branch_id: selectedBranchId,
        schedule_date: data.schedule_date,
        time_start: toTimestamp(data.schedule_date, data.time_start),
        remarks: data.remarks || '',
        org_id,
        created_by: user?.name
      }

      // ------------------------------------------------
      // 🟢 UPDATE EXISTING BOOKING
      // ------------------------------------------------
      if (editData?.id) {
        bookingId = editData.id

        // Update base booking info
        const { error: updateError } = await supabase
          .from('bookings')
          .update(newData)
          .eq('id', bookingId)
        if (updateError) throw new Error(updateError.message)

        // Clean related tables first
        await Promise.all([
          supabase
            .from('booking_attendants')
            .delete()
            .eq('booking_id', bookingId),
          supabase.from('booking_services').delete().eq('booking_id', bookingId)
        ])

        // ✅ Insert attendants
        if ((data.attendants ?? []).length > 0) {
          const attendantsData = data.attendants?.map((user_id) => ({
            booking_id: bookingId,
            user_id: Number(user_id)
          }))
          const { error: attendantsError } = await supabase
            .from('booking_attendants')
            .insert(attendantsData)
          if (attendantsError) throw new Error(attendantsError.message)
        }

        // ✅ Insert selected services
        if (selectedServices?.length > 0) {
          const servicesData = selectedServices.map((service) => ({
            booking_id: bookingId,
            service_id: Number(service.id)
          }))
          const { error: serviceError } = await supabase
            .from('booking_services')
            .insert(servicesData)
          if (serviceError) throw new Error(serviceError.message)
        }

        // ✅ Fetch updated data
        const { data: updated, error: fetchError } = await supabase
          .from('bookings')
          .select(
            `*, 
           customer:customer_id(name), 
           doctor:doctor_id(name), 
           services:booking_services(service:service_id(name,category:category_id(name)))`
          )
          .eq('id', bookingId)
          .single()

        if (fetchError) throw new Error(fetchError.message)
        if (updated) dispatch(updateList(updated))
        toast.success('✅ Booking updated successfully.')
      }

      // ------------------------------------------------
      // 🟢 INSERT NEW BOOKING
      // ------------------------------------------------
      else {
        const { data: inserted, error: insertError } = await supabase
          .from('bookings')
          .insert(newData)
          .select('id')
          .single()
        if (insertError) throw new Error(insertError.message)
        bookingId = inserted.id

        // ✅ Insert attendants
        if ((data.attendants ?? []).length > 0) {
          const attendantsData = data.attendants?.map((user_id) => ({
            booking_id: bookingId,
            user_id: Number(user_id)
          }))
          const { error: attendantsError } = await supabase
            .from('booking_attendants')
            .insert(attendantsData)
          if (attendantsError) throw new Error(attendantsError.message)
        }

        // ✅ Insert services
        if (selectedServices?.length > 0) {
          const servicesData = selectedServices.map((service) => ({
            booking_id: bookingId,
            service_id: Number(service.id)
          }))
          const { error: serviceError } = await supabase
            .from('booking_services')
            .insert(servicesData)
          if (serviceError) throw new Error(serviceError.message)
        }

        // ✅ Fetch complete new record
        const { data: fullBooking, error: fetchError } = await supabase
          .from('bookings')
          .select(
            `*, 
           customer:customer_id(name), 
           doctor:doctor_id(name), 
           services:booking_services(service:service_id(name,category:category_id(name)))`
          )
          .eq('id', bookingId)
          .single()

        if (fetchError) throw new Error(fetchError.message)
        if (fullBooking) dispatch(addItem(fullBooking))
        toast.success('✅ Booking added successfully.')
      }

      onClose()
    } catch (err) {
      console.error('❌ Error saving booking:', err)
      toast.error('Something went wrong while saving.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!editData) return

    const formatTime = (ts: string) => {
      if (!ts) return ''
      const d = new Date(ts)
      const hours = d.getHours().toString().padStart(2, '0')
      const minutes = d.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }

    // ✅ Extract attendants and services safely
    const attendants = (editData.attendants || []).map((a: any) =>
      typeof a === 'object' ? a.user_id?.toString() : a?.toString()
    )

    const servicesFromEdit = (editData.services || [])
      .map((s: any) => s.service)
      .filter(Boolean)

    // ✅ Reset form
    form.reset({
      customer_id: editData.customer_id,
      doctor_id: editData.doctor_id,
      schedule_date: editData.schedule_date,
      time_start: formatTime(editData.time_start),
      remarks: editData.remarks ?? '',
      attendants,
      procedures: servicesFromEdit.map((s: any) => s.id?.toString())
    })

    // ✅ Ensure state is updated only *after* reset
    setTimeout(() => {
      setSelectedServices(servicesFromEdit)
    }, 0)
  }, [editData, form, isOpen])

  const buildCategoryTree = (): CategoryNode[] => {
    const categoryMap = new Map<number, CategoryNode>()

    categories.forEach((cat: any) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        children: [],
        services: []
      })
    })

    services.forEach((s) => {
      const cat = categoryMap.get(s.category_id)
      if (cat) cat.services.push(s)
    })

    const tree: CategoryNode[] = []

    categories.forEach((cat: any) => {
      const node = categoryMap.get(cat.id)!
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id)
        if (parent) parent.children.push(node)
      } else {
        tree.push(node)
      }
    })

    return tree
  }

  const categoryTree = buildCategoryTree()

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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
                                  {filteredCustomers.map(
                                    (c: CustomerList, idx) => (
                                      <CommandItem
                                        key={idx}
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
                                    )
                                  )}
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
                  {/* ---------- SERVICE FIELD ---------- */}
                  <FormItem>
                    <FormLabel>Procedures</FormLabel>
                    <div>
                      <Select
                        onValueChange={(value) => {
                          const service = services.find(
                            (s) => s.id.toString() === value
                          )
                          if (
                            service &&
                            !selectedServices.some((sv) => sv.id === service.id)
                          ) {
                            setSelectedServices([...selectedServices, service])
                          }
                        }}
                      >
                        <SelectTrigger className="w-full border border-gray-300 bg-white rounded-md shadow-sm hover:border-gray-400 transition">
                          <SelectValue placeholder="Select a procedure" />
                        </SelectTrigger>

                        <SelectContent className="!p-0 overflow-y-auto overflow-x-visible bg-white rounded-lg shadow-lg">
                          <div className="py-2">
                            {categoryTree.map((cat) => (
                              <div key={`cat-${cat.id}`} className="space-y-1">
                                {/* 🟦 Parent Category */}
                                <div className="px-2">
                                  <div className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                                    {cat.name}
                                  </div>

                                  {/* 🔹 Subcategories */}
                                  {cat.children.map((sub) => (
                                    <div
                                      key={`sub-${sub.id}`}
                                      className="ml-3 mt-1"
                                    >
                                      <div className="text-sm text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded">
                                        {sub.name}
                                      </div>

                                      {/* ⚪ Services under Subcategory */}
                                      {sub.services.map((s) => (
                                        <SelectItem
                                          key={`srv-${s.id}`}
                                          value={s.id.toString()}
                                          className="ml-5 text-sm hover:bg-blue-50 cursor-pointer rounded px-2 py-1"
                                        >
                                          {s.name}
                                        </SelectItem>
                                      ))}
                                    </div>
                                  ))}

                                  {/* ⚪ Category-level Services */}
                                  {cat.services.length > 0 && (
                                    <div className="ml-3 mt-1">
                                      {cat.services.map((s) => (
                                        <SelectItem
                                          key={`srv-${s.id}`}
                                          value={s.id.toString()}
                                          className="ml-5 text-sm hover:bg-blue-50 cursor-pointer rounded px-2 py-1"
                                        >
                                          {s.name}
                                        </SelectItem>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected services list */}
                    <div className="mt-2 space-y-1 border rounded p-2 bg-gray-50">
                      {selectedServices.length === 0 && (
                        <p className="text-xs text-gray-400 italic">
                          No procedures added
                        </p>
                      )}

                      {selectedServices.map((s, idx) => (
                        <div
                          key={s.id ?? idx}
                          className="flex justify-between items-center text-sm bg-white border rounded px-2 py-1"
                        >
                          <span>
                            {s.name}
                            {s.category?.name && (
                              <span className="text-gray-500 text-xs ml-1">
                                ({s.category.name})
                              </span>
                            )}
                          </span>

                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() =>
                              setSelectedServices(
                                selectedServices.filter((sv) => sv.id !== s.id)
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </FormItem>
                  {/* DOCTOR */}
                  <FormField
                    control={form.control}
                    name="doctor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__formlabel_standard">
                          Physician
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? String(field.value) : ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Physician" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
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
                          Physician attendants
                        </FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {users.map((u) => (
                            <Button
                              key={u.id}
                              type="button"
                              size="sm"
                              variant={
                                field.value?.includes(u.id.toString())
                                  ? 'blue'
                                  : 'outline'
                              }
                              onClick={() => {
                                const exists = field.value?.includes(
                                  u.id.toString()
                                )
                                const updated = exists
                                  ? field.value?.filter(
                                      (id) => id !== u.id.toString()
                                    )
                                  : field.value
                                    ? [...field.value, u.id.toString()]
                                    : [] // ✅ convert to string
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
