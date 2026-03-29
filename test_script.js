const fs = require('fs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const emails = [];

  if (lines.length === 0) return emails;

  const headerRow = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  let emailColIndex = headerRow.findIndex(h => h === 'email' || h === 'emails' || h.includes('email'));
  let collegeColIndex = headerRow.findIndex(h => h === 'college' || h === 'college name' || h.includes('college'));
  let departmentColIndex = headerRow.findIndex(h => h === 'department' || h === 'department name' || h.includes('department'));
  
  const startIndex = emailColIndex !== -1 ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, semicolon, or tab
    const parts = line.split(/[,;\t]/);
    
    // If headers exist, try mapping by index
    if (emailColIndex !== -1 && EMAIL_REGEX.test(parts[emailColIndex]?.trim().replace(/^["']|["']$/g, ''))) {
      const email = parts[emailColIndex].trim().replace(/^["']|["']$/g, '');
      const college = collegeColIndex !== -1 && parts[collegeColIndex] ? parts[collegeColIndex].trim().replace(/^["']|["']$/g, '') : '';
      const department = departmentColIndex !== -1 && parts[departmentColIndex] ? parts[departmentColIndex].trim().replace(/^["']|["']$/g, '') : '';
      emails.push({ email, college, department });
      continue;
    }

    // fallback mapping if it doesn't align with headers or if there are no headers
    for (const part of parts) {
      const cleaned = part.trim().replace(/^["']|["']$/g, ''); // Remove quotes
      if (EMAIL_REGEX.test(cleaned)) {
        emails.push({ email: cleaned, college: '', department: '' });
        break; // take first email match
      }
    }
  }

  return emails;
}

parseCSV('test.csv').then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
