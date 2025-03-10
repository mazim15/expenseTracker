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
      <h1 className="text-2xl font-bold mb-6">Migrate User Expenses</h1>
      
      <div className="grid gap-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Source User ID</label>
          <Input 
            value={sourceUserId} 
            onChange={(e) => setSourceUserId(e.target.value)}
            placeholder="Source User ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Target User ID</label>
          <Input 
            value={targetUserId} 
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Target User ID"
          />
        </div>
        
        <Button 
          onClick={handleMigration} 
          disabled={isLoading || !sourceUserId || !targetUserId}
        >
          {isLoading ? "Migrating..." : "Migrate Expenses"}
        </Button>
        
        {result && (
          <div className={`mt-4 p-3 rounded ${result.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
} 