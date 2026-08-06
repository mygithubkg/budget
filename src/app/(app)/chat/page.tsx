import { ChatInterface } from "@/components/chat/ChatInterface";

export const metadata = {
  title: "Chat — FinChat",
  description: "Log expenses and income using conversational AI.",
};

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return <ChatInterface />;
}
