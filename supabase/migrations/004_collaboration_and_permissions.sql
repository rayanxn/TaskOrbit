-- Phase 3: Collaboration and permissions
-- Adds board visibility, memberships, invitations, and collaborative RLS policies.

-- ============================================
-- 1a. ADD VISIBILITY TO BOARDS
-- ============================================
ALTER TABLE boards
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private',
  ADD CONSTRAINT boards_visibility_check CHECK (visibility IN ('private', 'public'));

-- ============================================
-- 1b. BOARD MEMBERSHIPS
-- ============================================
CREATE TABLE board_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

CREATE INDEX idx_board_memberships_board ON board_memberships(board_id);
CREATE INDEX idx_board_memberships_user ON board_memberships(user_id);

CREATE TRIGGER update_board_memberships_updated_at
  BEFORE UPDATE ON board_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 1c. BOARD INVITATIONS
-- ============================================
CREATE TABLE board_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_invitations_board ON board_invitations(board_id);
CREATE INDEX idx_board_invitations_email ON board_invitations(lower(invitee_email));
CREATE UNIQUE INDEX idx_board_invitations_pending_unique
  ON board_invitations(board_id, lower(invitee_email))
  WHERE status = 'pending';

CREATE TRIGGER update_board_invitations_updated_at
  BEFORE UPDATE ON board_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 1d. RLS HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION user_can_view_board(target_board_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM boards
    WHERE id = target_board_id
      AND (
        owner_id = auth.uid()
        OR visibility = 'public'
      )
  ) OR EXISTS (
    SELECT 1
    FROM board_memberships
    WHERE board_id = target_board_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_can_edit_board_content(target_board_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM boards
    WHERE id = target_board_id
      AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM board_memberships
    WHERE board_id = target_board_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_can_admin_board(target_board_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM boards
    WHERE id = target_board_id
      AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM board_memberships
    WHERE board_id = target_board_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 1e. DROP EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own boards" ON boards;
DROP POLICY IF EXISTS "Users can create own boards" ON boards;
DROP POLICY IF EXISTS "Users can update own boards" ON boards;
DROP POLICY IF EXISTS "Users can delete own boards" ON boards;

DROP POLICY IF EXISTS "Users can view lists on own boards" ON lists;
DROP POLICY IF EXISTS "Users can create lists on own boards" ON lists;
DROP POLICY IF EXISTS "Users can update lists on own boards" ON lists;
DROP POLICY IF EXISTS "Users can delete lists on own boards" ON lists;

DROP POLICY IF EXISTS "Users can view cards on own boards" ON cards;
DROP POLICY IF EXISTS "Users can create cards on own boards" ON cards;
DROP POLICY IF EXISTS "Users can update cards on own boards" ON cards;
DROP POLICY IF EXISTS "Users can delete cards on own boards" ON cards;

-- ============================================
-- 1f. PROFILES
-- ============================================
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 1g. BOARDS
-- ============================================
CREATE POLICY "Users can view accessible boards"
  ON boards FOR SELECT
  USING (user_can_view_board(id));

CREATE POLICY "Users can create own boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner or admin can update boards"
  ON boards FOR UPDATE
  USING (user_can_admin_board(id));

CREATE POLICY "Owner can delete boards"
  ON boards FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- 1h. LISTS
-- ============================================
CREATE POLICY "Users can view lists on accessible boards"
  ON lists FOR SELECT
  USING (user_can_view_board(board_id));

CREATE POLICY "Members can create lists"
  ON lists FOR INSERT
  WITH CHECK (user_can_edit_board_content(board_id));

CREATE POLICY "Members can update lists"
  ON lists FOR UPDATE
  USING (user_can_edit_board_content(board_id));

CREATE POLICY "Members can delete lists"
  ON lists FOR DELETE
  USING (user_can_edit_board_content(board_id));

-- ============================================
-- 1i. CARDS
-- ============================================
CREATE POLICY "Users can view cards on accessible boards"
  ON cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id
        AND user_can_view_board(lists.board_id)
    )
  );

CREATE POLICY "Members can create cards"
  ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Members can update cards"
  ON cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

CREATE POLICY "Members can delete cards"
  ON cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id
        AND user_can_edit_board_content(lists.board_id)
    )
  );

-- ============================================
-- 1j. BOARD MEMBERSHIPS
-- ============================================
ALTER TABLE board_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memberships on accessible boards"
  ON board_memberships FOR SELECT
  USING (user_can_view_board(board_id));

CREATE POLICY "Admin can create memberships"
  ON board_memberships FOR INSERT
  WITH CHECK (user_can_admin_board(board_id));

CREATE POLICY "Admin can update memberships"
  ON board_memberships FOR UPDATE
  USING (user_can_admin_board(board_id));

CREATE POLICY "Admin can delete memberships"
  ON board_memberships FOR DELETE
  USING (user_can_admin_board(board_id));

-- ============================================
-- 1k. BOARD INVITATIONS
-- ============================================
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations"
  ON board_invitations FOR SELECT
  USING (
    user_can_view_board(board_id)
    OR lower(invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

CREATE POLICY "Admin can create invitations"
  ON board_invitations FOR INSERT
  WITH CHECK (user_can_admin_board(board_id));

CREATE POLICY "Admin or invitee can update invitations"
  ON board_invitations FOR UPDATE
  USING (
    user_can_admin_board(board_id)
    OR lower(invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

CREATE POLICY "Admin can delete invitations"
  ON board_invitations FOR DELETE
  USING (user_can_admin_board(board_id));

-- ============================================
-- 1l. ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE board_memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE board_invitations;
