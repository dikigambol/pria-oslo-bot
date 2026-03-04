require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

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

    // Hanya respons untuk pesan dengan prefix
    if (!message.content.startsWith("!")) return;

    try {
        const userInput = message.content.substring(1);
        console.log(`📨 Pesan dari ${message.author.tag}: ${userInput}`);

        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY tidak ditemukan di .env");
        }

        // maintain per-channel conversation history
        const channelHistory = conversationHistory.get(message.channelId) || [];
        channelHistory.push({ role: 'user', content: userInput });

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "deepseek/deepseek-chat",
                messages: [
                    { role: "system", content: "Namamu adalah Jokodeh yaitu pria dari oslo yang Bijaksana, dulunya kamu dalah mantan presiden konoha ke 7, kamu lahir di oslo tahun 1960, tugasmu adalah menjawab pertanyaan apapun. Jawabnya singkat banget saja gaperlu banyak emot dan agak nyebelin ya." },
                    ...channelHistory,
                ],
                max_tokens: 500,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://pria-oslo-bot.vercel.app",
                    "X-Title": "Pria OSLO Bot",
                },
            }
        );

        // save assistant response into history
        if (response.data?.choices?.[0]?.message?.content) {
            channelHistory.push({ role: 'assistant', content: response.data.choices[0].message.content });
            conversationHistory.set(message.channelId, channelHistory);
        }

        if (!response.data?.choices?.[0]?.message?.content) {
            console.error("Response penuh:", JSON.stringify(response.data, null, 2));
            throw new Error("Response API tidak valid");
        }

        let reply = response.data.choices[0].message.content;

        // Batasi karakter (Discord max 2000)
        if (reply.length > 1990) {
            reply = reply.substring(0, 1990) + "...";
        }

        message.reply(reply);
        console.log(`✅ Reply dikirim`);
    } catch (err) {
        console.error("❌ Error:", err.message);
        if (err.response?.status) {
            console.error(`HTTP ${err.response.status}:`, err.response.data);
        }
        message.reply("Error bro 😅\nDetail: " + (err.message || "Unknown error"));
    }
});

client.login(process.env.DISCORD_TOKEN);