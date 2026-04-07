import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../../src/components/ConfirmWithPassword';
import {
  HiOutlinePencilAlt, HiOutlineEye, HiOutlinePaperAirplane, HiOutlineX,
  HiOutlineUpload, HiOutlineInformationCircle, HiOutlineExclamation,
  HiOutlineSave, HiOutlineCheckCircle, HiOutlineArrowLeft, HiOutlineTemplate,
  HiOutlineClock, HiOutlineClipboardList, HiOutlineSpeakerphone
} from 'react-icons/hi';

const DB_FILTER_OPTIONS = [
  { value: 'all_users',          label: 'All Users' },
  { value: 'participant_users',  label: 'All Participants' },
  { value: 'coordinator_users',  label: 'All Coordinators' },
  { value: 'admin_users',        label: 'All Admins' },
  { value: 'paid_users',         label: 'Paid Users' },
  { value: 'unpaid_users',       label: 'Unpaid Users' },
  { value: 'event_participants', label: 'Event Participants' },
  { value: 'by_college',         label: 'By College' },
  { value: 'by_branch',          label: 'By Branch' },
  { value: 'by_year',            label: 'By Year' },
];

export default function CampaignCompose() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = !!id;

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject]         = useState('');
  const [fromName, setFromName]       = useState('Lakshya 2026');
  const [fromEmail, setFromEmail]     = useState('updates@contact.lakshyaldce.in');
  const [replyTo, setReplyTo]         = useState('contact@lakshyaldce.in');
  const [htmlContent, setHtmlContent] = useState('');
  const [templateId, setTemplateId]   = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Audience
  const [audienceType, setAudienceType] = useState('db_filter');
  const [dbFilter, setDbFilter]         = useState('all_users');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterBranch, setFilterBranch]   = useState('');
  const [filterYear, setFilterYear]       = useState('');
  const [filterEventId, setFilterEventId] = useState('');

  // CSV upload
  const [csvRecipients, setCsvRecipients]   = useState([]);
  const [csvPreview, setCsvPreview]         = useState(null);
  const [uploading, setUploading]           = useState(false);
  const fileInputRef = useRef(null);

  // Manual Entry
  const [manualEmails, setManualEmails]     = useState('');

  // Templates
  const [templates, setTemplates] = useState([]);

  // UI state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [campaignId, setCampaignId]   = useState(id || null);
  const [loading, setLoading]         = useState(isEdit);

  // Events for filter
  const [events, setEvents] = useState([]);

  // ─── Load existing campaign if editing ──────────────────────────────────────
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/campaigns/${id}`).then(({ data }) => {
        const c = data.data.campaign;
        setTitle(c.title);
        setDescription(c.description || '');
        setSubject(c.subject);
        setFromName(c.fromName);
        setFromEmail(c.fromEmail);
        setReplyTo(c.replyTo || '');
        setHtmlContent(c.htmlContent);
        setTemplateId(c.templateId?._id || '');
        setAudienceType(c.audienceType);
        setScheduledAt(c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : '');
        if (c.audienceConfig) {
          setDbFilter(c.audienceConfig.filter || 'all_users');
          setFilterCollege(c.audienceConfig.college || '');
          setFilterBranch(c.audienceConfig.branch || '');
          setFilterYear(c.audienceConfig.year || '');
          setFilterEventId(c.audienceConfig.eventId || '');
          if (c.audienceConfig.recipients?.length > 0) {
            setCsvRecipients(c.audienceConfig.recipients);
            setCsvPreview({
              validCount: c.audienceConfig.recipients.length,
              invalidCount: 0,
              duplicateCount: 0
            });
            setAudienceType('csv_upload');
          }
        }
        setCampaignId(c._id);
      }).catch(() => toast.error('Campaign not found'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  // ─── Load templates and events ──────────────────────────────────────────────
  useEffect(() => {
    api.get('/email-templates').then(({ data }) => setTemplates(data.data.templates)).catch(() => {});
    api.get('/events').then(({ data }) => setEvents(data.data || [])).catch(() => {});
  }, []);

  // ─── Template selector ─────────────────────────────────────────────────────
  const handleTemplateChange = (tid) => {
    setTemplateId(tid);
    if (!tid) return;
    const t = templates.find((x) => x._id === tid);
    if (!t) return;
    setSubject(t.subject);
    setHtmlContent(t.html);
    toast.success(`Template "${t.name}" applied`);
  };

  // ─── CSV upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/campaigns/upload-audience', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCsvPreview(data.data);
      setCsvRecipients(data.data.validRecipients || []);
      toast.success(`Parsed ${data.data.validCount} valid emails`);
    } catch (err) { toast.error(err.userMessage || 'Failed to parse file'); }
    finally { setUploading(false); }
  };

  const clearUpload = () => {
    setCsvPreview(null);
    setCsvRecipients([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Build audience config ──────────────────────────────────────────────────
  const getAudienceConfig = () => {
    if (audienceType === 'csv_upload') {
      return { recipients: csvRecipients };
    }
    if (audienceType === 'manual_entry') {
      const parsedEmails = manualEmails.split(',').map(e => e.trim()).filter(Boolean);
      return { recipients: parsedEmails.map(e => ({ email: e })) };
    }
    const config = { filter: dbFilter };
    if (dbFilter === 'event_participants') config.eventId = filterEventId;
    if (dbFilter === 'by_college') config.college = filterCollege;
    if (dbFilter === 'by_branch') config.branch = filterBranch;
    if (dbFilter === 'by_year') config.year = filterYear;
    return config;
  };

  // ─── Save draft ─────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    const defaultTitle = title || subject || 'Draft Campaign';
    if (!subject || !htmlContent) {
      toast.error('Subject and HTML content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: defaultTitle, description, subject, fromName, fromEmail, replyTo,
        htmlContent, textContent: '', templateId: templateId || null,
        audienceType: audienceType === 'manual_entry' ? 'csv_upload' : audienceType,
        audienceConfig: getAudienceConfig(),
        scheduledAt: scheduledAt || null,
      };

      if (campaignId) {
        await api.put(`/campaigns/${campaignId}`, payload);
        toast.success('Campaign saved');
      } else {
        const { data } = await api.post('/campaigns', payload);
        setCampaignId(data.data.campaign._id);
        if (!title) setTitle(defaultTitle);
        toast.success('Campaign draft created');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  // ─── Submit campaign ────────────────────────────────────────────────────────
  const handleSubmit = async (password) => {
    setSubmitting(true);
    const defaultTitle = title || subject || 'Draft Campaign';
    try {
      // Save first
      let currentId = campaignId;
      const payload = {
        title: defaultTitle, description, subject, fromName, fromEmail, replyTo,
        htmlContent, textContent: '', templateId: templateId || null,
        audienceType: audienceType === 'manual_entry' ? 'csv_upload' : audienceType,
        audienceConfig: getAudienceConfig(),
        scheduledAt: scheduledAt || null,
      };
      
      if (!currentId) {
        const { data } = await api.post('/campaigns', payload);
        currentId = data.data.campaign._id;
        setCampaignId(currentId);
      } else {
        await api.put(`/campaigns/${currentId}`, payload);
      }
      
      // Submit
      await api.post(`/campaigns/${currentId}/submit`, { adminPassword: password });
      toast.success('Campaign submitted successfully');
      navigate(`/campaigns/${currentId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit campaign');
      throw err;
    } finally { setSubmitting(false); }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const hasAudience = audienceType === 'csv_upload' ? csvRecipients.length > 0 : 
                      audienceType === 'manual_entry' ? manualEmails.trim().length > 0 : 
                      !!dbFilter;
  const canSend = subject.trim() && htmlContent.trim() && hasAudience;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <HiOutlinePencilAlt className="w-7 h-7 text-primary-600" />
          {isEdit ? 'Edit Campaign' : 'Compose SES Campaign'}
        </h1>
        <button
          onClick={() => navigate('/campaigns')}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <HiOutlineClipboardList className="w-5 h-5" />
          View Campaigns
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Audience ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Audience Source</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <button onClick={() => setAudienceType('db_filter')}
                className={`flex-1 py-2 rounded-lg border-2 transition-all text-center text-sm font-medium ${
                  audienceType === 'db_filter' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}>
                Database Filters
              </button>
              <button onClick={() => setAudienceType('csv_upload')}
                className={`flex-1 py-2 rounded-lg border-2 transition-all text-center text-sm font-medium ${
                  audienceType === 'csv_upload' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}>
                CSV Upload
              </button>
              <button onClick={() => setAudienceType('manual_entry')}
                className={`flex-1 py-2 rounded-lg border-2 transition-all text-center text-sm font-medium ${
                  audienceType === 'manual_entry' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}>
                Manual Entry
              </button>
            </div>

            {audienceType === 'db_filter' ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Filter By</label>
                  <select value={dbFilter} onChange={(e) => setDbFilter(e.target.value)} className="input-field text-sm">
                    {DB_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {dbFilter === 'event_participants' && (
                  <div>
                    <label className="label">Select Event</label>
                    <select value={filterEventId} onChange={(e) => setFilterEventId(e.target.value)} className="input-field text-sm">
                      <option value="">-- Select event --</option>
                      {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.name || ev.title}</option>)}
                    </select>
                  </div>
                )}
                {dbFilter === 'by_college' && (
                  <div>
                    <label className="label">College Name</label>
                    <input type="text" value={filterCollege} onChange={(e) => setFilterCollege(e.target.value)} className="input-field text-sm" placeholder="e.g. L.D. College" />
                  </div>
                )}
                {dbFilter === 'by_branch' && (
                  <div>
                    <label className="label">Branch</label>
                    <input type="text" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="input-field text-sm" placeholder="e.g. Computer Engineering" />
                  </div>
                )}
                {dbFilter === 'by_year' && (
                  <div>
                    <label className="label">Year</label>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="input-field text-sm">
                      <option value="">-- Select year --</option>
                      {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!csvPreview ? (
                  <div>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                    <label htmlFor="csv-upload"
                      className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                        uploading ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50/50'
                      }`}>
                      <HiOutlineUpload className={`w-8 h-8 mb-2 ${uploading ? 'text-primary-500 animate-pulse' : 'text-gray-400'}`} />
                      <span className="text-sm text-gray-600 font-medium">{uploading ? 'Parsing file...' : 'Click to upload CSV/Excel'}</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-green-700">{csvPreview.validCount}</p>
                          <p className="text-xs text-green-600">Valid</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-red-700">{csvPreview.invalidCount}</p>
                          <p className="text-xs text-red-600">Invalid</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-amber-700">{csvPreview.duplicateCount}</p>
                          <p className="text-xs text-amber-600">Duplicates</p>
                        </div>
                      </div>
                      <button onClick={clearUpload} className="ml-3 text-gray-400 hover:text-red-500 transition-colors">
                        <HiOutlineX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {audienceType === 'manual_entry' && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Comma-Separated Emails</h2>
                <textarea
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder="email1@test.com, email2@test.com..."
                  rows={4}
                  className="input-field text-sm resize-none"
                />
                <p className="text-xs text-gray-500">
                  {manualEmails.split(',').filter(e => e.trim()).length} email(s) currently added
                </p>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <HiOutlineClock className="w-4 h-4" /> Schedule (optional)
            </h2>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="input-field text-sm" />
            <p className="text-[11px] text-gray-400">Leave empty to send immediately upon approval.</p>
          </div>
        </div>

        {/* ── RIGHT: Compose Area ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Campaign Title (Internal)</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field text-sm" placeholder="Optional. Defaults to subject." />
              </div>
              <div>
                <label className="label">From Name</label>
                <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} className="input-field text-sm" />
              </div>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Load Pre-built Template</h2>
              <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} className="input-field text-sm">
                <option value="">-- Start blank or select a template --</option>
                {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="card space-y-4">
            <div>
              <label className="label">Subject Line *</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field text-sm" placeholder="e.g. Join us at Lakshya 2026" />
            </div>
            <div>
              <label className="label">HTML Message Body *</label>
              <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)}
                className="input-field text-sm font-mono resize-none bg-gray-50 text-gray-800" rows={12}
                placeholder="Paste your HTML content here. Supported dynamic variables: {{name}}, {{eventName}}, {{college}}, {{teamName}}." />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setPreviewOpen(true)} disabled={!htmlContent} className="btn-secondary flex items-center gap-2">
              <HiOutlineEye className="w-5 h-5" /> Preview Email
            </button>
            <button onClick={saveDraft} disabled={saving || (!subject && !htmlContent)} className="btn-secondary flex items-center gap-2">
              <HiOutlineSave className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={() => setConfirmOpen(true)} disabled={!canSend || submitting} className="btn-primary flex items-center gap-2 ml-auto">
              <HiOutlinePaperAirplane className="w-5 h-5" /> {scheduledAt ? 'Schedule Campaign' : 'Send Campaign'}
            </button>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">
            <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p>Campaigns dispatch via <strong>Amazon SES</strong> in the background. Duplicate and unsubscribed emails are automatically suppressed. You will need your admin password to confirm the mass dispatch.</p>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">HTML Preview</h3>
              <button onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-gray-600"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)] bg-gray-50 border-x">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ──────────────────────────────────────────────────── */}
      <ConfirmWithPassword
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSubmit}
        title={scheduledAt ? 'Schedule SES Campaign' : 'Send SES Campaign'}
        message={`You are about to queue the SES campaign via ${audienceType === 'csv_upload' ? 'CSV Upload' : 'Database Filter'}. This action cannot be easily undone.`}
        confirmLabel={scheduledAt ? 'Confirm Schedule' : 'Start Sending'}
        variant="warning"
      />
    </div>
  );
}

