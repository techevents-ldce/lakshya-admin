import { useState, useEffect, useCallback } from 'react';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineTemplate, HiOutlinePlus, HiOutlineSearch, HiOutlineEye,
  HiOutlinePencil, HiOutlineTrash, HiOutlineDuplicate, HiOutlineX,
  HiOutlinePaperAirplane, HiOutlineExclamation,
} from 'react-icons/hi';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'result', label: 'Result' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'general', label: 'General' },
];

const CAT_COLORS = {
  announcement: 'bg-blue-100 text-blue-700',
  reminder:     'bg-amber-100 text-amber-700',
  result:       'bg-green-100 text-green-700',
  invitation:   'bg-violet-100 text-violet-700',
  general:      'bg-gray-100 text-gray-600',
};

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Form state
  const [form, setForm] = useState({ name: '', category: 'general', subject: '', html: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Test send state
  const [testSendId, setTestSendId] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await api.get('/email-templates', { params });
      setTemplates(data.data.templates);
    } catch (err) { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category: 'general', subject: '', html: '', text: '' });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, subject: t.subject, html: t.html, text: t.text || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.html) {
      toast.error('Name, subject, and HTML content are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/email-templates/${editing._id}`, form);
        toast.success('Template updated');
      } else {
        await api.post('/email-templates', form);
        toast.success('Template created');
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/email-templates/${id}`); toast.success('Template deleted'); fetchTemplates(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleDuplicate = async (id) => {
    try { await api.post(`/email-templates/${id}/duplicate`); toast.success('Template duplicated'); fetchTemplates(); }
    catch (err) { toast.error('Failed to duplicate'); }
  };

  const handleTestSend = async () => {
    if (!testEmail) { toast.error('Enter an email address'); return; }
    setSendingTest(true);
    try {
      await api.post(`/email-templates/${testSendId}/test-send`, { toEmail: testEmail });
      toast.success(`Test sent to ${testEmail}`);
      setTestSendId(null);
      setTestEmail('');
    } catch (err) { toast.error(err.response?.data?.message || 'Test send failed'); }
    finally { setSendingTest(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <HiOutlineTemplate className="w-7 h-7 text-primary-600" />
          Email Templates
        </h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-5 h-5" /> New Template
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search templates..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 text-sm" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-auto text-sm">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-16">
          <HiOutlineTemplate className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No templates</h3>
          <p className="text-sm text-gray-400 mb-4">Create your first reusable email template.</p>
          <button onClick={openCreate} className="btn-primary text-sm"><HiOutlinePlus className="w-4 h-4 inline mr-1" /> Create Template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t._id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{t.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{t.subject}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[t.category] || CAT_COLORS.general}`}>
                  {t.category}
                </span>
              </div>

              {t.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.variables.map((v) => (
                    <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                  ))}
                </div>
              )}

              {t.isSystem && (
                <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold mb-3">
                  System Template
                </span>
              )}

              <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                <button onClick={() => { setPreviewHtml(t.html); setPreviewOpen(true); }} title="Preview"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                  <HiOutlineEye className="w-4 h-4" />
                </button>
                {!t.isSystem && (
                  <button onClick={() => openEdit(t)} title="Edit"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDuplicate(t._id)} title="Duplicate"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all">
                  <HiOutlineDuplicate className="w-4 h-4" />
                </button>
                <button onClick={() => { setTestSendId(t._id); setTestEmail(''); }} title="Test Send"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
                  <HiOutlinePaperAirplane className="w-4 h-4" />
                </button>
                {!t.isSystem && (
                  <button onClick={() => handleDelete(t._id)} title="Delete"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all ml-auto">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Template Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field text-sm" placeholder="e.g. Event Announcement" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field text-sm">
                    {CATEGORIES.filter((c) => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Subject Line</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field text-sm"
                  placeholder='e.g. Announcing {{eventName}} – Register Now' />
              </div>
              <div>
                <label className="label">HTML Content</label>
                <textarea value={form.html} onChange={(e) => setForm({ ...form, html: e.target.value })}
                  className="input-field text-sm font-mono resize-none" rows={12}
                  placeholder="Paste your HTML email content here. Use {{name}}, {{college}}, {{eventName}} placeholders." />
              </div>
              <div>
                <label className="label">Plain Text Fallback <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="input-field text-sm resize-none" rows={4} placeholder="Plain text version for email clients that don't render HTML" />
              </div>
              <div className="flex items-start gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <p>Use <code className="bg-blue-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{eventName}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{college}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{teamName}}'}</code> placeholders. They will be auto-detected.</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <button onClick={() => { setPreviewHtml(form.html); setPreviewOpen(true); }}
                className="btn-secondary text-sm flex items-center gap-1.5" disabled={!form.html}>
                <HiOutlineEye className="w-4 h-4" /> Preview
              </button>
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                  {saving ? 'Saving...' : editing ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Template Preview</h3>
              <button onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-gray-600"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Test Send Modal ────────────────────────────────────────────────── */}
      {testSendId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTestSendId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Send Test Email</h3>
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com" className="input-field text-sm mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setTestSendId(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleTestSend} disabled={sendingTest} className="btn-primary text-sm">
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
