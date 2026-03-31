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
    const baseLayout = (content, templateMode = 'default') => `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
        <!-- Brand Header -->
        <div style="background-color: #ffffff; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <img src="/mail-head.png" alt="Lakshya - Where Legacy meets Innovation" style="display: block; width: 100%; max-width: 600px; height: auto; border: none; margin: 0 auto;" />
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
          <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 13px;">L.D. College of Engineering, Ahmedabad – 380015</p>
        </div>
      </div>
    `;

    let headerHtml = '';
    const sampleRecipient = uploadPreview?.validEmails?.find(e => e.department || e.college || e.clubName);
    
    if (template === 'club') {
      const clubName = sampleRecipient?.clubName || 'Tech Enthusiasts';
      const collegeText = sampleRecipient?.college ? `${sampleRecipient.college}<br>` : '';
      headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Hello <strong>${clubName}</strong>,<br>${collegeText}</p>`;
    } else if (template === 'marketing') {
      if (sampleRecipient) {
        const deptText = sampleRecipient.department ? `Department of ${sampleRecipient.department}<br>` : '';
        const collegeText = sampleRecipient.college ? `${sampleRecipient.college}<br>` : '';
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear Head of Department,<br>${deptText}${collegeText}</p>`;
      } else if (!uploadPreview?.validEmails?.length) {
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; opacity: 0.6; font-style: italic;">[Preview] Dear Head of Department,<br>[College Name]</p>`;
      }
    } else {
      if (sampleRecipient) {
        if (sampleRecipient.clubName) {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${sampleRecipient.clubName} Team,</p>`;
        } else if (sampleRecipient.department) {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear Head of Department,<br>Department of ${sampleRecipient.department}</p>`;
        } else if (sampleRecipient.name) {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${sampleRecipient.name},</p>`;
        } else {
          headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Respected Sir/Ma'am,</p>`;
        }
      } else if (!uploadPreview?.validEmails?.length) {
        headerHtml = `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; opacity: 0.6; font-style: italic;">[Preview] Respected Sir/Ma'am,</p>`;
      }
    }

    const pb = processBody(body);
    const standardContent = headerHtml + pb;
    const s = subject || '(subject)';
    
    const templateMap = {
      raw: baseLayout(`<div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      success: baseLayout(`<h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${s}</h2><div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      congratulations: baseLayout(`<h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${s}</h2><div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      important: baseLayout(`<div style="border-left: 4px solid #dc2626; padding-left: 20px; margin-bottom: 32px;"><p style="margin: 0 0 6px 0; font-weight: 700; color: #dc2626; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Urgent Notice</p><h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${s}</h2></div><div style="margin: 0; line-height: 1.7;">${standardContent}</div>`),
      formal: baseLayout(`<h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 24px; font-weight: 700; text-align: center;">${s}</h2><div style="margin: 0 0 32px 0; line-height: 1.7;">${standardContent}</div>`),
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

      // Combine: individual users + manual + uploaded valid emails
      const recipients = [
        ...selectedUsers.map((u) => ({ email: u.email, name: u.name, college: '', department: '', clubName: '' })),
        ...manualList.map((email) => ({ email, name: '', college: '', department: '', clubName: '' })),
        ...(uploadPreview?.validEmails || []), // These are now objects from backend {email, college, department, clubName}
      ];

      const sourceType = uploadPreview ? 'excel_upload' : 'manual_selection';

      const { data } = await api.post('/mail/jobs', {
        subject,
        body,
        template,
        recipients, // changed from recipientEmails
        roles: selectedRoles,
        adminPassword: password,
        senderIdentity,
        sourceType,
      });

      toast.success(data.message || 'Bulk email job created!');

      // Navigate to job detail page
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <HiOutlineMail className="w-7 h-7 text-primary-600" />
          Compose Bulk Email
        </h1>
        <button
          onClick={() => navigate('/bulk-email/jobs')}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <HiOutlineClipboardList className="w-5 h-5" />
          View Jobs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Target Filters ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Roles */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Target Roles</h2>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(value)}
                    onChange={() => toggleRole(value)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Individual Users */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Individual Users</h2>
            <div className="relative mb-3">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input-field pl-9 text-sm"
              />
              {userResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {userResults.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => addUser(u)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <span>
                        <span className="text-gray-800 font-medium">{u.name}</span>
                        <span className="text-gray-500 ml-2 text-xs">{u.email}</span>
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <span key={u._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                    {u.name || u.email}
                    <button onClick={() => removeUser(u._id)} className="hover:text-red-400 transition-colors">
                      <HiOutlineX className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Manual Emails */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">External Emails</h2>
            <textarea
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              placeholder="Enter comma-separated emails..."
              rows={3}
              className="input-field text-sm resize-none"
            />
            {manualCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">{manualCount} email{manualCount !== 1 ? 's' : ''} added</p>
            )}
          </div>

          {/* File Upload */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Upload CSV / Excel</h2>
              <div className="group relative">
                <HiOutlineInformationCircle className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <p className="font-bold mb-1">Upload Format:</p>
                  <ul className="list-disc pl-3 space-y-1">
                    <li>Must include <b>Email</b>, and optionally <b>College</b>, <b>Department</b>, or <b>Club Name</b> columns.</li>
                    <li>If no header exists, system will try to auto-detect emails.</li>
                    <li>Supported: .csv, .xlsx, .xls</li>
                    <li>Duplicates and invalid emails are auto-filtered.</li>
                  </ul>
                </div>
              </div>
            </div>
            {!uploadPreview ? (
              <div>
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
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                    uploading ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'
                  }`}
                >
                  <HiOutlineUpload className={`w-8 h-8 mb-2 ${uploading ? 'text-primary-500 animate-pulse' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-600 font-medium">
                    {uploading ? 'Parsing file...' : 'Click to upload'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">CSV, XLSX, XLS (max 5MB)</span>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium truncate">{uploadedFile?.name}</span>
                  <button onClick={clearUpload} className="text-gray-400 hover:text-red-500 transition-colors">
                    <HiOutlineX className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-700">{uploadPreview.validCount}</p>
                    <p className="text-xs text-green-600">Valid</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-red-700">{uploadPreview.invalidCount}</p>
                    <p className="text-xs text-red-600">Invalid</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-amber-700">{uploadPreview.duplicateCount}</p>
                    <p className="text-xs text-amber-600">Dupes</p>
                  </div>
                </div>
                {uploadPreview.invalidCount > 0 && (
                  <details className="text-xs">
                    <summary className="text-red-600 cursor-pointer hover:text-red-700">View invalid emails</summary>
                    <div className="mt-1 p-2 bg-red-50 rounded text-red-700 max-h-24 overflow-y-auto">
                      {uploadPreview.invalidEmails.map(e => typeof e === 'object' ? (e.email || 'Invalid') : e).sort().join(', ')}
                    </div>
                  </details>
                )}
                {uploadPreview.validEmails?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Selected Emails ({uploadPreview.validEmails.length})</p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      {uploadPreview.validEmails.map((item) => (
                        <span key={item.email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[11px] font-medium" title={item.college ? `${item.department} - ${item.college}` : ''}>
                          {item.email}
                          <button
                            onClick={() => {
                              setUploadPreview((prev) => ({
                                ...prev,
                                validEmails: prev.validEmails.filter((e) => e.email !== item.email),
                                validCount: prev.validCount - 1,
                              }));
                            }}
                            className="hover:text-red-500 transition-colors"
                          >
                            <HiOutlineX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Compose Area ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sender Identity */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Sender Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSenderIdentity(opt.value)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all duration-200 ${
                    senderIdentity === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="font-semibold text-sm mb-1">{opt.label}</span>
                  <span className="text-xs opacity-80">{opt.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Picker */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Email Template</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {TEMPLATE_OPTIONS.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setTemplate(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                    template === id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] text-gray-500 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject & Body */}
          <div className="card space-y-4">
            <div>
              <label className="label">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Message Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email message here..."
                rows={8}
                className="input-field resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={() => setPreviewOpen(true)}
              disabled={!body.trim()}
              className="btn-secondary flex items-center gap-2"
            >
              <HiOutlineEye className="w-5 h-5" />
              Preview
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || sending}
              className="btn-primary flex items-center gap-2"
            >
              <HiOutlinePaperAirplane className="w-5 h-5" />
              {sending ? 'Creating Job…' : 'Send Email'}
            </button>
            {hasRecipients && (
              <span className="text-xs text-gray-600">
                {individualCount > 0 && `${individualCount} individual recipient${individualCount !== 1 ? 's' : ''}`}
                {selectedRoles.length > 0 && ` ${individualCount > 0 ? '+ ' : ''}all ${selectedRoles.join(', ')}`}
              </span>
            )}
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">
            <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p>Sending bulk emails is an admin-only action. You will be asked to verify your password before sending. Emails are processed in the background — you can track progress on the Jobs page.</p>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Email Preview</h3>
              <button onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Password Confirmation Modal ────────────────────────────────────── */}
      <ConfirmWithPassword
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        title="Send Bulk Email"
        message={`You are about to create a bulk email job for ${individualCount} individual recipient${individualCount !== 1 ? 's' : ''}${selectedRoles.length > 0 ? ` plus all ${selectedRoles.join(', ')}` : ''}. Emails will be sent in the background.`}
        confirmLabel="Create Job"
        variant="warning"
      />
    </div>
  );
}
