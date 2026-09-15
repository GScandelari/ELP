import { MultipleChoiceRenderer } from "@/components/multiple-choice-renderer";
import { FillInBlanksRenderer } from "@/components/fill-in-blanks-renderer";
import { TranslationRenderer } from "@/components/translation-renderer";
import { MeaningMatchingRenderer } from "@/components/meaning-matching-renderer";
import type { AssignmentContentEntry } from "@/lib/assignments";
import type { ActivityType } from "@/lib/activities";

/**
 * Mostra o `contentSnapshot` congelado de um assignment com o Renderer do
 * tipo certo — os mesmos componentes usados na pré-visualização do
 * professor em `/atividades/[activityId]` (docs/plano-fase-3.md §1.1),
 * agora lendo do snapshot já congelado (o formato de `content` é
 * exatamente o que `toStudentContent` do handler produziu ao publicar,
 * sem gabarito) em vez de observar os itens ao vivo.
 */
export function AssignmentContentPreview({
  type,
  contentSnapshot,
}: {
  type: ActivityType;
  contentSnapshot: AssignmentContentEntry[];
}) {
  const items = contentSnapshot.map((entry) => entry.content);

  if (type === "MULTIPLE_CHOICE") {
    return (
      <MultipleChoiceRenderer
        items={items as { question: string; options: string[] }[]}
      />
    );
  }
  if (type === "FILL_IN_BLANKS") {
    return (
      <FillInBlanksRenderer
        items={
          items as {
            mode: "TYPING" | "WORD_BANK";
            text: string;
            blankIds: string[];
            wordBank?: string[];
          }[]
        }
      />
    );
  }
  if (type === "TRANSLATION") {
    return (
      <TranslationRenderer
        items={
          items as {
            mode: "MULTIPLE_CHOICE" | "INDEXING";
            source: string;
            options: string[];
          }[]
        }
      />
    );
  }
  return (
    <MeaningMatchingRenderer
      items={
        items as {
          leftItems: { id: string; left: string }[];
          rightItems: { id: string; right: string }[];
        }[]
      }
    />
  );
}
