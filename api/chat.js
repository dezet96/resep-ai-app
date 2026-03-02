export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    try {
        // HARDCODE dulu untuk test
        const testBody = {
            model: "mistralai/mistral-7b-instruct:free", // ganti model!
            messages: [
                {
                    role: "user",
                    content: "Halo, apa kabar?"
                }
            ]
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://resep-ai-app.vercel.app',
                'X-Title': 'ResepAI App'
            },
            body: JSON.stringify(testBody)
        });

        const data = await response.json();
        console.log('OpenRouter response:', JSON.stringify(data));
        res.status(response.status).json(data);

    } catch (error) {
        console.log('Catch error:', error.message);
        res.status(500).json({ error: error.message });
    }
}