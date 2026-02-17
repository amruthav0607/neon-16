const pdf = require('pdf-parse');

async function testPdf() {
    try {
        console.log('Testing pdf-parse 1.1.1...');
        const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");

        console.log('Type of pdf:', typeof pdf);
        if (typeof pdf === 'function') {
            const data = await pdf(buffer);
            console.log('Success! Text extracted:', data.text || '(empty)');
        } else {
            console.log('Error: pdf is not a function. Keys:', Object.keys(pdf));
        }
    } catch (err) {
        console.error('Test Error:', err.message);
    }
}

testPdf();
