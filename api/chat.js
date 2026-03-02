export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;
    
    // Cek API key
    console.log('API Key ada?', !!API_KEY);
    console.log('Panjang key:', API_KEY?.length);
    console.log('Awalan key:', API_KEY?.substring(0, 15));

    // Return dulu untuk cek
    return res.status(200).json({ 
        keyExists: !!API_KEY,
        keyLength: API_KEY?.length,
        keyPrefix: API_KEY?.substring(0, 15)
    });
}