'use client'
import { Button } from '@/components/ui/button'
import { RootState, Transaction } from '@/types'
import { format } from 'date-fns'
import { useState } from 'react'
import Avatar from 'react-avatar'
import { useSelector } from 'react-redux'
import { TransactionDetailsModal } from './TransactionDetailsModal'

export const List = () => {
  const list = useSelector((state: RootState) => state.list.value)
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleView = (item: Transaction) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  return (
    <div className="overflow-x-auto">
      <table className="app__table">
        <thead className="app__thead">
          <tr>
            <th className="app__th">Ref No.</th>
            <th className="app__th">Customer</th>
            <th className="app__th">Date</th>
            <th className="app__th text-right">Amount</th>
            <th className="app__th text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item: Transaction) => (
            <tr key={item.id} className="app__tr">
              <td className="app__td">{item.reference_number}</td>
              <td className="app__td">
                {item.customer ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={item.customer.name}
                      size="30"
                      round={true}
                      textSizeRatio={3}
                      className="shrink-0"
                      // color="#2a4f6e" // denim base color
                    />
                    <span className="text-gray-800 font-medium">
                      {item.customer.name}
                    </span>
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td className="app__td">
                {item.created_at &&
                  format(new Date(item.created_at), 'MMMM dd, yyyy')}
              </td>
              <td className="app__td text-right">
                ₱{Number(item.total_amount).toLocaleString()}
              </td>
              <td className="app__td text-center">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleView(item)}
                >
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedItem && (
        <TransactionDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          transaction={selectedItem}
        />
      )}
    </div>
  )
}
