import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              YouTube Transcript Summarizer
            </h1>
            <p className="text-muted-foreground">
              Extract, summarize, and email YouTube video transcripts with AI
            </p>
          </div>

          <MainContent userEmail={session.user.email || ""} />
        </div>
      </main>
    </div>
  );
}
