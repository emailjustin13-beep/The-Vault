import { auth } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const [userSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session!.user!.id!))
    .limit(1);

  return (
    <div className="pt-6 pb-12">
      <div className="px-4 md:px-6 mb-8">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Settings</h1>
        <p className="text-muted text-sm mt-1">Configure your Vault</p>
      </div>

      <div className="px-4 md:px-6 max-w-2xl">
        <SettingsClient
          initialSettings={userSettings || null}
          userId={session!.user!.id!}
        />
      </div>
    </div>
  );
}
