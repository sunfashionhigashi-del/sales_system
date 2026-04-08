const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const oldContent = content;
    content = content.replace(/発注済/g, '未請求');
    if (content !== oldContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

['src/components/GridArea.tsx', 'src/components/OrderDetailModal.tsx', 'src/components/DashboardArea.tsx', 'src/App.tsx'].forEach(file => {
    replaceInFile(path.join(__dirname, file));
});
