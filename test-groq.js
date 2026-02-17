const { Groq } = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function testGroq() {
    try {
        console.log('Testing Groq with key:', process.env.GROQ_API_KEY ? 'Present' : 'Missing');
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'llama-3.3-70b-versatile',
        });
        console.log('Groq Response:', completion.choices[0].message.content);
    } catch (err) {
        console.error('Groq Error:', err.message);
    }
}

testGroq();
