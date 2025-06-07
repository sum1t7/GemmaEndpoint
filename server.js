const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

 app.use(cors({
  origin: "https://take-movie-website.vercel.app",
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

let requestCount = 0;
const startTime = Date.now();

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: "1.0.0",
  });
});

app.get("/api/stats", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);

  res.json({
    totalRequests: requestCount,
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${
        uptimeSeconds % 60
      }s`,
    },
    startTime: new Date(startTime).toISOString(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
  });
});

app.post("/api/prompt", async (req, res) => {
  requestCount++;

  try {
    const { prompt, maxTokens = 1000 } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required",
        example: { prompt: "Explain how AI works" },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Server configuration error: API key not found",
      });
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      return res.status(response.status).json({
        error: "AI service error",
        details:
          response.status === 403
            ? "Invalid API key or quota exceeded"
            : "Service temporarily unavailable",
      });
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;

      res.json({
        success: true,
        response: aiResponse,
        tokensUsed: data.usageMetadata || null,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: "Unexpected response format from AI service",
        rawResponse: data,
      });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

app.get("/api/test", async (req, res) => {
  try {
    const testPrompt = "Say hello and confirm the API is working";

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: testPrompt,
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    res.json({
      status: "API is working!",
      testResponse:
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Test failed",
      message: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Gemini AI Server",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      stats: "GET /api/stats",
      prompt: "POST /api/prompt",
      test: "GET /api/test",
    },
    documentation: {
      prompt: {
        method: "POST",
        url: "/api/prompt",
        body: {
          prompt: "Your question here",
          maxTokens: 1000,
        },
      },
    },
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    availableRoutes: ["/", "/health", "/api/stats", "/api/prompt", "/api/test"],
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled Error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI endpoint: http://localhost:${PORT}/api/prompt`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
