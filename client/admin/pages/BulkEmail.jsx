import { useState, useEffect, useCallback } from 'react';
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
} from 'react-icons/hi';

const TEMPLATE_OPTIONS = [
  { id: 'raw', label: 'Raw', icon: HiOutlineDocumentText, desc: 'Plain text email' },
  { id: 'success', label: 'Success', icon: HiOutlineCheckCircle, desc: 'Green success theme' },
  { id: 'congratulations', label: 'Congrats', icon: HiOutlineStar, desc: 'Celebratory theme' },
  { id: 'important', label: 'Important', icon: HiOutlineExclamation, desc: 'Warning/alert theme' },
  { id: 'formal', label: 'Formal', icon: HiOutlineShieldCheck, desc: 'Professional dark theme' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admins' },
  { value: 'coordinator', label: 'Coordinators' },
  { value: 'participant', label: 'Participants' },
];

export default function BulkEmail() {
  // ─── Target filters ──────────────────────────────────────────────────────────
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [manualEmails, setManualEmails] = useState('');

  // ─── Compose ──────────────────────────────────────────────────────────────────
  const [template, setTemplate] = useState('raw');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

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

  // ─── Preview HTML ─────────────────────────────────────────────────────────────
  const getPreviewHtml = () => {
    const name = 'Preview User';
    const templateMap = {
      raw: `<div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;">
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body || '(message body)'}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p></div>`,
      success: `<div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0fdf4;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">✅</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${subject || '(subject)'}</h1></div>
        <div style="padding:28px 24px;color:#1e293b;">
        <p style="margin:0 0 8px;font-weight:600;">Hi ${name},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body || '(message body)'}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p></div></div>`,
      congratulations: `<div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:linear-gradient(135deg,#fef3c7,#fef9c3);border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">🎉</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${subject || '(subject)'}</h1></div>
        <div style="padding:28px 24px;color:#1e293b;">
        <p style="margin:0 0 8px;font-weight:600;">Hi ${name},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body || '(message body)'}</p>
        <div style="text-align:center;padding:16px 0;"><span style="font-size:32px;">🏆</span></div>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p></div></div>`,
      important: `<div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fef2f2;border-radius:16px;overflow:hidden;border:2px solid #fca5a5;">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">⚠️</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${subject || '(subject)'}</h1></div>
        <div style="padding:28px 24px;color:#1e293b;">
        <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
        <p style="margin:0;font-weight:600;color:#991b1b;font-size:14px;">⚡ Important Notice</p></div>
        <p style="margin:0 0 8px;font-weight:600;">Hi ${name},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body || '(message body)'}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p></div></div>`,
      formal: `<div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px 24px;text-align:center;border-bottom:1px solid #334155;">
        <h1 style="margin:0;color:#f1f5f9;font-size:22px;font-weight:700;letter-spacing:0.5px;">${subject || '(subject)'}</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Official Communication</p></div>
        <div style="padding:28px 24px;color:#e2e8f0;">
        <p style="margin:0 0 8px;font-weight:600;">Dear ${name},</p>
        <p style="white-space:pre-wrap;line-height:1.8;margin:0 0 24px;color:#cbd5e1;">${body || '(message body)'}</p>
        <div style="border-top:1px solid #334155;padding-top:16px;margin-top:24px;">
        <p style="margin:0;color:#64748b;font-size:13px;">Warm regards,</p>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;font-weight:600;">Team Lakshya</p></div></div></div>`,
    };
    return templateMap[template] || templateMap.raw;
  };

  // ─── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = async (password) => {
    setSending(true);
    try {
      // Collect all manual emails
      const manualList = manualEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      // Combine individual user emails + manual emails
      const recipientEmails = [
        ...selectedUsers.map((u) => u.email),
        ...manualList,
      ];

      const { data } = await api.post('/mail/send', {
        subject,
        body,
        template,
        recipientEmails,
        roles: selectedRoles,
        adminPassword: password,
      });

      toast.success(data.message || 'Emails sent successfully!');

      // Reset form
      setSubject('');
      setBody('');
      setSelectedRoles([]);
      setSelectedUsers([]);
      setManualEmails('');
    } catch (err) {
      toast.error(err.userMessage || 'Failed to send emails');
      throw err; // let ConfirmWithPassword show the error
    } finally {
      setSending(false);
    }
  };

  // ─── Computed recipient count ─────────────────────────────────────────────────
  const manualCount = manualEmails.split(',').map((e) => e.trim()).filter(Boolean).length;
  const recipientCount = selectedUsers.length + manualCount + (selectedRoles.length > 0 ? '(+ roles)' : 0);
  const hasRecipients = selectedRoles.length > 0 || selectedUsers.length > 0 || manualCount > 0;
  const canSend = hasRecipients && subject.trim() && body.trim();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900">
        <HiOutlineMail className="w-7 h-7 text-primary-600" />
        Bulk Email
      </h1>

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
            {/* Selected users chips */}
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
        </div>

        {/* ── RIGHT: Compose Area ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Template Picker */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Email Template</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
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
              {sending ? 'Sending…' : 'Send Email'}
            </button>
            {hasRecipients && (
              <span className="text-xs text-gray-600">
                Sending to {selectedUsers.length + manualCount} individual recipient{selectedUsers.length + manualCount !== 1 ? 's' : ''}
                {selectedRoles.length > 0 && ` + all ${selectedRoles.join(', ')}`}
              </span>
            )}
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">
            <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p>Sending bulk emails is an admin-only action. You will be asked to verify your password before sending. This action is logged for audit purposes.</p>
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
        message={`You are about to send an email to ${selectedUsers.length + manualCount} individual recipient${selectedUsers.length + manualCount !== 1 ? 's' : ''}${selectedRoles.length > 0 ? ` plus all ${selectedRoles.join(', ')}` : ''}. This action cannot be undone.`}
        confirmLabel="Send Now"
        variant="warning"
      />
    </div>
  );
}
