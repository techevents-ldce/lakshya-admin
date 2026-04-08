import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineDocumentDownload, HiOutlineFilter, HiOutlineCalendar, HiOutlineUsers, HiOutlineTicket, HiOutlineCreditCard, HiOutlineClipboardCheck, HiOutlineReceiptTax } from 'react-icons/hi';

const EXPORT_TYPES = [
  {
    key: 'participants',
    label: 'Participants',
    description: 'All registered participants with personal details, college, branch, year',
    icon: HiOutlineUsers,
    color: 'bg-blue-500',
    supportsEvent: true,
    supportsStatus: true,
    supportsDateRange: true,
    statusOptions: ['confirmed', 'pending', 'cancelled', 'waitlisted'],
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment records with transaction IDs, amounts, statuses',
    icon: HiOutlineCreditCard,
    color: 'bg-emerald-500',
    supportsEvent: true,
    supportsStatus: true,
    supportsDateRange: true,
    statusOptions: ['pending', 'completed', 'failed', 'refunded'],
  },
  {
    key: 'orders',
    label: 'Orders',
    description: 'Full order data with Razorpay IDs for reconciliation',
    icon: HiOutlineReceiptTax,
    color: 'bg-purple-500',
    supportsEvent: false,
    supportsStatus: true,
    supportsDateRange: true,
    statusOptions: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    description: 'Checked-in participants (used tickets) with timestamps',
    icon: HiOutlineClipboardCheck,
    color: 'bg-teal-500',
    supportsEvent: true,
    supportsStatus: false,
    supportsDateRange: true,
    statusOptions: [],
  },
  {
    key: 'tickets',
    label: 'Tickets',
    description: 'All issued tickets with QR status and scan times',
    icon: HiOutlineTicket,
    color: 'bg-indigo-500',
    supportsEvent: true,
    supportsStatus: true,
    supportsDateRange: true,
    statusOptions: ['valid', 'used', 'cancelled'],
  },
];

export default function Export() {
  const [events, setEvents] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [format, setFormat] = useState('csv');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events || [])).catch(() => {});
  }, []);

  const download = async () => {
    if (!selectedType) { toast.error('Select an export type'); return; }
    setDownloading(true);
    try {
      const params = { format };
      if (selectedEvent) params.eventId = selectedEvent;
      if (status) params.status = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const url = `/export/${selectedType.key}`;
      const { data } = await api.get(url, { params, responseType: 'blob' });
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const eventName = selectedEvent ? events.find((e) => e._id === selectedEvent)?.title?.replace(/\s/g, '_') : 'all';
      link.download = `${selectedType.key}_${eventName}_${new Date().toISOString().split('T')[0]}.${extension}`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`${selectedType.label} exported successfully`);
    } catch (err) {
      let msg = 'Export failed';
      let isNoData = false;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) msg = json.message;
          if (err.response.status === 404) isNoData = true;
        } catch { /* use default message */ }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
        if (err.response.status === 404) isNoData = true;
      }
      if (isNoData) {
        toast('No data available matching your filters', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
    } finally { setDownloading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Data Export</h1>
        <p className="text-sm text-gray-500 mt-1">Export filtered data as CSV or Excel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Export Type Selection */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Data Type</h3>
          <div className="space-y-2">
            {EXPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType?.key === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => { setSelectedType(type); setStatus(''); }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${type.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>{type.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Filters + Export */}
        <div className="lg:col-span-2">
          {!selectedType ? (
            <div className="card text-center py-16 text-gray-400">
              <HiOutlineFilter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">Select a data type to configure filters</p>
              <p className="text-sm mt-1">Choose from the options on the left to get started</p>
            </div>
          ) : (
            <div className="card space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className={`${selectedType.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                  <selectedType.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Export {selectedType.label}</h3>
                  <p className="text-xs text-gray-500">{selectedType.description}</p>
                </div>
              </div>

              {/* Event Filter */}
              {selectedType.supportsEvent && (
                <div>
                  <label className="label flex items-center gap-1.5">
                    <HiOutlineCalendar className="w-4 h-4 text-gray-400" /> Event
                  </label>
                  <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="input-field">
                    <option value="">All Events</option>
                    {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Leave blank to export data for all events</p>
                </div>
              )}

              {/* Status Filter */}
              {selectedType.supportsStatus && selectedType.statusOptions.length > 0 && (
                <div>
                  <label className="label">Status Filter</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatus('')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        !status ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >All</button>
                    {selectedType.statusOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                          status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              {selectedType.supportsDateRange && (
                <div>
                  <label className="label">Date Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">From</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">To</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave blank for all-time data</p>
                </div>
              )}

              {/* Format */}
              <div>
                <label className="label">Format</label>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border-2 transition-colors ${format === 'csv' ? 'border-primary-500 bg-primary-50' : 'border-gray-100'}`}>
                    <input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} className="text-primary-600" />
                    <div><span className="text-sm font-medium">CSV</span><p className="text-[10px] text-gray-400">Comma-separated (opens in any spreadsheet)</p></div>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border-2 transition-colors ${format === 'excel' ? 'border-primary-500 bg-primary-50' : 'border-gray-100'}`}>
                    <input type="radio" name="format" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className="text-primary-600" />
                    <div><span className="text-sm font-medium">Excel</span><p className="text-[10px] text-gray-400">Native .xlsx with formatted columns</p></div>
                  </label>
                </div>
              </div>

              {/* Summary & Download */}
              <div className="pt-4 border-t border-gray-100">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Export Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-400 text-xs block">Type</span><span className="font-medium">{selectedType.label}</span></div>
                    <div><span className="text-gray-400 text-xs block">Event</span><span className="font-medium">{selectedEvent ? events.find((e) => e._id === selectedEvent)?.title : 'All'}</span></div>
                    <div><span className="text-gray-400 text-xs block">Status</span><span className="font-medium capitalize">{status || 'All'}</span></div>
                    <div><span className="text-gray-400 text-xs block">Date</span><span className="font-medium">{dateFrom || dateTo ? `${dateFrom || '...'} → ${dateTo || '...'}` : 'All time'}</span></div>
                  </div>
                </div>
                <button
                  onClick={download}
                  disabled={downloading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Exporting...</>
                  ) : (
                    <><HiOutlineDocumentDownload className="w-5 h-5" /> Export {selectedType.label} ({format.toUpperCase()})</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
