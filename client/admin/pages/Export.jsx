import { useState, useEffect } from 'react';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineDocumentDownload, 
  HiOutlineFilter, 
  HiOutlineCalendar, 
  HiOutlineUsers, 
  HiOutlineTicket, 
  HiOutlineCreditCard, 
  HiOutlineClipboardCheck, 
  HiOutlineReceiptTax,
  HiOutlineSearch,
  HiOutlineArrowRight,
  HiOutlineClock
} from 'react-icons/hi';

const EXPORT_TYPES = [
  {
    key: 'participants',
    label: 'Participants',
    description: 'All registered participants with personal details, college, and year',
    icon: HiOutlineUsers,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    supportsEvent: true,
    supportsStatus: true,
    supportsDateRange: true,
    statusOptions: ['confirmed', 'pending', 'cancelled', 'waitlisted'],
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment records with transaction IDs, amounts, and statuses',
    icon: HiOutlineCreditCard,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
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
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    supportsEvent: false,
    supportsStatus: true,
    supportsDateRange: true,
    statusOptions: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    description: 'Checked-in participants (used tickets) with scan times',
    icon: HiOutlineClipboardCheck,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
    supportsEvent: true,
    supportsStatus: false,
    supportsDateRange: true,
    statusOptions: [],
  },
  {
    key: 'tickets',
    label: 'Tickets',
    description: 'All issued tickets with QR status and registration details',
    icon: HiOutlineTicket,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/30',
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
        toast('No data found for these filters', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
    } finally { setDownloading(false); }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-10 border-b border-white/[0.05]">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Data Export Nexus</h1>
          <p className="text-slate-500 font-medium text-sm">Configure and download participant data for external audit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Export Type Selection */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-2 mb-4">Export Target Specification</h3>
          <div className="space-y-3">
            {EXPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType?.key === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => { setSelectedType(type); setStatus(''); }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-900/40 text-white translate-x-1'
                      : 'bg-slate-900 border-white/[0.05] text-slate-400 hover:border-indigo-500/30 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-950 border border-white/[0.05] text-slate-500 group-hover:text-indigo-400'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm uppercase tracking-tight">{type.label}</p>
                      <p className={`text-[10px] mt-2 font-bold uppercase tracking-widest leading-relaxed ${isSelected ? 'text-white/70' : 'text-slate-600'}`}>{type.description}</p>
                    </div>
                  </div>
                  {isSelected && <HiOutlineArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Filters + Export */}
        <div className="lg:col-span-2">
          {!selectedType ? (
            <div className="card h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-slate-900/40 border-slate-700/30 backdrop-blur-xl border-dashed border-2">
              <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mb-6 text-slate-600">
                <HiOutlineSearch className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">Choose what to export</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Select a category from the left to configure your filters.</p>
            </div>
          ) : (
            <div className="card space-y-8 animate-scale-in bg-slate-900 border border-white/[0.05] p-10 relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] pointer-events-none"></div>

              <div className="flex items-center gap-6 pb-8 border-b border-white/[0.05]">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-xl shadow-indigo-900/40`}>
                  <selectedType.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight leading-none mb-2 capitalize">{selectedType.label} Configuration</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Apply filters to refine export query</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Event Filter */}
                {selectedType.supportsEvent && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <HiOutlineCalendar className="w-4 h-4 text-primary-400" /> Filter by Event
                    </label>
                    <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="input-field">
                      <option value="" className="bg-slate-900">All Events</option>
                      {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                {selectedType.supportsStatus && selectedType.statusOptions.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                       <HiOutlineFilter className="w-4 h-4 text-emerald-400" /> Filter by Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setStatus('')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          !status ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'
                        }`}
                      >All</button>
                      {selectedType.statusOptions.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(s)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all capitalize ${
                            status === s ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'
                          }`}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range */}
              {selectedType.supportsDateRange && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                     <HiOutlineClock className="w-4 h-4 text-amber-400" /> Filter by Date
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider ml-1">From</span>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider ml-1">To</span>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
                    </div>
                  </div>
                </div>
              )}

              {/* Format */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Format</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 transition-all group ${format === 'csv' ? 'border-primary-500 bg-primary-500/5' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}>
                    <input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} className="w-5 h-5 text-primary-500 focus:ring-primary-500/20 bg-slate-950 border-slate-700" />
                    <div>
                      <span className="text-sm font-bold text-white uppercase tracking-tight">CSV</span>
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mt-1">Comma-separated</p>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 transition-all group ${format === 'excel' ? 'border-primary-500 bg-primary-500/5' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}>
                    <input type="radio" name="format" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className="w-5 h-5 text-primary-500 focus:ring-primary-500/20 bg-slate-950 border-slate-700" />
                    <div>
                      <span className="text-sm font-bold text-white uppercase tracking-tight">Excel</span>
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mt-1">Native XLSX format</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Summary & Download */}
              <div className="pt-10 border-t border-white/[0.05]">
                <div className="bg-slate-950 rounded-2xl p-8 mb-10 border border-white/[0.05]">
                   <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-6">Execution Summary</h4>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-[10px]">
                     <div className="space-y-1.5"><span className="text-slate-700 font-bold uppercase block tracking-widest">Object Type</span><span className="text-white font-bold uppercase tracking-tight">{selectedType.label}</span></div>
                     <div className="space-y-1.5"><span className="text-slate-700 font-bold uppercase block tracking-widest">Target Scope</span><span className="text-white font-bold uppercase tracking-tight truncate max-w-[100px] block">{selectedEvent ? events.find((e) => e._id === selectedEvent)?.title : 'Global Alpha'}</span></div>
                     <div className="space-y-1.5"><span className="text-slate-700 font-bold uppercase block tracking-widest">Audit Status</span><span className="text-white font-bold uppercase tracking-tight capitalize">{status || 'Unfiltered'}</span></div>
                     <div className="space-y-1.5"><span className="text-slate-700 font-bold uppercase block tracking-widest">Temporal Range</span><span className="text-white font-bold uppercase tracking-tight">{dateFrom || dateTo ? `${dateFrom || '...'} → ${dateTo || '...'}` : 'Archival History'}</span></div>
                   </div>
                </div>
                <button
                  onClick={download}
                  disabled={downloading}
                  className="btn-primary w-full py-5 text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {downloading ? (
                    <><HiOutlineClock className="w-5 h-5 animate-spin" /> EXECUTING EXPORT...</>
                  ) : (
                    <><HiOutlineDocumentDownload className="w-6 h-6" /> Download {selectedType.label} Nexus (.{format === 'excel' ? 'xlsx' : 'csv'})</>
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
