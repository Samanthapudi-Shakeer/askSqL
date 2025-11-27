'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/layout/Logo';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { DisconnectButton } from '@/components/ui/DisconnectButton';
import { ResponseModes } from '@/components/common/ResponseModes';

import { Message } from '@/types/chat';
import { BackgroundEffect } from '@/components/effects/BackgroundEffect';

export default function DatabaseChat() {
    const [vizEnabled, setVizEnabled] = useState(false);
    const [tabularMode, setTabularMode] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showInitialText, setShowInitialText] = useState(true);
    const [isEntering, setIsEntering] = useState(false);
    
    const [connectedDBInfo, setConnectedDBInfo] = useState<{
      type: string;
      name: string;
    } | null>(null);
  
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const dbType = params.get('dbType');
      const dbName = params.get('dbName');
      
      if (dbType && dbName) {
        setConnectedDBInfo({
          type: dbType,
          name: dbName
        });
        return;
      }
  
      const checkConnection = async () => {
        try {
          const response = await fetch('http://localhost:8000/check-connection');
          const data = await response.json();
          
          if (data.is_connected) {
            setConnectedDBInfo({
              type: data.db_type,
              name: data.database_name || 'Database'
            });
          } else {
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Error checking connection:', error);
          window.location.href = '/';
        }
      };
  
      checkConnection();
      setTimeout(() => setIsEntering(true), 100);
    }, []);
  
    const handleSendMessage = async (message: string) => {
        try {
          setIsLoading(true);
          setShowInitialText(false);
          setMessages(prev => [...prev, { 
            role: 'user', 
            content: message 
          }]);
      
          const response = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              query: message,
              vizEnabled: vizEnabled,
              tabularMode: tabularMode
            }),
          });
        
      
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.detail || 'Failed to get response');
          }
          
          const formatTableName = (text: string) => {
            return text.replace(/\*\*(.*?)\*\*/g, '__$1__');  // Using underscores for bold
          };
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `SQL Query Used:\n\`\`\`sql\n${data.query_used || 'Query not available'}\n\`\`\`\n\nResult:\n${formatTableName(data.query_result)}`,
            viz_result: data.viz_result,
            vizEnabledState: vizEnabled,
            tabularMode: tabularMode  // Add this to track tabular mode state
          }]);
        } catch (error) {
            console.error('Error querying database:', error);
            const errorMessage = error instanceof Error ? error.message : 'Sorry, I encountered an error processing your query.';
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: errorMessage
            }]);
          }  finally {
            setIsLoading(false);
          }
        };
    const handleDisconnect = async () => {
      try {
        const response = await fetch('http://localhost:8000/disconnect-database', {
          method: 'POST'
        });
        if (response.ok) {
          setConnectedDBInfo(null);
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    };
  
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
          <div className="absolute inset-0 z-0">
            <BackgroundEffect />
          </div>
          <div className="relative z-10">
            <Logo minimal isTransitioning />

            {connectedDBInfo && (
              <div className="fixed top-4 right-4 z-[100]">
                <DisconnectButton
                  dbType={connectedDBInfo.type}
                  dbName={connectedDBInfo.name}
                  onDisconnect={handleDisconnect}
                />
              </div>
            )}

            <div className="max-w-7xl mx-auto px-6 pt-16 pb-28 space-y-8">
              <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-100/60 shadow-xl p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-500 font-semibold">aSQl Workspace</p>
                  <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    Conversational insights, perfectly aligned
                  </h1>
                  <p className="text-gray-600 max-w-2xl">
                    Chat with your connected database, toggle visualizations or tabular output, and keep every answer neatly organized.
                  </p>
                </div>
                {connectedDBInfo && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-4 py-3 rounded-2xl shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
                      {connectedDBInfo.type.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Connected</p>
                      <p className="text-sm font-medium text-gray-800">{connectedDBInfo.name}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
                <div className="space-y-4 lg:sticky lg:top-28">
                  <ResponseModes
                    tabularEnabled={tabularMode}
                    setTabularEnabled={setTabularMode}
                    vizEnabled={vizEnabled}
                    setVizEnabled={setVizEnabled}
                  />
                  {showInitialText && (
                    <div className="rounded-2xl bg-white/70 border border-gray-100/70 shadow-sm p-4 text-sm text-gray-600">
                      Start by asking a question about your tables or request a quick visualization.
                    </div>
                  )}
                </div>

                <div className={`rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-100/70 shadow-xl flex flex-col h-[75vh] transition-all duration-500 ${
                  isEntering ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}>
                  <div className="flex-1 overflow-hidden px-2 py-6">
                    <ChatMessages
                      messages={messages}
                      isLoading={isLoading}
                      tabularMode={tabularMode}
                    />
                  </div>
                </div>
              </div>
            </div>

            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </div>
        </main>
      );
    }