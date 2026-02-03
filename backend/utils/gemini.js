const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const dotenv = require('dotenv');

// Load env from the same directory as the package.json (parent of utils)
// or explicitly from backend root.
dotenv.config({ path: path.join(__dirname, '../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Debug logging
console.log("Gemini Utils Loaded.");
console.log(`API Key Provider: ${process.env.GEMINI_API_KEY ? 'Present' : 'MISSING'}`);
if (process.env.GEMINI_API_KEY) {
    const k = process.env.GEMINI_API_KEY;
    console.log(`Key snippet: ${k.substring(0, 4)}...${k.substring(k.length - 4)}`);
}


const extractInfo = async (transcript) => {
    try {
        // Updated to gemini-2.0-flash as gemini-pro is deprecated/unavailable
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        You are an expert movie review analyst.
        Analyze the following movie/series review transcript (which may be in Hindi or English or Hinglish).
        Extract the Movie or Web Series Name and the Rating given by the reviewer.
        
        Return the result as a STRICT JSON object with keys "title" and "rating".
        The "rating" should be normalized to "X/10" format if possible, or keep as mentioned.
        If no rating is found, use "N/A".
        
        Transcript:
        """
        ${transcript.substring(0, 30000)} 
        """
        
        Output JSON:
        `;
        // Truncate transcript to avoid token limits if very long, though Gemini Pro has large context.

        let retries = 0;
        const maxRetries = 3;

        while (true) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Clean markdown code blocks if present
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

                return JSON.parse(jsonStr);
            } catch (error) {
                if (error.message.includes("429") || error.status === 429) {
                    if (retries >= maxRetries) throw error;
                    retries++;
                    const delay = Math.pow(2, retries) * 5000; // 10s, 20s, 40s
                    console.log(`Gemini Rate Limit (429). Retrying in ${delay / 1000}s... (Attempt ${retries}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }

    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw error;
    }
};

module.exports = {
    extractInfo
};
