const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractInfo = async (transcript) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw error;
    }
};

module.exports = {
    extractInfo
};
