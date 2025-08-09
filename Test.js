const axios = require("axios");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

async function sendPrompt(prompt) {
  try {
   const response = await fetch(`https://gemma-endpoint-fqc8.vercel.app/api/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 500,
        }),
      });

    
      console.log("✅ AI Response:", response);
        return response.data.response;
    
  } catch (error) {
    if (error.response) {
       console.error("❌ Server Error:", error.response.status, error.response.data);}
    
    return null;
  }
}

sendPrompt("What is the capital of France?")