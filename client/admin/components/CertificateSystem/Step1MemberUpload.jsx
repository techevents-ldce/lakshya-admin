import { useState, useRef } from 'react';
import { parseExcelFile, parseCSVFile } from './utils/excelParser';
import styles from './Step1MemberUpload.module.css';

export const Step1MemberUpload = ({ onMembersLoaded, isLoading = false }) => {
  const [members, setMembers] = useState([]);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    const fileName = file.name.toLowerCase();

    try {
      let result;
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        result = await parseExcelFile(file);
      } else if (fileName.endsWith('.csv')) {
        result = await parseCSVFile(file);
      } else {
        setError('Please upload an .xlsx, .csv, or .xls file');
        return;
      }

      setMembers(result.members);
      setValidation(result.validation);

      if (result.members.length > 0) {
        onMembersLoaded(result.members);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleLabelClick = () => {
    fileInput.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Step 1: Upload Member List</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Upload an Excel file (.xlsx, .csv) with member details. The file should have:
          <br />
          <strong className="text-indigo-400">Column A:</strong> Full Name | <strong className="text-indigo-400">Column B:</strong> Email Address
        </p>

        <div 
          onClick={handleLabelClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              if (fileInput.current) {
                fileInput.current.files = dataTransfer.files;
                handleFileUpload({ target: { files: dataTransfer.files } });
              }
            }
          }}
          className="border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center bg-slate-950/50 cursor-pointer transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900/60 group"
        >
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            style={{ display: 'none' }}
          />
          <span className="cursor-pointer text-lg font-bold text-slate-400 group-hover:text-indigo-400 transition-colors flex flex-col items-center gap-4">
            <span className="text-4xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">📁</span>
            Click to upload or drag and drop
          </span>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold mt-6 animate-fade-in">{error}</div>}

        {validation && !validation.isValid && validation.errors.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mt-8 animate-fade-in">
            <h4 className="text-amber-400 font-bold mb-3 flex items-center gap-2 uppercase tracking-widest text-xs">⚠️ Validation Issues Found:</h4>
            <ul className="text-xs text-amber-200/70 space-y-2 list-disc list-inside">
              {validation.errors.map((err, idx) => (
                <li key={idx}>
                  Row {err.rowIndex}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {members.length > 0 && (
          <div className="mt-10 space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              ✓ Members Preview ({validation?.isValid ? 'All Valid' : 'Some Invalid'})
            </h3>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm shadow-xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="bg-slate-900/80 text-slate-400 p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">#</th>
                    <th className="bg-slate-900/80 text-slate-400 p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">Full Name</th>
                    <th className="bg-slate-900/80 text-slate-400 p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 10).map((member, idx) => (
                    <tr key={idx} className="border-b border-slate-800/50 transition-colors hover:bg-white/[0.02]">
                      <td className="p-4 text-sm text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-4 text-sm text-slate-300 font-medium">{member.fullName}</td>
                      <td className="p-4 text-sm text-slate-300 font-medium">{member.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length > 10 && (
                <p className="text-center text-slate-600 text-[10px] font-bold py-4 bg-slate-900/20 uppercase tracking-widest">
                  ...and {members.length - 10} more members
                </p>
              )}
            </div>
            <p className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl text-indigo-400 text-xs font-bold mt-4 flex items-center justify-between uppercase tracking-widest">
              <span>Total Valid Members: {members.length}</span>
              {validation?.errors.length ? <span className="text-red-400">Invalid Rows: {validation.errors.length}</span> : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
