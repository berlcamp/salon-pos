/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface SalesSummary {
  date: string
  total: number
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<'day' | 'week' | 'month'>('day')
  const [salesData, setSalesData] = useState<SalesSummary[]>([])
  const [totalSales, setTotalSales] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [avgTransaction, setAvgTransaction] = useState(0)
  const [topItems, setTopItems] = useState<{ name: string; total: number }[]>(
    []
  )

  const fetchData = async () => {
    try {
      let fromDate: Date
      const today = new Date()

      if (filter === 'day') fromDate = startOfDay(today)
      else if (filter === 'week')
        fromDate = startOfWeek(today, { weekStartsOn: 1 })
      else fromDate = startOfMonth(today)

      // ✅ Fetch transactions summary
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, total_amount, created_at')
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      const grouped: Record<string, number> = {}
      let total = 0

      transactions?.forEach((t) => {
        const dateKey = format(new Date(t.created_at), 'MM-dd')
        grouped[dateKey] = (grouped[dateKey] || 0) + Number(t.total_amount)
        total += Number(t.total_amount)
      })

      const formatted = Object.entries(grouped).map(([date, total]) => ({
        date,
        total
      }))

      setSalesData(formatted)
      setTotalSales(total)
      setTotalTransactions(transactions?.length || 0)
      setAvgTransaction(transactions?.length ? total / transactions.length : 0)

      // ✅ Fetch top items (products/services)
      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select(
          `
            item_type,
            quantity,
            total,
            products:products(name),
            services:services(name)
          `
        )
        .gte('created_at', fromDate.toISOString()) // optional if you track created_at on items

      if (itemsError) throw itemsError

      const itemTotals: Record<string, number> = {}
      items?.forEach((i: any) => {
        const name =
          i.item_type === 'product'
            ? i.products?.name
            : i.services?.name || 'Unknown'
        itemTotals[name] = (itemTotals[name] || 0) + Number(i.total)
      })

      const top = Object.entries(itemTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      setTopItems(top)
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch dashboard data')
    }
  }

  useEffect(() => {
    fetchData()
  }, [filter])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === 'day' ? 'default' : 'outline'}
            onClick={() => setFilter('day')}
          >
            Day
          </Button>
          <Button
            variant={filter === 'week' ? 'default' : 'outline'}
            onClick={() => setFilter('week')}
          >
            Week
          </Button>
          <Button
            variant={filter === 'month' ? 'default' : 'outline'}
            onClick={() => setFilter('month')}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₱
              {totalSales.toLocaleString(undefined, {
                minimumFractionDigits: 2
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTransactions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₱
              {avgTransaction.toLocaleString(undefined, {
                minimumFractionDigits: 2
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#4f46e5"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products/Services */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Products/Services</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topItems}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
