'use client'

import { ConfirmationModal } from '@/components/ConfirmationModal'
import { Button } from '@/components/ui/button'
import { useAppDispatch } from '@/lib/redux/hook'
import { deleteItem } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'
import { ProductStock, RootState } from '@/types'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'

// view table
const table = 'product_stocks'

export const List = () => {
  const dispatch = useAppDispatch()
  const list = useSelector((state: RootState) => state.list.value)

  const [isModalOpen, setIsModalOpen] = useState(false)

  const [selectedItem, setSelectedItem] = useState<ProductStock | null>(null)

  const handleDelete = async () => {
    if (!selectedItem) return
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', selectedItem.id)
    if (error) {
      if (error.code === '23503')
        toast.error('Selected record cannot be deleted.')
      else toast.error(error.message)
      return
    }
    toast.success('Successfully deleted!')
    dispatch(deleteItem(selectedItem))
    setIsModalOpen(false)
  }

  return (
    <div className="overflow-x-none">
      <table className="app__table">
        <thead className="app__thead">
          <tr>
            <th className="app__th">Product Name</th>
            <th className="app__th">Date</th>
            <th className="app__th text-right">Type</th>
            <th className="app__th text-right">Quantity</th>
            <th className="app__th"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((item: ProductStock) => (
            <tr key={item.id} className="app__tr">
              <td className="app__td">
                <div>{item.product?.name}</div>
                <div className="text-xs"> ({item.product?.category})</div>
              </td>
              <td className="app__td">{item.transaction_date}</td>
              <td className="app__td text-center">{item.type}</td>
              <td className="app__td text-center">{item.quantity}</td>
              <td className="app__td">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    className="text-red-500"
                    onClick={() => {
                      setSelectedItem(item)
                      setIsModalOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this?"
      />
    </div>
  )
}
