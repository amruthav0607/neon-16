const fs = require('fs');
const path = require('path');

async function testUpload() {
    // Create a dummy PDF buffer (minimal valid PDF structure)
    const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Test PDF) /Creator (Test Script) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");

    const formData = new FormData();
    // Create a Blob from the buffer (Node.js 18+ supports this)
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, 'test-verification.pdf');

    console.log("Attempting upload to http://localhost:3000/api/document-upload...");

    try {
        const response = await fetch('http://localhost:3000/api/document-upload', {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log("Response Status:", response.status);
        console.log("Response Body:", text);

        if (response.ok) {
            console.log("✅ Upload Test PASSED");
        } else {
            console.error("❌ Upload Test FAILED");
        }
    } catch (error) {
        console.error("❌ Network/Fetch Error:", error.message);
    }
}

testUpload();
