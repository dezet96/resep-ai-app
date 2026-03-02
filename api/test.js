export default async function handler(req, res) {
    const API_KEY = process.env.OPENROUTER_API_KEY;
    
    res.status(200).json({ 
        keyExists: !!API_KEY,
        keyLength: API_KEY?.length,
        keyPrefix: API_KEY?.substring(0, 10),
        keySuffix: API_KEY?.substring(API_KEY.length - 5)
    });
}