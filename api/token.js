// Node.js 18+ has native fetch, so we don't need node-fetch
import { instructions } from "../constants/prompt.js";

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }

        const sessionConfig = {
            session: {
                type: "realtime",
                model: "gpt-4o-mini-realtime-preview",
                audio: {
                    output: {
                        voice: req.query.voice || "marin",
                    },
                },
                instructions: instructions,
            },
        };

        const response = await fetch(
            "https://api.openai.com/v1/realtime/client_secrets",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sessionConfig),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API error:", data);
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Error generating token:", error);
        res.status(500).json({ error: "Failed to generate session token" });
    }
}
