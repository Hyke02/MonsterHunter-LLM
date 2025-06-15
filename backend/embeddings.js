import {AzureOpenAIEmbeddings} from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";

const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
})

async function createEmbedding() {
    const loader = new PDFLoader("./documents/Monster-Hunter-Monster-Manual.pdf");
    const data = await loader.load()

    const textSplitter = new RecursiveCharacterTextSplitter(
        {chunkSize: 1500, chunkOverlap: 200}
    )
    const splitDocs = await textSplitter.splitDocuments(data)

    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings)
    await vectorStore.save("./documents/")
    console.log("Vectordata has been saved!")
}

createEmbedding()