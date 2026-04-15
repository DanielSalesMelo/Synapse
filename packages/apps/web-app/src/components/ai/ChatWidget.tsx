import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
interface Message { sender: 'user' | 'corey'; text: string; }
const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(scrollToBottom, [messages]);
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      setMessages([{ sender: 'corey', text: 'Olá! Eu sou o Corey, seu assistente de IA. Como posso ajudar hoje?' }]);
    }
  };
  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:3001';
      // SINTAXE CORRETA E SIMPLES
      const response = await axios.post(`${apiUrl}/api/v1/ai/chat`, {
        question: input,
        userId: 'user-from-auth',
        tenantId: 'tenant-from-auth',
        userRole: 'role-from-auth'
      } );
      const coreyMessage: Message = { sender: 'corey', text: response.data.answer };
      setMessages(prev => [...prev, coreyMessage]);
    } catch (error) {
      console.error("Erro ao contatar a IA:", error);
      const errorMessage: Message = { sender: 'corey', text: 'Desculpe, estou com dificuldades para me conectar. Por favor, tente novamente mais tarde.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {!isOpen && (<button onClick={toggleChat} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '50%', width: '60px', height: '60px', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}></button>)}
      {isOpen && (
        <div style={{ width: '350px', height: '500px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#f1f1f1', padding: '10px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}><span>Corey (Assistente IA)</span><button onClick={toggleChat} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}></button></div>
          <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, index) => (<div key={index} style={msg.sender === 'user' ? { alignSelf: 'flex-end', backgroundColor: '#007bff', color: 'white', padding: '8px 12px', borderRadius: '15px 15px 0 15px', maxWidth: '80%' } : { alignSelf: 'flex-start', backgroundColor: '#e9e9eb', color: 'black', padding: '8px 12px', borderRadius: '15px 15px 15px 0', maxWidth: '80%' }}>{msg.text}</div>))}
            {isLoading && <div style={{ alignSelf: 'flex-start', backgroundColor: '#e9e9eb', color: 'black', padding: '8px 12px', borderRadius: '15px 15px 15px 0', maxWidth: '80%' }}>Digitando...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ display: 'flex', padding: '10px', borderTop: '1px solid #ccc' }}><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Pergunte algo ao Corey..." style={{ flex: 1, border: '1px solid #ccc', borderRadius: '20px', padding: '10px', marginRight: '10px' }} disabled={isLoading} /><button onClick={handleSend} style={{ border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '20px', padding: '10px 15px', cursor: 'pointer' }} disabled={isLoading}>Enviar</button></div>
        </div>
      )}
    </div>
  );
};
export default ChatWidget;
