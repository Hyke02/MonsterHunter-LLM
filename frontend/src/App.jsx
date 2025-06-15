import React, { useState, useRef, useEffect } from "react";

function App() {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    ///////////////////////////////////////////////////////////////////////
    // get chatHistory on page load
    ///////////////////////////////////////////////////////////////////////
    // Combine the two effects into one
    useEffect(() => {
        const savedMessages = localStorage.getItem("chatMessages");
        if (savedMessages) {
            setMessages(JSON.parse(savedMessages));
        }
        setLoaded(true);
    }, []); // This runs only on mount

// Add a condition to only save non-empty messages
    useEffect(() => {
        if (loaded && messages.length > 0) {  // Only save if loaded and we have messages
            localStorage.setItem("chatMessages", JSON.stringify(messages));
        }
    }, [messages, loaded]);

    ///////////////////////////////////////////////////////////////////////
    // ask questions
    ///////////////////////////////////////////////////////////////////////
    const askQuestion = async (e) => {
        if (!loaded) return;

        e.preventDefault();
        if (!userInput.trim()) return;

        const userMessage = { sender: "user", text: userInput };
        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);
        setUserInput("");

        try {
            const options = {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [...messages, userMessage].map(m => ({
                            role: m.sender === "user" ? "human" : "assistant",
                            content: m.text
                        }))
                    }),
            };

            const response = await fetch("http://localhost:3000/ask", options);
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let botMessage = { sender: "bot", text: "" };
            setMessages((prev) => [...prev, botMessage]);

            let accumulatedText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;

                const words = accumulatedText.split(/\s+/);
                accumulatedText = words.pop();

                for (let word of words) {
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;
                        updated[lastIndex] = {
                            ...updated[lastIndex],
                            text: updated[lastIndex].text + word + " ",
                        };
                        return updated;
                    });

                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
            }

            setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                updated[lastIndex] = {
                    ...updated[lastIndex],
                    text: updated[lastIndex].text + accumulatedText,
                };
                return updated;
            });

            setLoading(false);

        } catch (error) {
            const errorMsg = {
                sender: "bot",
                text: `Fout: ${error.message}`,
            };
            setMessages((prev) => [...prev, errorMsg]);
            setLoading(false);
        }
    };

    ///////////////////////////////////////////////////////////////////////
    // reset chatHistory
    ///////////////////////////////////////////////////////////////////////
    const resetChat = async () => {
        try {
            console.log("Huh")
            setMessages([]);
            localStorage.removeItem("chatMessages");
        } catch (error) {
            console.error("Fout bij resetten:", error);
        }
    };

    return (
        <div className="min-h-screen bg-mh-bg bg-cover flex flex-col items-center">
            {/* upper  */}
            <div className="w-full h-[8vh] items-center p-4 bg-[#1A1414] shadow-black shadow-2xl">
                <div className="w-full max-w-4xl flex items-center justify-between mx-auto">
                    <img src="./src/assets/mh-icon.png" alt="MH-icon" className="h-12"/>
                    <h1 className="text-3xl font-bold text-white uppercase font-bree">Ecological researcher</h1>
                    <button
                        onClick={resetChat}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Chat */}
            <div
                className="w-full max-h-[calc(100vh-20vh)] max-w-4xl flex-1 overflow-y-auto py-4 px-4 bg-black bg-opacity-60 space-y-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`rounded-lg px-4 py-2 max-w-fit font-arvo ${
                                msg.sender === "user"
                                    ? "bg-blue-500 text-white rounded-br-none animate-fadeIn"
                                    : "bg-white text-gray-900 rounded-bl-none shadow animate-fadeIn"
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-500 px-4 py-2 rounded-lg shadow max-w-xs rounded-bl-none italic animate-pulse">
                            ...
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="w-full max-w-4xl h-[12vh] bg-black bg-opacity-60"/>

            {/* under */}
            <div className="absolute bottom-0 left-[23vw] right-[23vw] p-4">
                <form
                    onSubmit={askQuestion}
                    className="p-4 h-[12vh] flex space-x-2 "
                >
                <textarea
                    className="flex-1 resize-none h-auto pl-4 pr-36 p-2 border border-gray-300 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#E4B453]"
                    placeholder="What would you like to ask the researcher..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            askQuestion(e);
                        }
                    }}
                    disabled={loading}
                    rows={1}
                />
                    <button
                        type="submit"
                        disabled={loading || !userInput.trim()}
                        className="absolute animate-fadeIn right-12 bottom-12 bg-[#E4B453] text-white px-10 py-3 rounded-3xl scrollbar hover:bg-[#E4B453] overf disabled:bg-[#83482F] disabled:text-black disabled:cursor-not-allowed"
                    >
                        Ask
                    </button>
                </form>
            </div>
        </div>
    );
}

export default App;