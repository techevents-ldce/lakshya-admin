import * as XLSX from 'xlsx';

export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const members = [];
        const errors = [];

        // Check headers (row 0)
        // Expected: Full Name, Email
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          const fullName = (row[0] || '').toString().trim();
          const email = (row[1] || '').toString().trim();

          // Validation
          if (!fullName) {
            errors.push({ rowIndex: i + 1, message: 'Full Name is empty' });
            continue;
          }
          if (!email) {
            errors.push({ rowIndex: i + 1, message: 'Email is empty' });
            continue;
          }
          if (!isValidEmail(email)) {
            errors.push({ rowIndex: i + 1, message: 'Email is invalid' });
            continue;
          }

          const member = {
            fullName,
            email,
          };

          // Add additional fields
          for (let j = 2; j < row.length; j++) {
            member[`field_${j - 1}`] = row[j] || '';
          }

          members.push(member);
        }

        resolve({
          members,
          validation: {
            isValid: errors.length === 0,
            errors
          }
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const members = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const columns = lines[i].split(',').map(col => col.trim());
          if (columns.length < 2) continue;

          const fullName = columns[0];
          const email = columns[1];

          if (!fullName) {
            errors.push({ rowIndex: i + 1, message: 'Full Name is empty' });
            continue;
          }
          if (!email) {
            errors.push({ rowIndex: i + 1, message: 'Email is empty' });
            continue;
          }
          if (!isValidEmail(email)) {
            errors.push({ rowIndex: i + 1, message: 'Email is invalid' });
            continue;
          }

          const member = {
            fullName,
            email,
          };

          for (let j = 2; j < columns.length; j++) {
            member[`field_${j - 1}`] = columns[j] || '';
          }

          members.push(member);
        }

        resolve({
          members,
          validation: {
            isValid: errors.length === 0,
            errors
          }
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
