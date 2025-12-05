"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummarizerForm } from "./summarizer-form";
import { BatchInput } from "./batch-input";

interface MainContentProps {
  userEmail: string;
}

export function MainContent({ userEmail }: MainContentProps) {
  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="single">Single Video</TabsTrigger>
        <TabsTrigger value="batch">Batch Processing</TabsTrigger>
      </TabsList>
      <TabsContent value="single" className="mt-6">
        <SummarizerForm userEmail={userEmail} />
      </TabsContent>
      <TabsContent value="batch" className="mt-6">
        <BatchInput userEmail={userEmail} />
      </TabsContent>
    </Tabs>
  );
}
