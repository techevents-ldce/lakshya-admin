import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineDocumentDownload } from 'react-icons/hi';

export default function Export() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [format, setFormat] = useState('csv');

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events)).catch(() => {});
  }, []);

  const download = async (type) => {
    try {
      const params = { format };
      if (selectedEvent) params.eventId = selectedEvent;
      const url = type === 'participants' ? '/export/participants' : '/export/payments';
      const { data } = await api.get(url, { params, responseType: 'blob' });
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${type}_export.${extension}`;
      link.click();
      toast.success(`${type} exported`);
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
        toast('No data available to export', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Data Export</h1>
      <div className="card max-w-xl space-y-6">
        <div>
          <label className="label">Event (optional — leave blank for all)</label>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="input-field">
            <option value="">All Events</option>
            {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} className="text-primary-600" /> CSV</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="format" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className="text-primary-600" /> Excel</label>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button onClick={() => download('participants')} className="btn-primary flex items-center gap-2"><HiOutlineDocumentDownload className="w-5 h-5" /> Export Participants</button>
          <button onClick={() => download('payments')} className="btn-secondary flex items-center gap-2"><HiOutlineDocumentDownload className="w-5 h-5" /> Export Payments</button>
        </div>
      </div>
    </div>
  );
}
