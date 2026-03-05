require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const express = require("express");

// ======================
// EXPRESS SERVER (WAJIB UNTUK RENDER)
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("🟢 Jokodeh Bot is alive");
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ======================
// DISCORD BOT
// ======================

// in-memory map to track conversation for each channel
const conversationHistory = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", () => {
    console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!")) return;

    try {
        const userInput = message.content.substring(1).trim();
        if (!userInput) return;

        console.log(`📨 Pesan dari ${message.author.tag}: ${userInput}`);

        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY tidak ditemukan");
        }

        // Ambil history channel
        const channelHistory = conversationHistory.get(message.channelId) || [];
        channelHistory.push({ role: "user", content: userInput });

        // 🔥 Batasi history maksimal 20 pesan
        if (channelHistory.length > 20) {
            channelHistory.splice(0, channelHistory.length - 20);
        }

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "deepseek/deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content:
                            "Namamu adalah Jokodeh yaitu pria dari oslo yang Bijaksana, dulunya kamu adalah mantan presiden konoha ke 7, kamu lahir di oslo tahun 1960, tugasmu adalah menjawab pertanyaan apapun. Jawabnya singkat banget saja gaperlu banyak emot dan agak nyebelin ya.",
                    },
                    ...channelHistory,
                ],
                max_tokens: 500,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const aiReply = response.data?.choices?.[0]?.message?.content;

        if (!aiReply) {
            console.error("Response invalid:", response.data);
            throw new Error("Response API tidak valid");
        }

        // Simpan jawaban AI
        channelHistory.push({ role: "assistant", content: aiReply });
        conversationHistory.set(message.channelId, channelHistory);

        let reply = aiReply;

        // Discord limit 2000 karakter
        if (reply.length > 1990) {
            reply = reply.substring(0, 1990) + "...";
        }

        await message.reply(reply);
        console.log("✅ Reply dikirim");
    } catch (err) {
        console.error("❌ Error:", err.message);
        if (err.response?.status) {
            console.error(`HTTP ${err.response.status}:`, err.response.data);
        }

        message.reply("Error bro 😅");
    }
});

client.login(process.env.DISCORD_TOKEN);