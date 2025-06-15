import express from 'express';
import cors from 'cors';
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const model = new AzureChatOpenAI({ temperature: 0.7 });

const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const engineerdPrompt = "Goal: You are a passionate Ecological Researcher in the world of Monster Hunter, brimming with knowledge about the monsters and their ecosystems. You are the expert, always ready to provide information to the user (who is curious about the nature of this world). You share your deep understanding of their behavior patterns, interactions, physical traits, and the ecosystems they are part of. Your focus is on their role within the broader natural world, not on combat. You respond as an expert, but with lots of enthusiasm and energy about the wonders of nature. You explain how the monsters behave, how they interact with their environment, and what unique traits they have. You might share details about their hunting behavior, social interactions, or how they influence the ecosystem. Keep your answers concise unless the user asks for more detailed information. For now: The user enters a building where you work, seeking information about monsters. You are ready to inform them.";
const chatHistory = [
    { role: "system", content: engineerdPrompt }
];

let monsterNames = []

let context = "";
const vectorStore = await FaissStore.load("./documents/vectorData", embeddings)

try {
    const relevantDocs = await vectorStore.similaritySearch("What is this document about?", 3);
    context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
} catch (error) {
    console.log(error);
}


async function fetchMonsterNames() {
    try {
        const response = await fetch("https://mhw-db.com/monsters");
        if (!response.ok) {
            throw new Error(`Failed to fetch monster names: ${response.statusText}`);
        }
        const monsters = await response.json();
        monsterNames = monsters.map((monster) => monster.name.toLowerCase());
    } catch (error) {
        console.error("Error fetching monster names:", error);
        monsterNames = [];
    }
}

(async function initializeApp() {
    try {
        await fetchMonsterNames();
        app.listen(3000, () => console.log(`Monster Hunter Chatbot draait op http://localhost:3000`));
    } catch (error) {
        console.error("Failed to initialize application:", error);
    }
})();

///////////////////////////////////////////////////////////////////////
// ask questions + streaming
///////////////////////////////////////////////////////////////////////
app.post('/ask', async (req, res) => {
    const messages = req.body.messages;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "No messages array input." });
    }

    const reversedMessages = [...messages].reverse();
    const lastHumanMessage = reversedMessages.find(m => m.role === "human");

    if (!lastHumanMessage) {
        return res.status(400).json({ message: "No human prompt found." });
    }

    const prompt = lastHumanMessage.content;

    try {
        const lowerPrompt = prompt.toLowerCase();
        const foundMonster = monsterNames.find(name => lowerPrompt.includes(name));
        let monsterDataText = "";
        console.log(foundMonster)
        if (foundMonster) {
            const apiResponse = await fetch(`https://mhw-db.com/monsters?q={"name":"${ foundMonster }"}`);
            const monsterData = await apiResponse.json();

            if (monsterData.length > 0) {
                const monster = monsterData[0];
                monsterDataText = `This is information about the monster from an official database ${ monster.name }: ${ monster.description }. User question:`;
                console.log(monsterDataText)
            }
        }

        let vectorContext = "";
        try {
            const relevantDocs = await vectorStore.similaritySearch(prompt, 3);
            vectorContext = relevantDocs.map(doc => doc.pageContent).join("\n\n");
        } catch (error) {
            console.error("Fout bij ophalen vector documenten:", error);
        }

        const combinedPrompt = `${monsterDataText} Here is some background research from field notes: ${vectorContext} User's question: ${prompt}`.trim();
        console.log(combinedPrompt)

        const enrichedPrompt = { role: "human", content: combinedPrompt };

        const formattedMessages = [
            { role: "system", content: engineerdPrompt },
            ...messages,
            enrichedPrompt
        ];

        const promptTemplate = ChatPromptTemplate.fromMessages(formattedMessages);
        const messagesForModel = await promptTemplate.formatMessages({});

        const stream = await model.stream(messagesForModel);
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");

        let aiAnswer = '';

        for await (const chunk of stream) {
            aiAnswer += chunk.content;
            res.write(chunk.content);
        }

        chatHistory.push({ role: "assistant", content: aiAnswer });

        res.end();

    } catch (error) {
        console.error("Fout bij AI:", error);
        res.status(500).json({ message: "Er ging iets mis met de chatbot." });
    }
});

app.post('/chat', async (req, res) => {})

