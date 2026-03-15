import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineArrowLeft, HiOutlineDocumentDownload } from 'react-icons/hi';

export default function Participants() {
  const { id: eventId } = useParams();
  const [regs, setRegs] = useState([]);
  const [eventTitle, setEventTitle] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => setEventTitle(data.data.title)).catch(() => {});
  }, [eventId]);

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/registrations', { params: { eventId, page, limit: 20 } });
      setRegs(data.registrations);
      setTotalPages(data.pages);
    } catch { toast.error('Failed to load participants'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRegs(); }, [eventId, page]);

  const filtered = search
    ? regs.filter((r) =>
        r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : regs;

  const handleExport = async (format) => {
    try {
      const { data } = await api.get('/export/participants', { params: { eventId, format }, responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `participants_${eventId}.${ext}`;
      link.click();
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Events
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Participants</h1>
          <p className="text-sm text-gray-500 mt-1">{eventTitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-accent-outline text-xs px-3 py-1.5 flex items-center gap-1"><HiOutlineDocumentDownload className="w-4 h-4" /> CSV</button>
          <button onClick={() => handleExport('excel')} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1"><HiOutlineDocumentDownload className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="relative mb-6 w-full sm:max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Search participants..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3 hidden sm:table-cell">Phone</th><th className="px-5 py-3 hidden sm:table-cell">College</th><th className="px-5 py-3">Status</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{r.userId?.name}</td>
                  <td className="px-5 py-3 text-gray-500">{r.userId?.email}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.userId?.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.userId?.college || '—'}</td>
                  <td className="px-5 py-3"><span className={`badge ${r.status === 'confirmed' ? 'badge-green' : r.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>{r.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-400">No participants found</td></tr>}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-accent-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
