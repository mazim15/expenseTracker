"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyExpensesBetweenUsers } from "@/lib/utils/migration";

export default function MigratePage() {
  const [sourceUserId, setSourceUserId] = useState("D5yr9oeyInaejyc5eG3snGrs0Nz1");
  const [targetUserId, setTargetUserId] = useState("CKp1WUjvLAd11B6BwVF5cUQrmb63");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleMigration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const count = await copyExpensesBetweenUsers(sourceUserId, targetUserId);
      setResult(`Successfully copied ${count} expenses`);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="mb-6 text-2xl font-bold">Migrate User Expenses</h1>

      <div className="grid max-w-md gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Source User ID</label>
          <Input
            value={sourceUserId}
            onChange={(e) => setSourceUserId(e.target.value)}
            placeholder="Source User ID"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Target User ID</label>
          <Input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Target User ID"
          />
        </div>

        <Button onClick={handleMigration} disabled={isLoading || !sourceUserId || !targetUserId}>
          {isLoading ? "Migrating..." : "Migrate Expenses"}
        </Button>

        {result && (
          <div
            className={`mt-4 rounded p-3 ${result.startsWith("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
