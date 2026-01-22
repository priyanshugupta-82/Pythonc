import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ES module fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: "200kb" }));
app.use(express.static(__dirname));

/* ===============================
   FRONTEND
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ===============================
   AI ERROR ANALYZER (GROQ)
================================ */
app.post("/api/ai", async (req, res) => {
  const { code, error } = req.body;

  if (!code || !error) {
    return res.status(400).json({ error: "Missing code or error" });
  }

  // Hard timeout (5s)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          temperature: 0.15,
          messages: [
            {
              role: "system",
              content:
                "You are a Python compiler error explainer. " +
                "Always respond in this format:\n" +
                "Error Type:\n" +
                "Line Number:\n" +
                "What is wrong:\n" +
                "Correct line:"
            },
            {
              role: "user",
              content:
                `Python Code:\n${code}\n\n` +
                `Runtime Error:\n${error}`
            }
          ]
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!groqRes.ok) {
      const text = await groqRes.text();
      return res.status(500).json({
        error: "Groq API error",
        details: text
      });
    }

    const data = await groqRes.json();

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Invalid AI response" });
    }

    res.json({
      result: data.choices[0].message.content
    });

  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(408).json({
        error: "AI timeout (5 seconds)"
      });
    }

    res.status(500).json({
      error: "AI service failed",
      details: err.message
    });
  }
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 PythonC AI running on port ${PORT}`);
});