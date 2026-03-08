-- Align persisted board backgrounds with the application constants introduced in Phase 5.
-- This keeps older rows and future inserts on the same default key.

UPDATE boards
SET background = 'midnight-surf'
WHERE background IS NULL
   OR background NOT IN (
     'midnight-surf',
     'copper-rise',
     'moss-light',
     'berry-ink',
     'stone-canvas',
     'sea-glass',
     'sunrise-paper',
     'graphite-bloom'
   );

ALTER TABLE boards
ALTER COLUMN background SET DEFAULT 'midnight-surf';
