import { z } from "zod";

/**
 * Freeform brand voice/personality descriptors (e.g. `["playful", "confident", "technical"]`),
 * produced by Vision AI in Phase 3. Kept as open strings rather than an enum because brand
 * voice is not a fixed taxonomy.
 */
export const VoiceSchema = z.array(z.string().min(1));
export type Voice = z.infer<typeof VoiceSchema>;
