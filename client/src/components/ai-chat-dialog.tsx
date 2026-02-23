import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Sparkles, 
  Loader2, 
  Bot, 
  User, 
  Plus, 
  MessageSquare, 
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { ProjectWithTasks, Conversation, ConversationWithMessages } from "@shared/schema";

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectWithTasks[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hello! I'm your AI project assistant. I can create new projects and tasks, update progress, identify roadblocks, and suggest next steps. Just tell me what you'd like to do!"
};

export function AIChatDialog({ open, onOpenChange, projects }: AIChatDialogProps) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/conversations", { title });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      refetchConversations();
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      refetchConversations();
      if (currentConversationId === deleteConversationMutation.variables) {
        startNewConversation();
      }
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([WELCOME_MESSAGE]);
    setInput("");
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const conversation: ConversationWithMessages = await res.json();
      
      const loadedMessages: ChatMessage[] = conversation.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      
      if (loadedMessages.length === 0) {
        loadedMessages.push(WELCOME_MESSAGE);
      }
      
      setCurrentConversationId(conversationId);
      setMessages(loadedMessages);
    } catch (error) {
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    let convId = currentConversationId;
    
    if (!convId) {
      try {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
        const res = await apiRequest("POST", "/api/conversations", { title });
        const newConv = await res.json();
        convId = newConv.id;
        setCurrentConversationId(convId);
        refetchConversations();
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    }

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          conversationId: convId,
          context: {
            projects: projects.map(p => ({
              id: p.id,
              name: p.name,
              percentComplete: p.percentComplete,
              status: p.status,
              roadblocks: p.roadblocks,
              tasks: flattenTasks(p.tasks)
            }))
          }
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMessage += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { 
                  role: "assistant", 
                  content: assistantMessage 
                };
                return newMessages;
              });
            }
            if (data.done) {
              if (data.actionsExecuted) {
                queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
              }
              refetchConversations();
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      toast({ title: "Failed to get AI response", variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[700px] flex flex-col p-0" data-testid="dialog-ai-chat">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2" data-testid="text-ai-dialog-title">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              AI Project Assistant
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={startNewConversation}
                data-testid="button-new-conversation"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Chat
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                data-testid="button-toggle-sidebar"
              >
                {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {showSidebar && (
            <div className="w-64 border-r flex flex-col bg-muted/30" data-testid="container-conversation-sidebar">
              <div className="p-3 border-b">
                <h3 className="text-sm font-medium text-muted-foreground" data-testid="text-sidebar-title">
                  Conversation History
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1" data-testid="list-conversations">
                  {(!conversations || conversations.length === 0) ? (
                    <p className="text-xs text-muted-foreground text-center py-4" data-testid="text-no-conversations">
                      No saved conversations yet
                    </p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${
                          currentConversationId === conv.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => loadConversation(conv.id)}
                        data-testid={`button-conversation-${conv.id}`}
                      >
                        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" data-testid={`text-conversation-title-${conv.id}`}>
                            {conv.title}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-conversation-date-${conv.id}`}>
                            {formatDate(conv.updatedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversationMutation.mutate(conv.id);
                          }}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 px-6" ref={scrollRef}>
              <div className="py-4 space-y-4" data-testid="container-chat-messages">
                {messages.map((message, i) => (
                  <div 
                    key={i}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                    data-testid={`chat-message-${i}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div 
                      className={`rounded-lg px-4 py-3 max-w-[80%] ${
                        message.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}
                      data-testid={`text-message-content-${i}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-3" data-testid="indicator-ai-loading">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me to update tasks, identify blockers, or suggest next steps..."
                  className="min-h-[60px] resize-none"
                  disabled={isStreaming}
                  data-testid="input-ai-message"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!input.trim() || isStreaming}
                  size="icon"
                  className="h-[60px] w-[60px]"
                  data-testid="button-send-ai-message"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-ai-hint">
                Try: "Create a new project called Q2 Planning" or "Mark the homepage task as 50% complete"
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function flattenTasks(tasks: any[], result: any[] = []): any[] {
  for (const task of tasks) {
    result.push({
      id: task.id,
      name: task.name,
      percentComplete: task.percentComplete,
      isCompleted: task.isCompleted,
      status: task.status,
      roadblocks: task.roadblocks,
      parentTaskId: task.parentTaskId
    });
    if (task.children?.length) {
      flattenTasks(task.children, result);
    }
  }
  return result;
}
