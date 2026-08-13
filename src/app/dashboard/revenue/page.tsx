'use client';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { 
  TrendingUp, DollarSign, Activity, Calendar, Search, 
  ArrowLeft, Download, Printer, PieChart, CreditCard, ChevronRight 
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import Link from 'next/link';
import { Order, PaymentMethod, PaymentStatus } from '@/types';

function RevenueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { orders, load: loadOrders } = useOrderStore();
  const { settings, load: loadSettings } = useSettingsStore();

  const [mounted, setMounted] = useState(false);

  // Filter States
  const [filterType, setFilterType] = useState<'preset' | 'month' | 'range'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<'today' | 'week' | '3months' | '6months' | '1year' | 'all'>('1year');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 365), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with search params on load
  useEffect(() => {
    if (!mounted || !searchParams) return;
    const tf = searchParams.get('timeframe');
    if (tf) {
      setFilterType('preset');
      if (tf === 'today') setSelectedPreset('today');
      else if (tf === 'week') setSelectedPreset('week');
      else if (tf === 'year') setSelectedPreset('1year');
      else if (tf === '3months') setSelectedPreset('3months');
      else if (tf === '6months') setSelectedPreset('6months');
      else if (tf === 'all') setSelectedPreset('all');
    }
  }, [searchParams, mounted]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    if (mounted) {
      loadOrders();
      loadSettings();
    }
  }, [loadOrders, loadSettings, mounted]);

  // Compute date range objects
  const dateInterval = useMemo(() => {
    const now = new Date();
    let start = startOfDay(subDays(now, 365));
    let end = endOfDay(now);

    if (filterType === 'preset') {
      switch (selectedPreset) {
        case 'today':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case 'week':
          start = startOfDay(subDays(now, 7));
          end = endOfDay(now);
          break;
        case '3months':
          start = startOfDay(subDays(now, 90));
          end = endOfDay(now);
          break;
        case '6months':
          start = startOfDay(subDays(now, 180));
          end = endOfDay(now);
          break;
        case '1year':
          start = startOfDay(subDays(now, 365));
          end = endOfDay(now);
          break;
        case 'all':
          start = new Date(0); // All time
          end = endOfDay(now);
          break;
      }
    } else if (filterType === 'month') {
      const year = now.getFullYear();
      const monthIdx = parseInt(selectedMonth, 10);
      const targetMonthDate = new Date(year, monthIdx, 1);
      start = startOfMonth(targetMonthDate);
      end = endOfMonth(targetMonthDate);
    } else if (filterType === 'range') {
      if (startDate) start = startOfDay(new Date(startDate));
      if (endDate) end = endOfDay(new Date(endDate));
    }

    return { start, end };
  }, [filterType, selectedPreset, selectedMonth, startDate, endDate]);

  // Filter orders in range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const oDate = new Date(o.createdAt);
      return oDate >= dateInterval.start && oDate <= dateInterval.end;
    });
  }, [orders, dateInterval]);

  // Filtered orders list shown in Table (handles search)
  const searchedOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return filteredOrders;
    return filteredOrders.filter(
      o => 
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerMobile.includes(q) ||
        o.paymentMethod.toLowerCase().includes(q)
    );
  }, [filteredOrders, searchQuery]);

  // Sorted and searched orders
  const sortedAndSearchedOrders = useMemo(() => {
    const ordersCopy = [...searchedOrders];
    if (sortBy === 'newest') {
      return ordersCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === 'oldest') {
      return ordersCopy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (sortBy === 'highest') {
      return ordersCopy.sort((a, b) => b.finalAmount - a.finalAmount);
    }
    if (sortBy === 'lowest') {
      return ordersCopy.sort((a, b) => a.finalAmount - b.finalAmount);
    }
    return ordersCopy;
  }, [searchedOrders, sortBy]);

  // Download filtered/sorted data as CSV
  const handleDownloadCSV = () => {
    if (sortedAndSearchedOrders.length === 0) return;
    const headers = ['Order ID', 'Customer Name', 'Mobile', 'Email', 'Payment Status', 'Payment Method', 'Order Status', 'Date Logged', 'Amount (INR)'];
    const rows = sortedAndSearchedOrders.map(o => [
      o.orderId,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.customerMobile,
      `"${(o.customerEmail || '').replace(/"/g, '""')}"`,
      o.paymentStatus,
      o.paymentMethod || '—',
      o.orderStatus,
      format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
      o.finalAmount
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue_report_${format(dateInterval.start, 'yyyyMMdd')}_to_${format(dateInterval.end, 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Key Financial Calculations
  const metrics = useMemo(() => {
    const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'Paid');
    const totalPaid = paidOrders.reduce((sum, o) => sum + o.finalAmount, 0);

    const pendingOrders = filteredOrders.filter(o => o.paymentStatus === 'Unpaid' || o.paymentStatus === 'Partial');
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.finalAmount, 0);

    const countPaid = paidOrders.length;
    const aov = countPaid > 0 ? totalPaid / countPaid : 0;

    return {
      totalPaid,
      totalPending,
      countPaid,
      totalOrdersCount: filteredOrders.length,
      aov
    };
  }, [filteredOrders]);

  // Payment Mode breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = { Cash: 0, UPI: 0, Card: 0, Online: 0 };
    filteredOrders.forEach(o => {
      if (o.paymentStatus === 'Paid' && o.paymentMethod in breakdown) {
        breakdown[o.paymentMethod as PaymentMethod] += o.finalAmount;
      }
    });

    const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
    return {
      values: breakdown,
      percentages: {
        Cash: total > 0 ? (breakdown.Cash / total) * 100 : 0,
        UPI: total > 0 ? (breakdown.UPI / total) * 100 : 0,
        Card: total > 0 ? (breakdown.Card / total) * 100 : 0,
        Online: total > 0 ? (breakdown.Online / total) * 100 : 0,
      },
      total
    };
  }, [filteredOrders]);

  // Grouping for CSS bar chart
  const chartData = useMemo(() => {
    const { start, end } = dateInterval;
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (durationDays <= 31) {
      // Group by Day
      const daysMap: { [key: string]: { label: string; rev: number } } = {};
      const temp = new Date(start);
      // Safe check if start is 1970/all time
      const actualStart = start.getTime() === 0 ? subDays(new Date(), 30) : start;
      const loopStart = new Date(actualStart);

      while (loopStart <= end) {
        const key = format(loopStart, 'yyyy-MM-dd');
        daysMap[key] = {
          label: format(loopStart, 'dd MMM'),
          rev: 0
        };
        loopStart.setDate(loopStart.getDate() + 1);
      }

      filteredOrders.forEach(o => {
        if (o.paymentStatus === 'Paid') {
          const dateStr = format(new Date(o.createdAt), 'yyyy-MM-dd');
          if (daysMap[dateStr]) {
            daysMap[dateStr].rev += o.finalAmount;
          }
        }
      });

      return Object.values(daysMap);
    } else {
      // Group by Month
      const monthsMap: { [key: string]: { label: string; rev: number } } = {};
      const actualStart = start.getTime() === 0 ? subDays(new Date(), 365) : start;
      const temp = new Date(actualStart);
      const limit = new Date(end);

      let safety = 0;
      while (temp <= limit && safety < 36) {
        const key = format(temp, 'yyyy-MM');
        monthsMap[key] = {
          label: format(temp, 'MMM yy'),
          rev: 0
        };
        temp.setMonth(temp.getMonth() + 1);
        safety++;
      }

      filteredOrders.forEach(o => {
        if (o.paymentStatus === 'Paid') {
          const monthStr = format(new Date(o.createdAt), 'yyyy-MM');
          if (monthsMap[monthStr]) {
            monthsMap[monthStr].rev += o.finalAmount;
          }
        }
      });

      return Object.values(monthsMap);
    }
  }, [filteredOrders, dateInterval]);

  const maxChartRev = useMemo(() => {
    return Math.max(...chartData.map(d => d.rev), 1);
  }, [chartData]);

  // Helpers for badges/currencies
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const payBadge = (s: PaymentStatus) => ({ Paid: 'badge-green', Unpaid: 'badge-red', Partial: 'badge-yellow' }[s] || 'badge-gray');
  const statusBadge = (s: string) => ({ Pending: 'badge-yellow', 'In-Progress': 'badge-blue', Completed: 'badge-green', Delivered: 'badge-purple' }[s] || 'badge-gray');

  // Trigger browser print
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar 
          title="Revenue Report" 
          subtitle="Detailed breakdown of payments and cash flow"
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-glass btn-sm" onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Download size={14} /> Download CSV
              </button>
              <button className="btn btn-glass btn-sm" onClick={handlePrint}>
                <Printer size={14} /> Print Report
              </button>
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                <ArrowLeft size={14} /> Back to Dashboard
              </Link>
            </div>
          }
        />

        <div className="page-body fade-in">
          
          {/* Advanced Filter Interface */}
          <div className="card" style={{ marginBottom: 20, borderTop: '3px solid var(--primary-brand)' }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={16} style={{ color: 'var(--primary-brand)' }} />
                  Filter Transactions & Revenue
                </div>
                <div className="section-sub">Select a preset period, specific month, or custom date range</div>
              </div>
              <div className="tabs">
                <button 
                  className={`tab ${filterType === 'preset' ? 'active' : ''}`}
                  onClick={() => setFilterType('preset')}
                >
                  Presets
                </button>
                <button 
                  className={`tab ${filterType === 'month' ? 'active' : ''}`}
                  onClick={() => setFilterType('month')}
                >
                  By Month
                </button>
                <button 
                  className={`tab ${filterType === 'range' ? 'active' : ''}`}
                  onClick={() => setFilterType('range')}
                >
                  Date Range
                </button>
              </div>
            </div>

            {/* Filter Content */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {filterType === 'preset' && (
                <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
                  <label className="input-label">Select Timeframe Preset</label>
                  <select 
                    className="input" 
                    value={selectedPreset} 
                    onChange={e => setSelectedPreset(e.target.value as any)}
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months (Half Year)</option>
                    <option value="1year">Last 1 Year (Default)</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              )}

              {filterType === 'month' && (
                <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
                  <label className="input-label">Select Month ({new Date().getFullYear()})</label>
                  <select 
                    className="input" 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)}
                  >
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>
              )}

              {filterType === 'range' && (
                <>
                  <div className="input-group" style={{ flex: 1, minWidth: 150 }}>
                    <label className="input-label">Start Date</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1, minWidth: 150 }}>
                    <label className="input-label">End Date</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>
                </>
              )}

              <div style={{ paddingBottom: 2 }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  Period: {format(dateInterval.start, 'dd MMM yyyy')} to {format(dateInterval.end, 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Overview Cards */}
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            {/* Metric 1 */}
            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderColor: '#bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="kpi-label" style={{ color: 'var(--success)' }}>Total Revenue Paid</span>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={14} style={{ color: 'var(--success)' }} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#14532d' }}>{fmt(metrics.totalPaid)}</div>
              <div className="kpi-sub" style={{ color: '#166534' }}>From {metrics.countPaid} paid orders</div>
            </div>

            {/* Metric 2 */}
            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', borderColor: '#fef08a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="kpi-label" style={{ color: 'var(--warning)' }}>Pending Revenue</span>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={14} style={{ color: 'var(--warning)' }} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#78350f' }}>{fmt(metrics.totalPending)}</div>
              <div className="kpi-sub" style={{ color: '#92400e' }}>From {metrics.totalOrdersCount - metrics.countPaid} unpaid/partial orders</div>
            </div>

            {/* Metric 3 */}
            <div className="kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="kpi-label">Average Order Value</span>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={14} style={{ color: 'var(--primary-brand)' }} />
                </div>
              </div>
              <div className="kpi-value">{fmt(metrics.aov)}</div>
              <div className="kpi-sub">Average per paid invoice</div>
            </div>

            {/* Metric 4 */}
            <div className="kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="kpi-label">Total Transactions</span>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={14} style={{ color: '#475569' }} />
                </div>
              </div>
              <div className="kpi-value">{metrics.totalOrdersCount}</div>
              <div className="kpi-sub">Total orders in selected period</div>
            </div>
          </div>

          {/* Visual Breakdowns: Chart & Payments */}
          <div className="content-grid content-grid-2" style={{ marginBottom: 20 }}>
            {/* Dynamic CSS Bar Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <div className="section-title">Revenue Flow Trend</div>
                  <div className="section-sub">
                    Paid revenue broken down by {chartData.length > 12 && chartData[0].label.includes(' ') ? 'Day' : 'Period'}
                  </div>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No revenue data in this period
                </div>
              ) : (
                <div style={{ position: 'relative', height: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginTop: 10 }}>
                  {/* Grid lines */}
                  <div style={{ position: 'absolute', inset: '0 0 24px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                    <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                    <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                    <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                    <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%', height: 0 }} />
                  </div>
                  
                  {/* Columns */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: chartData.length > 20 ? 4 : 12, height: 150, zIndex: 1, position: 'relative', overflowX: 'auto', paddingBottom: 2 }}>
                    {chartData.map((d, i) => (
                      <div key={i} style={{ flex: 1, minWidth: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 650, whiteSpace: 'nowrap' }}>
                          {d.rev > 0 ? fmt(d.rev) : ''}
                        </span>
                        <div 
                          style={{
                            width: '100%',
                            borderRadius: '3px 3px 0 0',
                            background: d.rev > 0 ? 'var(--primary-brand)' : '#f1f5f9',
                            minHeight: 4,
                            height: `${(d.rev / maxChartRev) * 100}%`,
                            transition: 'height 0.4s ease',
                          }} 
                          title={`${d.label}: ${fmt(d.rev)}`}
                        />
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {d.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PieChart size={16} style={{ color: 'var(--primary-brand)' }} />
                    Payment Method Share
                  </div>
                  <div className="section-sub">Breakdown of total paid revenue (Total: {fmt(paymentBreakdown.total)})</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {([
                  { label: 'UPI', value: paymentBreakdown.values.UPI, pct: paymentBreakdown.percentages.UPI, color: 'var(--primary-brand)', light: 'var(--primary-brand-light)' },
                  { label: 'Cash', value: paymentBreakdown.values.Cash, pct: paymentBreakdown.percentages.Cash, color: 'var(--success)', light: 'var(--success-light)' },
                  { label: 'Card', value: paymentBreakdown.values.Card, pct: paymentBreakdown.percentages.Card, color: 'var(--purple)', light: 'var(--purple-light)' },
                  { label: 'Online', value: paymentBreakdown.values.Online, pct: paymentBreakdown.percentages.Online, color: 'var(--warning)', light: 'var(--warning-light)' }
                ]).map(({ label, value, pct, color, light }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        {label}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {fmt(value)} <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: color, 
                          borderRadius: 10, 
                          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions Table Log */}
          <div className="card">
            <div className="section-header" style={{ marginBottom: 18 }}>
              <div>
                <div className="section-title">Transactions Log</div>
                <div className="section-sub">Showing {sortedAndSearchedOrders.length} orders matching parameters</div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Sort By:</label>
                  <select 
                    className="input" 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value as any)}
                    style={{ padding: '6px 28px 6px 12px', fontSize: 12, height: 'auto', width: 'auto', borderRadius: 6 }}
                  >
                    <option value="newest">Newest Date</option>
                    <option value="oldest">Oldest Date</option>
                    <option value="highest">Highest Amount</option>
                    <option value="lowest">Lowest Amount</option>
                  </select>
                </div>
                <div className="search-bar">
                  <Search size={14} />
                  <input 
                    className="search-input" 
                    placeholder="Search ID, customer, mode..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: 220 }}
                  />
                </div>
              </div>
            </div>

            {sortedAndSearchedOrders.length === 0 ? (
              <div className="empty-state">
                <Search />
                <h3>No transactions match your search</h3>
                <p>Try clearing filters or search terms.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Details</th>
                      <th>Payment Status</th>
                      <th>Payment Method</th>
                      <th>Order Status</th>
                      <th>Date Logged</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndSearchedOrders.map((o: Order) => (
                      <tr key={o.id}>
                        <td>
                          <Link 
                            href={`/orders/${o.id}/invoice`} 
                            style={{ color: 'var(--primary-brand)', fontWeight: 750, textDecoration: 'none' }}
                          >
                            {o.orderId}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.customerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customerMobile}</div>
                        </td>
                        <td>
                          <span className={`badge ${payBadge(o.paymentStatus)}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                            {o.paymentMethod || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge(o.orderStatus)}`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {format(new Date(o.createdAt), 'dd MMM yyyy, hh:mm a')}
                        </td>
                        <td style={{ fontWeight: 750, color: 'var(--text-primary)' }}>
                          {fmt(o.finalAmount)}
                        </td>
                        <td>
                          <Link 
                            href={`/orders/${o.id}/invoice`} 
                            className="btn btn-glass btn-sm btn-icon"
                            style={{ display: 'inline-flex', padding: 4 }}
                            title="View Invoice"
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
      
      <style jsx global>{`
        @media print {
          .sidebar, .topbar, .btn, .search-bar, .tabs {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
          .page-body {
            padding: 0 !important;
            margin-top: 0 !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function RevenuePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading reports...</div>}>
      <RevenueContent />
    </Suspense>
  );
}
