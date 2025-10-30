'use client'

import LoadingSkeleton from '@/components/LoadingSkeleton'
import Notfoundpage from '@/components/Notfoundpage'
import { Button } from '@/components/ui/button'
import { PER_PAGE } from '@/lib/constants'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hook'
import { addList } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'
import { ProductStock } from '@/types'
import { useEffect, useState } from 'react'
import { AddModal } from './AddModal'
import { Filter } from './Filter'
import { List } from './List'

export default function Page() {
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [modalAddOpen, setModalAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const user = useAppSelector((state) => state.user.user)
  const dispatch = useAppDispatch()

  const selectedBranchId = useAppSelector(
    (state) => state.branch.selectedBranchId
  )

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      dispatch(addList([])) // reset list

      const { data, count, error } = await supabase
        .from('products')
        .select(
          `
    *,
    product_stocks:product_stocks (
      quantity,
      type
    )
  `,
          { count: 'exact' }
        )
        .eq('branch_id', selectedBranchId)
        .ilike('name', `%${filter}%`)
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
        .order('id', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
      } else {
        // calculate stock
        const formatted = data.map((p) => ({
          ...p,
          stock_qty:
            p.product_stocks?.reduce(
              (acc: number, s: ProductStock) =>
                s.type === 'in' ? acc + s.quantity : acc - s.quantity,
              0
            ) || 0
        }))
        dispatch(addList(formatted || []))
        setTotalCount(count || 0)
      }

      setLoading(false)
    }

    fetchData()
  }, [page, filter, dispatch, selectedBranchId])

  if (user?.type === 'user') {
    return <Notfoundpage />
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="text-3xl font-semibold">Products</h1>
        <Button
          variant="blue"
          onClick={() => setModalAddOpen(true)}
          className="ml-auto"
        >
          Add Product
        </Button>
      </div>
      <div className="app__content">
        <Filter filter={filter} setFilter={setFilter} />

        <div className="mt-4 py-2 text-xs border-t border-gray-200 text-gray-500">
          Showing {Math.min((page - 1) * PER_PAGE + 1, totalCount)} to{' '}
          {Math.min(page * PER_PAGE, totalCount)} of {totalCount} results
        </div>

        <List />

        {loading && <LoadingSkeleton />}

        {totalCount === 0 && !loading && (
          <div className="mt-4 flex justify-center items-center space-x-2">
            No records found.
          </div>
        )}

        {totalCount > 0 && totalCount > PER_PAGE && (
          <div className="mt-4 text-xs flex justify-center items-center space-x-2">
            <Button
              size="xs"
              variant="blue"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              {'<<'}
            </Button>
            <p>
              Page {page} of {Math.ceil(totalCount / PER_PAGE)}
            </p>
            <Button
              size="xs"
              variant="blue"
              onClick={() => setPage(page + 1)}
              disabled={page * PER_PAGE >= totalCount}
            >
              {'>>'}
            </Button>
          </div>
        )}

        <AddModal
          isOpen={modalAddOpen}
          onClose={() => setModalAddOpen(false)}
        />
      </div>
    </div>
  )
}
