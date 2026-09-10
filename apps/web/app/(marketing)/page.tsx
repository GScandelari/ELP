import { Button } from "@/components/ui/button";
import { EmulatorCheck } from "@/components/emulator-check";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl font-bold tracking-tight">
        Ensine inglês com atividades interativas
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Professores montam um repositório de atividades de leitura e escrita e as
        atribuem a salas virtuais. Alunos resolvem, o sistema corrige, e os
        resultados são liberados quando o professor decide.
      </p>

      <div className="mt-8 flex gap-3">
        <Button size="lg" disabled>
          Criar conta de professor (em breve)
        </Button>
        <Button size="lg" variant="outline" disabled>
          Entrar em uma sala (em breve)
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Projeto em construção — Fase 0 (fundação). Ver o plano em{" "}
        <code>docs/IMPLEMENTATION-PLAN.md</code>.
      </p>

      <EmulatorCheck />
    </div>
  );
}
