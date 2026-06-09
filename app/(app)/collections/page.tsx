import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collections, collectionItems, mediaItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/utils";
import { BookOpen, Plus } from "lucide-react";

export default async function CollectionsPage() {
  const session = await auth();
  const userCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, session!.user!.id!));

  return (
    <div className="pt-6 pb-8">
      <div className="px-4 md:px-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Collections</h1>
          <p className="text-muted text-sm mt-1">{userCollections.length} collections</p>
        </div>
      </div>

      {userCollections.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <BookOpen className="w-12 h-12 text-muted/40 mb-4" />
          <h2 className="font-display font-bold text-xl text-white mb-2">No collections yet</h2>
          <p className="text-muted text-sm max-w-xs">
            Collections are created automatically when your library is scanned.
          </p>
        </div>
      ) : (
        <div className="px-4 md:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {userCollections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="group block"
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-card relative media-card">
                {col.backdropPath ? (
                  <Image
                    src={tmdbImageUrl(col.backdropPath, "w342")}
                    alt={col.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-card">
                    <BookOpen className="w-8 h-8 text-muted" />
                  </div>
                )}
                <div className="absolute inset-0 card-gradient" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm line-clamp-1">{col.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
