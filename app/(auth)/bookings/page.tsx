'use client'

import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { PER_PAGE } from '@/lib/constants'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hook'
import { addList } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { AddModal } from './AddModal'
import { Filter } from './Filter'
import { List } from './List'

export default function Page() {
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [modalAddOpen, setModalAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({
    keyword: '',
    schedule_date: ''
  })

  const selectedBranchId = useAppSelector(
    (state) => state.branch.selectedBranchId
  )

  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(addList([]))

    const fetchData = async () => {
      setLoading(true)

      let query = supabase
        .from('bookings')
        .select(
          '*, customer:customer_id(name), doctor:doctor_id(name), services:booking_services(service:service_id(name,category:category_id(name)))',
          { count: 'exact' }
        )
        .eq('branch_id', selectedBranchId)

      if (filter.schedule_date)
        query = query.eq('schedule_date', filter.schedule_date)

      if (filter.keyword) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .ilike('name', `%${filter.keyword}%`)
          .eq('branch_id', selectedBranchId)
        const ids = customers?.map((c) => c.id) || []
        if (ids.length > 0) query = query.in('customer_id', ids)
        else query = query.eq('id', 0) // no match
      }

      const { data, count, error } = await query
        .order('schedule_date', { ascending: false })
        .order('time_start', { ascending: false })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

      if (error) console.error(error)
      else {
        dispatch(addList(data))
        setTotalCount(count || 0)
      }

      setLoading(false)
    }

    fetchData()
  }, [page, filter, dispatch, selectedBranchId])

  return (
    <div>
      <div className="app__title">
        <h1 className="text-3xl font-normal">Bookings</h1>
        <Button
          variant="blue"
          onClick={() => setModalAddOpen(true)}
          className="ml-auto"
        >
          Add Booking
        </Button>
      </div>

      <Filter filter={filter} setFilter={setFilter} />
      <div className="app__content">
        <div className="py-2 text-xs text-gray-500">
          Showing {Math.min((page - 1) * PER_PAGE + 1, totalCount)} to{' '}
          {Math.min(page * PER_PAGE, totalCount)} of {totalCount} results
        </div>

        <List />
        {loading && <LoadingSkeleton />}

        {!loading && totalCount === 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            No bookings found.
          </div>
        )}

        {totalCount > PER_PAGE && (
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
