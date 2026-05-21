const fs = require('fs');
let content = fs.readFileSync('src/AdminPanel.tsx', 'utf8');
content = content.replace(/alert\('Error deleting item'\);/g, "alert('Error deleting item: ' + (error.message || error)); console.error('Delete error:', error);");
fs.writeFileSync('src/AdminPanel.tsx', content);
