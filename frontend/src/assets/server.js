import express from 'express';
import cors from 'cors';
import { AzureChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import axios from 'axios'

const model = new AzureChatOpenAI({ temperature: 0.7 });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const engineerdPrompt = "Goal: You are a passionate Ecological Researcher in the world of Monster Hunter, brimming with knowledge about the monsters and their ecosystems. You are the expert, always ready to provide information to the user (who is curious about the nature of this world). You share your deep understanding of their behavior patterns, interactions, physical traits, and the ecosystems they are part of. Your focus is on their role within the broader natural world, not on combat. You respond as an expert, but with lots of enthusiasm and energy about the wonders of nature. You explain how the monsters behave, how they interact with their environment, and what unique traits they have. You might share details about their hunting behavior, social interactions, or how they influence the ecosystem. Keep your answers concise unless the user asks for more detailed information. For now: The user enters a building where you work, seeking information about monsters. You are ready to inform them.";

let monsterNames = []
async function fetchMonsterNames() {
    const response = await fetch("https://mhw-db.com/monsters");
    const monsters = await response.json();
    monsterNames = monsters.map(monster => monster.name.toLowerCase());
}

const chatHistory = [
    { role: "system", content: engineerdPrompt }
];
///////////////////////////////////////////////////////////////////////
// ask questions + streaming
///////////////////////////////////////////////////////////////////////
app.post('/ask', async (req, res) => {
    const prompt = req.body.prompt;

    if (!prompt) {
        return res.status(400).json({ message: "no prompt input." });
    }

    try {
        // Check if a monster name is mentioned in the prompt
        const lowerPrompt = prompt.toLowerCase();
        const foundMonster = monsterNames.find(name => lowerPrompt.includes(name));
        let monsterDataText = "";

        if (foundMonster) {
            // If a monster is found, fetch its data (you can adjust this part)
            const apiResponse = await fetch(`https://mhw-db.com/monsters?q={"name":"${foundMonster}"}`);
            const monsterData = await apiResponse.json();

            if (monsterData.length > 0) {
                const monster = monsterData[0];
                monsterDataText = `This is information about the monster from an official database ${monster.name}: ${monster.description}. User question:`;
                console.log(monsterDataText)
            }
        }

        // Add user prompt and monster data (if found) to chat history
        chatHistory.push({ role: "user", content: `${monsterDataText} ${prompt}` });

        const promptTemplate = ChatPromptTemplate.fromMessages(
            chatHistory.map(msg => [msg.role, msg.content])
        );
        const formattedMessages = await promptTemplate.formatMessages({});

        const stream = await model.stream(formattedMessages);
        res.setHeader("Content-Type", "text/plain");

        let aiAnswer = '';

        for await (const chunk of stream) {
            aiAnswer += chunk.content;
            res.write(chunk.content);
            res.flush();
        }

        // Add AI response to chat history
        chatHistory.push({ role: "assistant", content: aiAnswer });

        res.end();

    } catch (error) {
        console.error("Fout bij AI:", error);
        res.status(500).json({ message: "Er ging iets mis met de chatbot." });
    }
});

///////////////////////////////////////////////////////////////////////
// chatHistory
///////////////////////////////////////////////////////////////////////
app.get('/history', (req, res) => {
    const historyWithoutSystem = chatHistory
        .filter(msg => msg.role === "user" || msg.role === "assistant")
        .map(msg => ({
            sender: msg.role === "user" ? "user" : "bot",
            text: msg.content
        }));

    res.json({ history: historyWithoutSystem });
});

///////////////////////////////////////////////////////////////////////
// reset chatHistory
///////////////////////////////////////////////////////////////////////
app.post('/reset', (req, res) => {
    chatHistory.splice(1);
    console.log(`Chathistory is gereset`);
    res.json({ message: `Chathistory is gereset` });
});

app.listen(3000, () => console.log(`Monster Hunter Chatbot draait op http://localhost:3000`));
