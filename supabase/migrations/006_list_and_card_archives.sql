ALTER TABLE public.lists
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lists_board_archived
ON public.lists(board_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_cards_list_archived
ON public.cards(list_id, is_archived);
