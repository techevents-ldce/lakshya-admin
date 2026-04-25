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
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Step 1: Upload Member List</h2>
        <p className={styles.description}>
          Upload an Excel file (.xlsx, .csv) with member details. The file should have:
          <br />
          <strong>Column A:</strong> Full Name | <strong>Column B:</strong> Email Address
        </p>

        <div className={styles.uploadArea}>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            style={{ display: 'none' }}
          />
          <label 
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
            className={styles.uploadLabel}
          >
            <span>📁 Click to upload or drag and drop</span>
          </label>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {validation && !validation.isValid && validation.errors.length > 0 && (
          <div className={styles.warnings}>
            <h4>⚠️ Validation Issues Found:</h4>
            <ul>
              {validation.errors.map((err, idx) => (
                <li key={idx}>
                  Row {err.rowIndex}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {members.length > 0 && (
          <div className={styles.preview}>
            <h3>
              ✓ Members Preview ({validation?.isValid ? 'All Valid' : 'Some Invalid'})
            </h3>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 10).map((member, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{member.fullName}</td>
                      <td>{member.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length > 10 && (
                <p className={styles.moreText}>
                  ...and {members.length - 10} more members
                </p>
              )}
            </div>
            <p className={styles.summary}>
              <strong>Total Valid Members: {members.length}</strong>
              {validation?.errors.length ? ` | Invalid Rows: ${validation.errors.length}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
