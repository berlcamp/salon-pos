/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  transaction: any
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction
}: Props) {
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Load cart items from Supabase
  useEffect(() => {
    if (!transaction?.id) return
    const fetchItems = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('transaction_items')
        .select('id, product_name, quantity, price')
        .eq('transaction_id', transaction.id)

      if (error) console.error(error)
      else setCart(data || [])

      setLoading(false)
    }
    fetchItems()
  }, [transaction])

  const updateQuantity = (index: number, value: number) => {
    const updated = [...cart]
    updated[index].quantity = value
    setCart(updated)
  }

  const handleSave = async () => {
    // Save updated quantities for returns
    for (const item of cart) {
      await supabase
        .from('transaction_items')
        .update({ quantity: item.quantity })
        .eq('id', item.id)
    }
    toast.success('Transaction updated!')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="space-y-2 border-b pb-4 mb-4">
              <p>
                <strong>Reference:</strong> {transaction.reference_number}
              </p>
              <p>
                <strong>Customer:</strong> {transaction.customers?.name || '-'}
              </p>
              <p>
                <strong>Service:</strong> {transaction.services?.name || '-'}
              </p>
              <p>
                <strong>Date:</strong> {transaction.date}
              </p>
            </div>

            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">{item.product_name}</td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity ?? 0}
                        onChange={(e) =>
                          updateQuantity(idx, Number(e.target.value))
                        }
                        className="w-20 text-right"
                      />
                    </td>
                    <td className="p-2 text-right">
                      ₱{Number(item.price).toLocaleString()}
                    </td>
                    <td className="p-2 text-right">
                      ₱{(item.quantity * item.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button variant="blue" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
