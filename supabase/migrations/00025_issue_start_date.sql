-- 00024_issue_start_date.sql
-- Optional planned start date for Gantt-style timeline rendering.
-- The Timeline view previously fell back to created_at as the bar start,
-- which conflated "when the issue was logged" with "when work is planned to start".

alter table issues
  add column start_date date;
