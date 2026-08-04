import { Calendar, User } from "lucide-react";

interface CandidateEditorialBioProps {
  bio: string;
  name: string;
  publishedAt?: string;
}

export function CandidateEditorialBio({
  bio,
  name,
  publishedAt,
}: CandidateEditorialBioProps) {
  return (
    <section className="border-t border-border pt-8 mt-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Quem é {name}?</h2>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {bio}
          </p>
        </div>

        {publishedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Atualizado em {new Date(publishedAt).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
      </div>
    </section>
  );
}