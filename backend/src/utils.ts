import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export default async function getSQLQuery({
    naturalLanguageQuery,
  prompt,
}: {
    naturalLanguageQuery: string;
  prompt: string;
}) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // The data to send in the POST request
    const data = {
      contents: [
        {
          parts: [
            {text:prompt},
            { text: naturalLanguageQuery }
          ]
        }
      ]
    };
  
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
    // Send the API response back to the client
    return response.data;
  } catch (error) {
    console.error("Error making API request:", error);
    return null;
  }
};