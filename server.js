import express from "express";
import fetch from "node-fetch"; // Make sure node-fetch installed
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: "100kb" })); // limit to prevent huge payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // serve static frontend files

/* ================================
   FRONTEND ROUTE
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ================================
   WARMUP (optional for Render free tier)
================================ */
app.get("/warmup", (req, res) => {
  res.send("PythonC is awake!");
});

/* ================================
   AI ERROR ANALYZER (GROQ)
================================ */
app.post("/api/ai", async (req, res) => {
  try {
    const { code, error } = req.body;

    if (!code || !error) {
      return res.status(400).json({ error: "Missing code or error" });
    }

    // Limit payload to prevent freeze
    const safeCode = code.slice(0, 5000);
    const safeError = error.slice(0, 500);

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "You are a Python error explainer. Give: Error Type, Line Number, What is wrong, Corrected line. Format clearly.",
            },
            {
              role: "user",
              content: `Python Code:\n${safeCode}\n\nError:\n${safeError}`,
            },
          ],
        }),
      }
    );

    if (!groqRes.ok) {
      const text = await groqRes.text();
      return res.status(500).json({
        error: "Groq API error",
        details: text,
      });
    }

    const data = await groqRes.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      return res.status(500).json({ error: "Invalid AI response" });
    }

    res.json({ result: data.choices[0].message.content });
  } catch (err) {
    console.error("AI request failed:", err.message);
    res.status(500).json({ error: "AI service failed" });
  }
});

/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 PythonC running on port ${PORT}`);
});