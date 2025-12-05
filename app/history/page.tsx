import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { HistoryClient } from "@/components/history-client";

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Summary History</h1>
            <p className="text-muted-foreground">
              View and manage your past video summaries
            </p>
          </div>

          <HistoryClient />
        </div>
      </main>
    </div>
  );
}
