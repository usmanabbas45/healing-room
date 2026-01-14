"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: ProductRecommendation[];
}

interface ProductRecommendation {
  id: string;
  name: string;
  price: number;
  category: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep focus on input whenever chat is open and not loading
  useEffect(() => {
    if (isOpen && !isLoading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoading, messages]);

  // Add greeting when chat opens for the first time
  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Welcome to Healing Room. I'm here to assist you with product information and recommendations. How may I help you today?"
      }]);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          query: userMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      
      setMessages([...newMessages, {
        role: "assistant",
        content: data.message,
        products: data.products,
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...newMessages, {
        role: "assistant",
        content: "I apologize, but I'm currently experiencing connection difficulties. Please try again in a moment, or contact us directly at info@healingroomsixnations.ca for immediate assistance.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  return (
    <>
      {/* Chat Button with Label */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Label - hidden when chat is open */}
        {!isOpen && (
          <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-border-primary animate-pulse">
            <span className="text-sm font-medium text-text-primary whitespace-nowrap">Ask an Expert</span>
          </div>
        )}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
            isOpen 
              ? "bg-text-primary rotate-0" 
              : "bg-primary hover:bg-primary-dark hover:scale-105"
          }`}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>

      {/* Notification dot */}
      {!isOpen && !hasGreeted && (
        <span className="fixed bottom-[76px] right-7 z-50 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      )}

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl border border-border-primary overflow-hidden transition-all duration-300 flex flex-col ${
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ height: "500px", maxHeight: "calc(100vh - 120px)" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Healing Room" width={28} height={28} className="object-contain" />
            </div>
            <h3 className="font-semibold text-white">Cannabis Consultant</h3>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#faf8f5]">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-white text-text-primary shadow-sm border border-border-primary rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                
                {/* Product Recommendations - only show if this message has products */}
                {message.products && message.products.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-primary/50 space-y-2">
                    {message.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/${product.category}/${product.id}`}
                        className="flex justify-between items-center bg-white/50 rounded-lg p-2.5 hover:bg-white transition-colors border border-border-primary/30"
                      >
                        <span className="text-sm font-medium text-text-primary truncate pr-2">
                          {product.name}
                        </span>
                        <span className="text-sm text-primary font-semibold whitespace-nowrap">
                          ${product.price.toFixed(2)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-border-primary">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>


        {/* Input */}
        <div className="p-4 bg-white border-t border-border-primary">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isLoading ? "Processing..." : "Type your question here..."}
              className="flex-1 px-4 py-3 bg-bg-alt rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

