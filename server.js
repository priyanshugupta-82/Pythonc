import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

app.post("/api/explain-error", async (req, res) => {
  const { code, error } = req.body;

  if (!code || !error) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You are a precise Python expert. Explain errors correctly and simply."
        },
        {
          role: "user",
          content: `
Python Code:
${code}

Python Error:
${error}

Respond ONLY in JSON:
{
  "line": number,
  "type": "Error type",
  "explanation": "short explanation",
  "fix": "corrected line only"
}
`
        }
      ]
    });

    res.json({ ai: completion.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: "AI timeout or unavailable" });
  }
});

app.listen(PORT, () => {
  console.log("PythonC running on port " + PORT);
});