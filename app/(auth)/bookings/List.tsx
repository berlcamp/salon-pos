'use client'

import { ConfirmationModal } from '@/components/ConfirmationModal'
import { Button } from '@/components/ui/button'
import { useAppDispatch } from '@/lib/redux/hook'
import { deleteItem } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'
import { Booking, RootState } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Avatar from 'react-avatar'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { AddModal } from './AddModal'

type ItemType = Booking
const table = 'bookings'

export const List = () => {
  const dispatch = useAppDispatch()
  const list = useSelector((state: RootState) => state.list.value)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAddOpen, setModalAddOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null)

  const handleDeleteConfirmation = (item: ItemType) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleEdit = (item: ItemType) => {
    setSelectedItem(item)
    setModalAddOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedItem) return
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', selectedItem.id)

    if (error) {
      toast.error('Unable to delete booking.')
    } else {
      toast.success('Deleted successfully.')
      dispatch(deleteItem(selectedItem))
    }

    setIsModalOpen(false)
  }

  return (
    <div className="overflow-x-auto">
      <table className="app__table">
        <thead className="app__thead">
          <tr>
            <th className="app__th">Customer</th>
            <th className="app__th">Service</th>
            <th className="app__th">Start Time</th>
            <th className="app__th">End Time</th>
            <th className="app__th">Status</th>
            <th className="app__th"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((item: ItemType) => (
            <tr key={item.id} className="app__tr">
              <td className="app__td">
                {item.customer ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={item.customer.name}
                      size="30"
                      round={true}
                      textSizeRatio={3}
                      className="shrink-0"
                    />
                    <span className="text-gray-800 font-medium">
                      {item.customer.name}
                    </span>
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td className="app__td">{item.service?.name}</td>
              <td className="app__td">
                {new Date(item.time_start).toLocaleString()}
              </td>
              <td className="app__td">
                {new Date(item.time_end).toLocaleString()}
              </td>
              <td className="app__td capitalize">{item.status}</td>
              <td className="app__td">
                <div className="flex gap-2 justify-center">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="text-red-500"
                    onClick={() => handleDeleteConfirmation(item)}
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
        message="Are you sure you want to delete this booking?"
      />
      <AddModal
        isOpen={modalAddOpen}
        onClose={() => setModalAddOpen(false)}
        editData={selectedItem}
      />
    </div>
  )
}
