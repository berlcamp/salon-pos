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
  /* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useAppSelector } from '@/lib/redux/hook'
import { supabase } from '@/lib/supabase/client'
import { cn, formatMoney } from '@/lib/utils'
import {
  Customer,
  Product,
  ProductStock,
  Service,
  ServiceCategory,
  User
} from '@/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

interface CategoryNode {
  id: number
  name: string
  parent_id?: number | null
  children: CategoryNode[]
  services: Service[]
}

// ---------- ZOD SCHEMA ----------
const FormSchema = z.object({
  customer_id: z.coerce.number().min(1, 'Customer required'), // ✅ coercion fixes string->number
  attendants: z.array(z.string()).optional(),

  // Product selection
  product_id: z.coerce.number().optional(), // optional because user may not add products
  product_qty: z.coerce
    .number()
    .min(1, 'Quantity must be at least 1')
    .optional(),
  payment_type: z.string().min(1, 'Payment Type is required'),

  // Service selection
  service_id: z.coerce.number().optional() // optional because user may not add services
})

type FormType = z.infer<typeof FormSchema>

export default function CreateTransactionPage() {
  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {}
  })

  const [cartItems, setCartItems] = useState<any[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  const [isProductOpen, setIsProductOpen] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  )

  const selectedBranchId = useAppSelector(
    (state) => state.branch.selectedBranchId
  )

  const totalAmount = cartItems.reduce((acc, i) => acc + i.total, 0)

  // ---------- SUBMIT ----------
  const onSubmit = async (data: any) => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty!')
      return
    }

    try {
      // 1️⃣ Create transaction
      const todayPrefix = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '') // e.g. "20251108"
      const transactionPrefix = todayPrefix // "20251108"

      // ✅ Fetch last transaction_number for today
      const { data: lastTransaction } = await supabase
        .from('transactions')
        .select('transaction_number')
        .like('transaction_number', `${transactionPrefix}-%`)
        .order('transaction_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      let nextSequence = 1

      if (lastTransaction?.transaction_number) {
        const lastNum = parseInt(
          lastTransaction.transaction_number.split('-')[1],
          10
        )
        if (!isNaN(lastNum)) {
          nextSequence = lastNum + 1
        }
      }

      const newTransactionNumber = `${transactionPrefix}-${nextSequence}`

      // ✅ Insert new transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            org_id: Number(process.env.NEXT_PUBLIC_ORG_ID),
            customer_id: data.customer_id,
            transaction_number: newTransactionNumber,
            payment_type: data.payment_type,
            total_amount: totalAmount,
            branch_id: selectedBranchId
          }
        ])
        .select()
        .single()

      if (transactionError || !transactionData) throw transactionError

      const transactionId = transactionData.id

      // 2️⃣ Insert transaction items
      const transactionItems = cartItems.map((item) => ({
        ...item,
        transaction_id: transactionId
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)

      if (itemsError) throw itemsError

      // 3️⃣ Insert product stocks for products
      const productStocks = cartItems
        .filter((i) => i.item_type === 'product')
        .map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          type: 'out',
          transaction_date: new Date(),
          branch_id: selectedBranchId,
          org_id: Number(process.env.NEXT_PUBLIC_ORG_ID),
          transaction_id: transactionId
        }))

      if (productStocks.length > 0) {
        const { error: stockError } = await supabase
          .from('product_stocks')
          .insert(productStocks)
        if (stockError) throw stockError
      }

      toast.success('Transaction completed successfully!')
      setCartItems([])
      form.reset()
    } catch (err) {
      toast.error(`Transaction failed: ${err}`)
      console.error(err)
    }
  }

  const addProductToCart = (productId: number, qty = 1) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    setCartItems((prev) => [
      ...prev,
      {
        item_type: 'product',
        product_id: product.id,
        unit: product.unit ?? '',
        quantity: qty ?? 1, // ✅ default value here
        price: product.selling_price,
        total: product.selling_price * (qty ?? 1)
      }
    ])
  }

  const addServiceToCart = (serviceId: number) => {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return
    setCartItems((prev) => [
      ...prev,
      {
        item_type: 'service',
        service_id: service.id,
        quantity: 1, // ✅ default value here
        price: service.base_price,
        total: service.base_price
      }
    ])
  }

  const updateCartItemQuantity = (idx: number, qty: number) => {
    setCartItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, quantity: qty, total: item.price * qty } : item
      )
    )
  }

  const removeCartItem = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // ---------- LOAD DROPDOWNS ----------
  useEffect(() => {
    const fetchData = async () => {
      const [c, s, u, p, cat] = await Promise.all([
        supabase
          .from('customers')
          .select()
          .eq('branch_id', selectedBranchId)
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('services')
          .select()
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('users')
          .select()
          .eq('branch_id', selectedBranchId)
          .eq('org_id', process.env.NEXT_PUBLIC_ORG_ID),
        supabase
          .from('products')
          .select('*,product_stocks:product_stocks(quantity,type)')
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
      if (p.data) {
        const formatted = p.data.map((p) => ({
          ...p,
          stock_qty:
            p.product_stocks?.reduce(
              (acc: number, s: ProductStock) =>
                s.type === 'in' ? acc + s.quantity : acc - s.quantity,
              0
            ) || 0
        }))
        setProducts(formatted.filter((p) => p.stock_qty > 0))
      }
    }
    fetchData()
  }, [selectedBranchId])

  const selectedCustomer = customers.find(
    (c: Customer) => c.id === form.watch('customer_id')
  )

  const filteredCustomers = customers.filter((c: Customer) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">New Transaction</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* ---------- Customer ---------- */}
          <div>
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Customer</FormLabel>
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
                          : 'Select customer'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-full p-0">
                      <Command filter={() => 1}>
                        <CommandInput
                          placeholder="Search customer..."
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
                            {filteredCustomers.map((c: Customer) => (
                              <CommandItem
                                key={c.id}
                                value={c.id.toString()}
                                onSelect={() => {
                                  form.setValue('customer_id', Number(c.id))
                                  setIsAddCustomerOpen(false) // ✅ hide dropdown on select
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    c.id.toString() === field.value?.toString()
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

            {/* ---------- Product Field ---------- */}
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Product Purhcased</FormLabel>
                  <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'w-full justify-between',
                          !field.value && 'text-muted-foreground'
                        )}
                        type="button"
                      >
                        {field.value
                          ? products.find((p) => p.id === field.value)?.name
                          : 'Select product'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search product..."
                          onValueChange={(v) => setProductSearchTerm(v)}
                        />
                        {filteredProducts.length === 0 ? (
                          <CommandEmpty>No products found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredProducts.map((p) => {
                              const alreadyInCart = cartItems.some(
                                (item) =>
                                  item.item_type === 'product' &&
                                  item.product_id === p.id
                              )
                              return (
                                <CommandItem
                                  key={p.id}
                                  value={p.id.toString()}
                                  disabled={alreadyInCart} // ✅ disable if in cart
                                  onSelect={() => {
                                    if (!alreadyInCart) {
                                      field.onChange(p.id)
                                      addProductToCart(p.id, 1)
                                    }
                                    setIsProductOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      p.id === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span
                                      className={cn(
                                        alreadyInCart &&
                                          'opacity-50 line-through'
                                      )}
                                    >
                                      {p.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {p.category} • ₱{p.selling_price} • Stock:{' '}
                                      {p.stock_qty}
                                    </span>
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Procedures</FormLabel>
              <div>
                <Select
                  onValueChange={(value) => {
                    // const service = services.find(
                    //   (s) => s.id.toString() === value
                    // )
                    // if (
                    //   service &&
                    //   !selectedServices.some((sv) => sv.id === service.id)
                    // ) {
                    //   setSelectedServices([...selectedServices, service])
                    // }
                    const alreadyInCart = cartItems.some(
                      (item) =>
                        item.item_type === 'service' &&
                        item.service_id === value
                    )
                    if (!alreadyInCart) {
                      addServiceToCart(Number(value))
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
                              <div key={`sub-${sub.id}`} className="ml-3 mt-1">
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
            </FormItem>

            {/* ATTENDANTS */}
            {form.watch('service_id') && (
              <FormField
                control={form.control}
                name="attendants"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel
                      className={
                        form.formState.errors.attendants ? 'text-red-500' : ''
                      }
                    >
                      Service Attendants
                    </FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {users.map((u) => {
                        const selected =
                          field.value?.includes(u.id.toString()) ?? false

                        return (
                          <Button
                            key={u.id}
                            type="button"
                            size="sm"
                            variant={selected ? 'blue' : 'outline'}
                            onClick={() => {
                              const current = field.value ?? []
                              const exists = current.includes(u.id.toString())
                              const updated = exists
                                ? current.filter((id) => id !== u.id.toString())
                                : [...current, u.id.toString()]
                              field.onChange(updated)
                              form.trigger('attendants')
                            }}
                          >
                            {u.name}
                          </Button>
                        )
                      })}
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          {/* ---------- Cart Table ---------- */}
          <div className="my-8 border border-gray-600 p-2 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.item_type === 'product' ? (
                        <div className="space-x-2">
                          <span>
                            {
                              products.find((p) => p.id === item.product_id)
                                ?.name
                            }
                          </span>
                          <span>
                            (
                            {
                              products.find((p) => p.id === item.product_id)
                                ?.unit
                            }
                          </span>
                          )
                        </div>
                      ) : (
                        services.find((s) => s.id === item.service_id)?.name
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {item.item_type}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartItemQuantity(idx, Number(e.target.value))
                          }
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>{formatMoney(item.price)}</TableCell>
                    <TableCell>{formatMoney(item.total)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="xs"
                        variant="destructive"
                        onClick={() => removeCartItem(idx)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="text-right mt-2 font-bold">
              Total: {formatMoney(totalAmount)}
            </div>
          </div>

          {/* CATEGORY DROPDOWN */}
          <FormField
            control={form.control}
            name="payment_type"
            render={({ field }) => (
              <FormItem className="my-4 w-full">
                <FormLabel className="app__formlabel_standard">
                  Payment Method
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl className="bg-white">
                    <SelectTrigger className="app__input_standard">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="GCash">GCash</SelectItem>
                    <SelectItem value="Maya">Maya</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ---------- Submit ---------- */}
          <Button type="submit" className="w-full">
            Complete Transaction
          </Button>
        </form>
      </Form>

      {/* ---------- Add Customer Modal ---------- */}
      <AddCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        editData={null}
        onAdded={(data) => {
          const newCustomer = { ...data, id: Number(data.id) }
          setCustomers((prev) => [newCustomer, ...prev])
          form.setValue('customer_id', newCustomer.id)
        }}
      />
    </div>
  )
}
