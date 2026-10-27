import { z } from "zod";

export const aiRequestSchema = z.object({
  tipo: z.enum(["descricao", "escopo", "cronograma"]),
  contexto: z.string().trim().min(1).max(4000)
});
