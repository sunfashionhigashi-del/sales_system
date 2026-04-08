const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/gcga_data.json', 'utf8'));
console.log(Object.keys(data[0]));
