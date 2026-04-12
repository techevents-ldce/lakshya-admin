import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../../src/components/ConfirmWithPassword';
import {
  HiOutlineMail,
  HiOutlineSearch,
  HiOutlineEye,
  HiOutlinePaperAirplane,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineStar,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineUpload,
  HiOutlineClipboardList,
  HiOutlineInformationCircle,
  HiOutlineSpeakerphone,
  HiOutlineUserGroup,
} from 'react-icons/hi';


const TEMPLATE_OPTIONS = [
  { id: 'raw', label: 'Raw', icon: HiOutlineDocumentText, desc: 'Plain text email' },
  { id: 'success', label: 'Success', icon: HiOutlineCheckCircle, desc: 'Green success theme' },
  { id: 'congratulations', label: 'Congrats', icon: HiOutlineStar, desc: 'Celebratory theme' },
  { id: 'important', label: 'Important', icon: HiOutlineExclamation, desc: 'Warning/alert theme' },
  { id: 'formal', label: 'Formal', icon: HiOutlineShieldCheck, desc: 'Professional dark theme' },
  { id: 'marketing', label: 'HOD Invite', icon: HiOutlineSpeakerphone, desc: 'Marketing theme for HODs' },
  { id: 'club', label: 'Club Invite', icon: HiOutlineUserGroup, desc: 'Dark theme for Clubs' },
];


const SENDER_OPTIONS = [
  { value: 'updates', label: 'Lakshya Updates', email: 'updates@notify.lakshyaldce.in' },
  { value: 'events', label: 'Lakshya Events', email: 'events@notify.lakshyaldce.in' },
  { value: 'tarkshaastra', label: 'Tarkshaastra', email: 'tarkshaastra@notify.lakshyaldce.in' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admins' },
  { value: 'coordinator', label: 'Coordinators' },
  { value: 'participant', label: 'Participants' },
];

export default function BulkEmail() {
  const navigate = useNavigate();

  // ─── Target filters ──────────────────────────────────────────────────────────
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [manualEmails, setManualEmails] = useState('');

  // ─── File upload ─────────────────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Compose ──────────────────────────────────────────────────────────────────
  const [template, setTemplate] = useState('raw');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderIdentity, setSenderIdentity] = useState('updates');

  // ─── UI state ─────────────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // ─── User search ──────────────────────────────────────────────────────────────
  const searchUsers = useCallback(async (term) => {
    if (!term || term.length < 2) { setUserResults([]); return; }
    try {
      const { data } = await api.get('/mail/recipients', { params: { search: term } });
      setUserResults(data.data || []);
    } catch { setUserResults([]); }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(timeout);
  }, [userSearch, searchUsers]);

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const addUser = (user) => {
    if (!selectedUsers.find((u) => u._id === user._id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setUserSearch('');
    setUserResults([]);
  };

  const removeUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  // ─── File Upload Handler ──────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/mail/upload-recipients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadPreview(data.data);
      toast.success(`Parsed ${data.data.validCount} valid emails`);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to parse file');
      setUploadedFile(null);
      setUploadPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Smart link label resolver ────────────────────────────────────────────────
  const getSmartLabel = (url) => {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      if (hostname.includes('unstop.com')) return 'Register Now';
      if (hostname.includes('drive.google.com')) return 'Download Brochure';
      return hostname;
    } catch { return url; }
  };

  // ─── Body Processor (linkify URLs + preserve whitespace) ─────────────────────
  const processBody = (text) => {
    if (!text) return '<span style="color:#94a3b8;">(message body)</span>';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(
      /https?:\/\/[^\s<>"']+/gi,
      (url) => {
        const label = getSmartLabel(url);
        return `</span><a href="${url}" target="_blank" style="display:inline-block;padding:8px 20px;background:#2563eb;color:#ffffff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin:4px 0;">${label} →</a><span>`;
      }
    );
    html = html.replace(/Lakshya 2\.0/gi, 'Lakshya&nbsp;2.0');
    html = html.replace(/Tark Shaastra/gi, 'Tark&nbsp;Shaastra');
    html = html.replace(/L\.D\. College of Engineering/gi, 'L.D.&nbsp;College&nbsp;of&nbsp;Engineering');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/ {2}/g, '&nbsp;&nbsp;');
    return `<span>${html}</span>`;
  };

  // ─── Preview HTML ─────────────────────────────────────────────────────────────
  const getPreviewHtml = () => {
    const baseLayout = (content) => `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
        <!-- Brand Header -->
        <div style="background-color: #ffffff; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <img src="/mail-head.png" alt="Lakshya" style="display: block; width: 100%; max-width: 600px; height: auto; border: none; margin: 0 auto;" />
        </div>

        <!-- Main Content Area -->
        <div style="padding: 48px 40px; color: #334155; line-height: 1.8; font-size: 15px;">
          <div style="margin-bottom: 32px;">
            ${content}
          </div>
        </div>

        <!-- Branded Footer -->
        <div style="background: linear-gradient(135deg, #F5A623 0%, #4DD9E8 50%, #1A8C8C 100%); padding: 32px 32px; text-align: center;">
          <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Team Lakshya</p>
          <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.85); font-size: 13px;">L.D. College of Engineering, Ahmedabad – 380015</p>
          <a href="https://lakshyaldce.in" target="_blank" style="color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; opacity: 0.95;">lakshyaldce.in</a>
        </div>
      </div>
    `;

    let headerHtml = '';
    const sampleRecipient = uploadPreview?.validEmails?.find(e => e.name || e.department || e.college || e.clubName);
    
    if (template === 'club') {
      const hasUpload = uploadPreview?.validEmails?.length > 0;
      if (sampleRecipient?.clubName) {
        const collegeText = sampleRecipient?.college ? `<span style="font-size:13px;color:#64748b;">${sampleRecipient.college}</span><br>` : '';
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;"><strong>${sampleRecipient.clubName}</strong><br>${collegeText}</p>`;
      } else if (hasUpload && sampleRecipient?.college) {
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;"><strong>[Club Name missing]</strong><br><span style="font-size:13px;color:#64748b;">${sampleRecipient.college}</span><br></p>`;
      } else {
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; opacity: 0.6; font-style: italic;">[Upload list to see name]<br><strong>{Club Name}</strong><br><span style="font-size:13px;color:#64748b;">{College / Institution Name}</span><br></p>`;
      }
    } else if (template === 'marketing') {
      if (sampleRecipient) {
        const deptText = sampleRecipient.department ? `Department of ${sampleRecipient.department}<br>` : '';
        const collegeText = sampleRecipient.college ? `${sampleRecipient.college}<br>` : '';
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear Head of Department,<br>${deptText}${collegeText}</p>`;
      } else if (!uploadPreview?.validEmails?.length) {
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; opacity: 0.6; font-style: italic;">[Auto-generated] Dear Head of Department,<br>{College / Institution Name}</p>`;
      }
    } else {
      if (sampleRecipient) {
        if (template === 'formal') {
          if (sampleRecipient.name) {
            const collegeText = sampleRecipient.college ? `<br><span style="font-size:13px;color:#64748b;">${sampleRecipient.college}</span>` : '';
            headerHtml = `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Dear ${sampleRecipient.name},${collegeText}</p>`;
          } else if (sampleRecipient.clubName) {
            const collegeText = sampleRecipient.college ? `<br><span style="font-size:13px;color:#64748b;">${sampleRecipient.college}</span>` : '';
            headerHtml = `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b;">Dear ${sampleRecipient.clubName} Team,${collegeText}</p>`;
          } else if (sampleRecipient.department) {
            const collegeText = sampleRecipient.college ? `<br><span style="font-size:13px;color:#64748b;">${sampleRecipient.college}</span>` : '';
            headerHtml = `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b;">Dear Head of Department,<br><span style="font-size:13px;color:#64748b;">Department of ${sampleRecipient.department}</span>${collegeText}</p>`;
          } else if (sampleRecipient.college) {
            headerHtml = `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b;">Respected Sir/Ma'am,<br><span style="font-size:13px;color:#64748b;">${sampleRecipient.college}</span></p>`;
          } else {
            headerHtml = `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b;">Respected Sir/Ma'am,</p>`;
          }
        } else if (sampleRecipient.clubName) {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${sampleRecipient.clubName} Team,</p>`;
        } else if (sampleRecipient.department) {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear Head of Department,<br>Department of ${sampleRecipient.department}</p>`;
        } else if (sampleRecipient.name) {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${sampleRecipient.name},</p>`;
        } else {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Respected Sir/Ma'am,</p>`;
        }
      } else if (!uploadPreview?.validEmails?.length) {
        if (template === 'formal') {
          headerHtml = `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; opacity: 0.6; font-style: italic;">[Preview] Dear {Name},</p>`;
        } else {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; opacity: 0.6; font-style: italic;">[Preview] Respected Sir/Ma'am,</p>`;
        }
      }
    }

    const pb = processBody(body);
    const standardContent = headerHtml + pb;
    const s = subject || '(subject)';
    
    const templateMap = {
      raw: baseLayout(`<div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      success: baseLayout(`<h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${s}</h2><div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      congratulations: baseLayout(`<h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${s}</h2><div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      important: baseLayout(`<div style="border-left: 4px solid #dc2626; padding-left: 20px; margin-bottom: 32px;"><p style="margin: 0 0 6px 0; font-weight: 700; color: #dc2626; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Important Notice</p><h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${s}</h2></div><div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      formal: (() => {
        const divider = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">`;
        return baseLayout(`<h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center; letter-spacing: -0.3px;">${s}</h2>${divider}<div style="margin: 0 0 32px 0; line-height: 1.8; color: #1e293b;">${headerHtml}${pb}</div>`);
      })(),
      marketing: baseLayout(`<h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center;">${s}</h2><div style="margin: 0 0 32px 0; line-height: 1.7;">${standardContent}</div>`),
      club: baseLayout(`<h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center;">${s}</h2><div style="margin: 0 0 32px 0; line-height: 1.7;">${headerHtml}${pb}</div>`),
    };
    return templateMap[template] || templateMap.raw;
  };


  // ─── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = async (password) => {
    setSending(true);
    try {
      const manualList = manualEmails.split(',').map((e) => e.trim()).filter(Boolean);

      const recipients = [
        ...selectedUsers.map((u) => ({ email: u.email, name: u.name, college: '', department: '', clubName: '' })),
        ...manualList.map((email) => ({ email, name: '', college: '', department: '', clubName: '' })),
        ...(uploadPreview?.validEmails || []),
      ];

      const sourceType = uploadPreview ? 'excel_upload' : 'manual_selection';

      const { data } = await api.post('/mail/jobs', {
        subject,
        body,
        template,
        recipients,
        roles: selectedRoles,
        adminPassword: password,
        senderIdentity,
        sourceType,
      });

      toast.success(data.message || 'Bulk email job created!');

      if (data.data?.jobId) {
        navigate(`/bulk-email/jobs/${data.data.jobId}`);
      } else {
        navigate('/bulk-email/jobs');
      }
    } catch (err) {
      toast.error(err.userMessage || 'Failed to create email job');
      throw err;
    } finally {
      setSending(false);
    }
  };

  // ─── Computed ─────────────────────────────────────────────────────────────────
  const manualCount = manualEmails.split(',').map((e) => e.trim()).filter(Boolean).length;
  const uploadCount = uploadPreview?.validCount || 0;
  const individualCount = selectedUsers.length + manualCount + uploadCount;
  const hasRecipients = selectedRoles.length > 0 || individualCount > 0;
  const canSend = hasRecipients && subject.trim() && body.trim();

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Bulk Email</h1>
          <p className="text-slate-500 font-medium">Send mass emails to coordinators, participants, or uploaded lists</p>
        </div>
        <button
          onClick={() => navigate('/bulk-email/jobs')}
          className="btn-outline flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] self-start"
        >
          <HiOutlineClipboardList className="w-5 h-5 text-primary-400" /> Job History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── LEFT: Target Filters ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Roles */}
          <div className="card border-slate-700/30">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               Target Roles
            </h2>
            <div className="space-y-3">
              {ROLE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-primary-500/20 transition-all">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(value)}
                    onChange={() => toggleRole(value)}
                    className="w-5 h-5 rounded-lg border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500/20"
                  />
                  <span className="text-[11px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors">{label} Layer</span>
                </label>
              ))}
            </div>
          </div>

          {/* Individual Users */}
          <div className="card border-slate-700/30">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               Selected Users
            </h2>
            <div className="relative mb-4">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input-field pl-10 py-3 text-[10px] font-bold uppercase tracking-widest bg-slate-900/50 border-slate-700/50"
              />
              {userResults.length > 0 && (
                <div className="absolute z-20 top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-56 overflow-hidden overflow-y-auto backdrop-blur-xl divide-y divide-slate-800">
                  {userResults.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => addUser(u)}
                      className="w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-all flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-white uppercase truncate">{u.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold truncate tracking-tight">{u.email}</p>
                      </div>
                      <span className="text-[8px] font-black text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded uppercase tracking-widest">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                {selectedUsers.map((u) => (
                  <span key={u._id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-xl text-[9px] font-black uppercase tracking-widest">
                    {u.name || u.email.split('@')[0]}
                    <button onClick={() => removeUser(u._id)} className="hover:text-white transition-colors">
                      <HiOutlineX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Manual Emails */}
          <div className="card border-slate-700/30">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               Manual Email List
            </h2>
            <textarea
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              placeholder="user1@example.com, user2@example.com..."
              rows={3}
              className="input-field py-3 text-[10px] font-bold bg-slate-900/50 border-slate-700/50 resize-none h-24"
            />
            {manualCount > 0 && (
              <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">{manualCount} emails added</p>
            )}
          </div>

          {/* File Upload */}
          <div className="card border-slate-700/30 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 blur-[40px] pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                 Upload Recipient List
              </h2>
              <div className="group relative">
                <HiOutlineInformationCircle className="w-4 h-4 text-slate-600 cursor-help" />
                <div className="absolute right-0 bottom-full mb-3 w-72 p-4 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 backdrop-blur-xl">
                  <p className="text-primary-400 font-black uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Instructions:</p>
                  <ul className="list-disc pl-4 space-y-2 uppercase tracking-tight text-slate-400">
                    <li>Required headers: <span className="text-white">Email</span></li>
                    <li>Optional columns: <span className="text-white">Name, College, Dept, Club</span></li>
                    <li>Personalized placeholders supported</li>
                    <li>Formats: .csv, .xlsx, .xls (Max 5MB)</li>
                  </ul>
                </div>
              </div>
            </div>
            {!uploadPreview ? (
              <div className="animate-fade-in">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                    uploading ? 'border-primary-500/50 bg-primary-500/5' : 'border-slate-800 hover:border-primary-500/30 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-600 mb-3 group-hover:text-primary-400 group-hover:bg-primary-500/10 transition-all ${uploading ? 'animate-pulse text-primary-500 bg-primary-500/10' : ''}`}>
                    <HiOutlineUpload className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {uploading ? 'PROCESSING...' : 'Upload List File'}
                  </span>
                  <span className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-tight">XLSX / CSV / XLS</span>
                </label>
              </div>
            ) : (
              <div className="space-y-4 animate-scale-in">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-white uppercase truncate tracking-tight">{uploadedFile?.name}</p>
                     <p className="text-[8px] text-slate-600 font-bold uppercase mt-0.5">File Processed</p>
                  </div>
                  <button onClick={clearUpload} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all flex items-center justify-center">
                    <HiOutlineX className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-emerald-400">{uploadPreview.validCount}</p>
                    <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mt-1">Valid</p>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-red-400">{uploadPreview.invalidCount}</p>
                    <p className="text-[8px] text-red-600 font-black uppercase tracking-widest mt-1">Faulty</p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-amber-400">{uploadPreview.duplicateCount}</p>
                    <p className="text-[8px] text-amber-600 font-black uppercase tracking-widest mt-1">Duplicates</p>
                  </div>
                </div>
                {uploadPreview.validEmails?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Processed Emails ({uploadPreview.validEmails.length})</p>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {uploadPreview.validEmails.map((item) => (
                        <div key={item.email} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl group hover:border-primary-500/20 transition-all">
                          <div className="min-w-0">
                            {(item.name || item.clubName || item.college) && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {item.name && <span className="text-[9px] font-black text-white uppercase truncate">{item.name}</span>}
                                {item.clubName && <span className="text-[8px] font-black text-primary-400 uppercase truncate">· {item.clubName}</span>}
                                {item.college && <span className="text-[7px] text-slate-600 font-bold uppercase truncate">@ {item.college}</span>}
                              </div>
                            )}
                            <span className="text-[8px] text-slate-500 font-mono truncate block group-hover:text-slate-400 transition-colors uppercase tracking-tight">{item.email}</span>
                          </div>
                          <button
                            onClick={() => {
                              setUploadPreview((prev) => ({
                                ...prev,
                                validEmails: prev.validEmails.filter((e) => e.email !== item.email),
                                validCount: prev.validCount - 1,
                              }));
                            }}
                            className="w-6 h-6 rounded-lg bg-slate-900 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex items-center justify-center"
                          >
                            <HiOutlineX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Compose Area ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sender Details */}
          <div className="card border-slate-700/30">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               Sender Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSenderIdentity(opt.value)}
                  className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${
                    senderIdentity === opt.value
                      ? 'border-primary-500 bg-primary-50/5 text-white'
                      : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {senderIdentity === opt.value && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary-500/10 blur-xl"></div>
                  )}
                  <span className="font-black text-[11px] mb-1.5 uppercase tracking-widest">{opt.label}</span>
                  <span className="text-[9px] font-bold opacity-60 tracking-tight lowercase">{opt.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email Template */}
          <div className="card border-slate-700/30">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               Email Template
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
              {TEMPLATE_OPTIONS.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setTemplate(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 text-center group ${
                    template === id
                      ? 'border-primary-500 bg-primary-50/5 text-white'
                      : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                  }`}
                  title={desc}
                >
                  <Icon className={`w-6 h-6 transition-all ${template === id ? 'text-primary-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject & Body */}
          <div className="card border-slate-700/30 space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="input-field py-4 text-base font-black tracking-tight bg-slate-900/50 border-slate-700/50 focus:border-primary-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 block">Email Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  (template === 'club' || template === 'marketing')
                    ? 'Write your message... (Salutation handled automatically)'
                    : 'Write your message...'
                }
                rows={12}
                className="input-field py-4 text-sm font-bold bg-slate-900/50 border-slate-700/50 resize-none custom-scrollbar"
              />
              
              <div className="animate-fade-in pt-2">
                {template === 'club' && !uploadPreview && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-pulse">
                    <HiOutlineExclamation className="w-5 h-5 flex-shrink-0 text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-200 uppercase tracking-tight leading-relaxed">
                      <strong>Note:</strong> Upload list first to enable automatic personalization for clubs/colleges.
                    </p>
                  </div>
                )}
                {template === 'club' && uploadPreview && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                    <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-tight leading-relaxed">
                      <strong>Personalization Active</strong> — Names and club titles will be automatically inserted into each email.
                    </p>
                  </div>
                )}
                {template === 'formal' && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-500/5 border border-primary-500/20">
                    <HiOutlineInformationCircle className="w-5 h-5 flex-shrink-0 text-primary-400" />
                    <p className="text-[10px] font-bold text-primary-200 uppercase tracking-tight leading-relaxed">
                      <strong>Automatic Salutations</strong> — Uses names if available, otherwise defaults to &quot;Respected Sir/Ma&apos;am&quot;.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button
              onClick={() => setPreviewOpen(true)}
              disabled={!body.trim()}
              className="btn-outline flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              <HiOutlineEye className="w-5 h-5" /> Preview Email
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || sending}
              className="btn-primary flex-[2] py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-900/40 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              <HiOutlinePaperAirplane className="w-5 h-5" /> 
              {sending ? 'SENDING...' : 'SEND BULK MAIL'}
            </button>
            {hasRecipients && (
              <div className="px-5 py-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest hidden lg:block">
                {individualCount > 0 && `${individualCount} RECIPIENT${individualCount !== 1 ? 'S' : ''} SELECTED`}
                {selectedRoles.length > 0 && ` ${individualCount > 0 ? '& ' : ''}ALL ${selectedRoles.join(', ')} ROLES`}
              </div>
            )}
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/50">
            <HiOutlineShieldCheck className="w-5 h-5 flex-shrink-0 text-primary-500" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
              This action requires admin password confirmation. You can track the progress of this job in the Job History section.
            </p>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setPreviewOpen(false)}>
          <div
            className="card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border-slate-700/50 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 blur-[100px] pointer-events-none"></div>
            
            <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Email Preview</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">How the recipient will see it</p>
              </div>
              <button 
                onClick={() => setPreviewOpen(false)} 
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all flex items-center justify-center"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-100 flex items-center justify-center">
              <div className="max-w-full shadow-lg rounded-xl overflow-hidden scale-[0.85] sm:scale-100 transform origin-top">
                <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
              </div>
            </div>
            
            <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 text-center">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Isolating Preview Layout</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Confirmation Modal ────────────────────────────────────── */}
      <ConfirmWithPassword
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        title="Confirm Bulk Email"
        message={`You are about to send a bulk email to ${individualCount} recipient${individualCount !== 1 ? 's' : ''}${selectedRoles.length > 0 ? ` plus participants/coordinators` : ''}. This action cannot be undone.`}
        confirmLabel="CONFIRM AND SEND"
        variant="warning"
      />
    </div>
  );
}
