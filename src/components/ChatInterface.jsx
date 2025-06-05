import React, { useState, useRef, useEffect } from 'react';
import { sendToSpark } from '../utils/sparkApi';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '您好！我是AI客服小助手，有什么可以帮助您的吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // 创建AI消息占位符
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);

    // 调用讯飞星火API
    wsRef.current = sendToSpark(
      currentInput,
      (content) => {
        // 收到AI回复时更新消息
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: msg.content + content }
              : msg
          )
        );
      },
      (error) => {
        // 处理错误
        console.error('AI回复错误:', error);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: '抱歉，我暂时无法回答您的问题，请稍后再试。' }
              : msg
          )
        );
        setIsTyping(false);
      }
    );

    // 监听WebSocket状态
    if (wsRef.current) {
      wsRef.current.onclose = () => {
        setIsTyping(false);
      };
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickReplies = [
    '产品咨询',
    '订单查询',
    '售后服务',
    '技术支持'
  ];

  const handleQuickReply = (reply) => {
    setInputValue(reply);
  };

  // 组件卸载时关闭WebSocket连接
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-info">
          <div className="avatar">AI</div>
          <div className="title">
            <h3>AI客服助手</h3>
            <span className="status">在线</span>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'ai' ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                {message.content}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message ai">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-replies">
        {quickReplies.map((reply, index) => (
          <button 
            key={index}
            className="quick-reply-btn"
            onClick={() => handleQuickReply(reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入您的问题..."
            className="message-input"
            rows="1"
          />
          <button 
            onClick={handleSend}
            className="send-button"
            disabled={!inputValue.trim() || isTyping}
          >
            {isTyping ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
