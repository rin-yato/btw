# 05 — Question service

**Status:** removed

Removed — `QuestionService` was a thin wrapper around `AiService` that added SIGINT handling and `noThinking` filtering. These concerns belong in the command layer (Phase 8's `index.ts` rewrite). See `.scratch/08-switchover.md` for the consumer pattern.
