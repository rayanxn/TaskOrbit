-- Phase 4: Card metadata foundation
-- Adds labels, checklist, comments, attachments, and activity.

-- ============================================
-- 1a. BOARD LABELS
-- ============================================
CREATE TABLE board_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_labels_board ON board_labels(board_id);

CREATE TRIGGER update_board_labels_updated_at
  BEFORE UPDATE ON board_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 1b. CARD LABELS
-- ============================================
CREATE TABLE card_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES board_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, label_id)
);

CREATE INDEX idx_card_labels_card ON card_labels(card_id);
CREATE INDEX idx_card_labels_label ON card_labels(label_id);

-- ============================================
-- 1c. CHECKLISTS
-- ============================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_card ON checklists(card_id);

CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 1d. CHECKLIST ITEMS
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 1e. CARD COMMENTS
-- ============================================
CREATE TABLE card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_comments_card ON card_comments(card_id);
CREATE INDEX idx_card_comments_user ON card_comments(user_id);

CREATE TRIGGER update_card_comments_updated_at
  BEFORE UPDATE ON card_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 1f. CARD ATTACHMENTS
-- ============================================
CREATE TABLE card_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_attachments_card ON card_attachments(card_id);
CREATE INDEX idx_card_attachments_user ON card_attachments(user_id);

-- ============================================
-- 1g. CARD ACTIVITY
-- ============================================
CREATE TABLE card_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_activity_card ON card_activity(card_id);
CREATE INDEX idx_card_activity_user ON card_activity(user_id);

-- ============================================
-- 1h. RLS
-- ============================================
ALTER TABLE board_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labels on accessible boards"
  ON board_labels FOR SELECT
  USING (user_can_view_board(board_id));

CREATE POLICY "Editors can manage board labels"
  ON board_labels FOR ALL
  USING (user_can_edit_board_content(board_id))
  WITH CHECK (user_can_edit_board_content(board_id));

CREATE POLICY "Users can view card labels"
  ON card_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_labels.card_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Editors can manage card labels"
  ON card_labels FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_labels.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_labels.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Users can view checklists"
  ON checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = checklists.card_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Editors can manage checklists"
  ON checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = checklists.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = checklists.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Users can view checklist items"
  ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM checklists
      JOIN cards ON cards.id = checklists.card_id
      JOIN lists ON lists.id = cards.list_id
      WHERE checklists.id = checklist_items.checklist_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Editors can manage checklist items"
  ON checklist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM checklists
      JOIN cards ON cards.id = checklists.card_id
      JOIN lists ON lists.id = cards.list_id
      WHERE checklists.id = checklist_items.checklist_id
        AND user_can_edit_board_content(lists.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM checklists
      JOIN cards ON cards.id = checklists.card_id
      JOIN lists ON lists.id = cards.list_id
      WHERE checklists.id = checklist_items.checklist_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Users can view card comments"
  ON card_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_comments.card_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Editors can create card comments"
  ON card_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_comments.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Authors or admins can update card comments"
  ON card_comments FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_comments.card_id
        AND user_can_admin_board(lists.board_id)
    )
  );

CREATE POLICY "Authors or admins can delete card comments"
  ON card_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_comments.card_id
        AND user_can_admin_board(lists.board_id)
    )
  );

CREATE POLICY "Users can view card attachments"
  ON card_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_attachments.card_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Editors can create card attachments"
  ON card_attachments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_attachments.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Authors or admins can delete card attachments"
  ON card_attachments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_attachments.card_id
        AND user_can_admin_board(lists.board_id)
    )
  );

CREATE POLICY "Users can view card activity"
  ON card_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_activity.card_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Editors can create card activity"
  ON card_activity FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM cards
      JOIN lists ON lists.id = cards.list_id
      WHERE cards.id = card_activity.card_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

-- ============================================
-- 1i. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE card_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE card_activity;
