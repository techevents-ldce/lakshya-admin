const fs = require('fs');
const path = require('path');

const dirs = [
  'd:/1 - Projects/tf-lakshya-admin/client/admin/pages',
  'd:/1 - Projects/tf-lakshya-admin/client/src/components',
  'd:/1 - Projects/tf-lakshya-admin/client/src/pages'
];

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

dirs.forEach(dir => {
  walk(dir, (file) => {
    if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(file, 'utf8');
      let original = content;
      
      content = content.replace(/font-black/g, 'font-bold');
      content = content.replace(/tracking-widest/g, 'tracking-wider');
      content = content.replace(/tracking-tighter/g, 'tracking-tight');
      
      if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
      }
    }
  });
});
