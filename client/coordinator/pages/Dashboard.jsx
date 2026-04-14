import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineUsers, HiOutlineQrcode, HiOutlineDocumentDownload, HiOutlineUserGroup, HiOutlineClipboardCheck, HiOutlineRefresh } from 'react-icons/hi';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const { data } = await api.get('/users/me/profile');
        const user = data.data;
        setEvents(user.assignedEvents || []);
      } catch (err) {
        toast.error('Failed to load events');
      } finally { setLoading(false); }
    };
    fetchAssigned();
  }, []);

  if (loading) return (
    <div className="animate-fade-in space-y-8 bg-[#0F1117] min-h-[500px]">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight leading-none mb-2">My Assigned Events</h1>
          <p className="text-[#94A3B8] font-medium text-sm">Manage participants and verify tickets for your events</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A1D27] rounded-2xl p-6 border border-[#2E3348] animate-pulse shadow-sm">
            <div className="h-7 bg-[#2E3348] rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-[#2E3348] rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="h-20 bg-[#22263A] rounded-xl border border-[#2E3348]"></div>
              <div className="h-20 bg-[#22263A] rounded-xl border border-[#2E3348]"></div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="h-[52px] bg-[#22263A] rounded-xl border border-[#2E3348]"></div>
                <div className="h-[52px] bg-[#22263A] rounded-xl border border-[#2E3348]"></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-[52px] bg-[#22263A] rounded-xl border border-[#2E3348] col-span-2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-8 min-h-[500px]">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight leading-none mb-2">My Assigned Events</h1>
          <p className="text-[#94A3B8] font-medium text-sm">Manage participants and verify tickets for your events</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-[#1A1D27] rounded-3xl text-center py-24 border border-[#2E3348] shadow-sm flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-[#22263A] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2E3348]">
            <HiOutlineDocumentDownload className="w-12 h-12 text-[#94A3B8]" />
          </div>
          <p className="text-[#F1F5F9] text-xl font-bold mb-2">No events assigned yet</p>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-sm mx-auto">You haven't been assigned any events to coordinate. Contact your administrator to get started.</p>
          <button className="bg-[#3B82F6] hover:bg-blue-600 focus:ring-4 focus:ring-[#3B82F6]/50 outline-none text-[#F1F5F9] font-semibold flex items-center justify-center gap-2 py-3 px-8 mx-auto rounded-xl shadow-sm transition-all duration-150">
            Contact Admin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {events.map((ev) => (
            <div key={ev._id} className="bg-[#1A1D27] flex flex-col h-full border border-[#2E3348] rounded-2xl relative overflow-hidden group hover:border-[#6366F1] hover:shadow-lg transition-all shadow-sm">
              <div 
                className="absolute top-0 left-0 w-full h-1 z-20"
                style={{ backgroundColor: ev.color || '#3B82F6' }}
              />
              <div className="p-6 flex-1 flex flex-col pt-8">
                <div className="flex items-start justify-between mb-6 relative z-10 gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xl text-[#F1F5F9] group-hover:text-[#3B82F6] transition-colors tracking-tight leading-tight mb-2 line-clamp-2">{ev.title}</h3>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest truncate">{ev.category || 'General'} <span className="opacity-50 mx-1">·</span> {ev.eventType}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${ev.isRegistrationOpen ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                    {ev.isRegistrationOpen ? 'Registration Open' : 'Closed'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                  <div className="bg-[#22263A] border border-[#2E3348] rounded-xl p-4">
                    <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Capacity</p>
                    <p className="font-bold text-[#F1F5F9] text-lg">{ev.capacity}</p>
                  </div>
                  <div className="bg-[#22263A] border border-[#2E3348] rounded-xl p-4">
                    <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Fee</p>
                    <p className="font-bold text-[#F1F5F9] text-lg">{ev.isPaid ? `₹${ev.registrationFee}` : 'Free'}</p>
                  </div>
                </div>

                <div className="mt-auto space-y-3 relative z-10">
                  <div className="grid grid-cols-2 gap-3">
                    <Link to={`/events/${ev._id}/participants`} className="bg-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/50 outline-none text-[#F1F5F9] hover:bg-[#2563EB] transition-colors duration-150 rounded-xl py-3 font-semibold text-[13px] flex items-center justify-center gap-2">
                      <HiOutlineUsers className="w-[18px] h-[18px]" /> Participants
                    </Link>
                    <Link to={`/events/${ev._id}/scan`} className="bg-[#6366F1] focus:ring-4 focus:ring-[#6366F1]/50 outline-none text-[#F1F5F9] hover:bg-[#4f46e5] transition-colors duration-150 rounded-xl py-3 font-semibold text-[13px] flex items-center justify-center gap-2">
                      <HiOutlineQrcode className="w-[18px] h-[18px]" /> Scan QR
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ev.eventType === 'team' && (
                      <Link to={`/events/${ev._id}/teams`} className="bg-[#A855F7] focus:ring-4 focus:ring-[#A855F7]/50 outline-none hover:bg-[#9333EA] text-[#F1F5F9] transition-colors duration-150 rounded-xl py-3 font-semibold text-[13px] flex items-center justify-center gap-2 col-span-2 sm:col-span-1">
                        <HiOutlineUserGroup className="w-[18px] h-[18px]" /> Teams
                      </Link>
                    )}
                    <Link to={`/events/${ev._id}/attendance`} className={`bg-[#22C55E] focus:ring-4 focus:ring-[#22C55E]/50 outline-none hover:bg-[#16A34A] text-[#F1F5F9] transition-colors duration-150 rounded-xl py-3 font-semibold text-[13px] flex items-center justify-center gap-2 ${ev.eventType === 'team' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}`}>
                      <HiOutlineClipboardCheck className="w-[18px] h-[18px]" /> Attendance
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
