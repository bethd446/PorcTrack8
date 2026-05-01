-- V21 — Notes enrichies : photo + audio + tags
-- ═══════════════════════════════════════════════════════════════════════════
-- QuickNoteForm passe d'un simple textbox à un formulaire riche :
--   * photo_url  : URL Supabase Storage (bucket `farm-photos`, sous-dossier
--                  `notes/{farmId}/{noteId}-{timestamp}.jpg`).
--   * audio_url  : URL audio (bucket dédié V22) ou data URL inline (MVP V21).
--   * tags       : array text[] — labels prédéfinis (santé, repro, alimentation,
--                  bâtiment, accident, comportement, production, autre) +
--                  futurs tags custom (V22).
--
-- Index GIN sur `tags` pour permettre des requêtes du type
--   SELECT * FROM notes WHERE 'santé' = ANY(tags)
-- avec des perfs convenables sur les fermes ayant des centaines de notes.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS notes_tags_idx ON public.notes USING gin(tags);
