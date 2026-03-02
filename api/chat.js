export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ← TAMBAH INI SEMENTARA UNTUK DEBUG
    console.log('API Key exists:', !!process.env.OPENROUTER_API_KEY);
    console.log('API Key value:', process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://resep-ai-app.vercel.app',
                'X-Title': 'ResepAI App'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}