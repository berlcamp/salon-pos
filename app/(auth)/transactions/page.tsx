'use client'

import LoadingSkeleton from '@/components/LoadingSkeleton'
import Notfoundpage from '@/components/Notfoundpage'
import { Button } from '@/components/ui/button'
import { PER_PAGE } from '@/lib/constants'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hook'
import { addList } from '@/lib/redux/listSlice'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Filter } from './Filter'
import { List } from './List'

export default function Page() {
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.user.user)

  const selectedBranchId = useAppSelector(
    (state) => state.branch.selectedBranchId
  )

  useEffect(() => {
    dispatch(addList([]))

    const fetchData = async () => {
      setLoading(true)
      const { data, count, error } = await supabase
        .from('transactions')
        .select('*,customer:customer_id(name)', { count: 'exact' })
        .eq('branch_id', selectedBranchId)
        // .or(
        //   `reference_number.ilike.%${filter}%,customer.name.ilike.%${filter}%`
        // )
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
        .order('id', { ascending: false })

      if (error) console.error(error)
      else {
        dispatch(addList(data))
        setTotalCount(count || 0)
      }

      setLoading(false)
    }

    fetchData()
  }, [page, filter, dispatch])

  if (user?.type === 'user') return <Notfoundpage />

  return (
    <div>
      <div className="app__title">
        <h1 className="text-3xl font-semibold">Transactions</h1>
      </div>

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
    </div>
  )
}
