export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // SEMENTARA untuk test - hapus setelah berhasil!
    const API_KEY = process.env.OPENROUTER_API_KEY;
    console.log('Full API Key:', API_KEY); // lihat full key di log

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://resep-ai-app.vercel.app',
                'X-Title': 'ResepAI App'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        console.log('OpenRouter response:', JSON.stringify(data));
        res.status(response.status).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}