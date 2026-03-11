CREATE TABLE IF NOT EXISTS public.board_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 40),
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select')),
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.card_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.board_custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date TIMESTAMPTZ,
  value_option TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_board_custom_fields_board
ON public.board_custom_fields(board_id);

CREATE INDEX IF NOT EXISTS idx_card_custom_field_values_card
ON public.card_custom_field_values(card_id);

CREATE TRIGGER update_board_custom_fields_updated_at
  BEFORE UPDATE ON public.board_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_card_custom_field_values_updated_at
  BEFORE UPDATE ON public.card_custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.board_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board custom fields are viewable by board viewers"
ON public.board_custom_fields
FOR SELECT
USING (public.user_can_view_board(board_id));

CREATE POLICY "board custom fields are manageable by board admins"
ON public.board_custom_fields
FOR ALL
USING (public.user_can_admin_board(board_id))
WITH CHECK (public.user_can_admin_board(board_id));

CREATE POLICY "card custom field values are viewable by board viewers"
ON public.card_custom_field_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.board_custom_fields
    WHERE board_custom_fields.id = card_custom_field_values.field_id
      AND public.user_can_view_board(board_custom_fields.board_id)
  )
);

CREATE POLICY "card custom field values are editable by board members"
ON public.card_custom_field_values
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.board_custom_fields
    WHERE board_custom_fields.id = card_custom_field_values.field_id
      AND public.user_can_edit_board_content(board_custom_fields.board_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.board_custom_fields
    WHERE board_custom_fields.id = card_custom_field_values.field_id
      AND public.user_can_edit_board_content(board_custom_fields.board_id)
  )
);
