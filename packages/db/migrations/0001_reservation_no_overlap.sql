-- Enforce "no overlapping reservations per space" at the DB level, per
-- DESIGN.md §6 reservations invariant. Only active bookings
-- (booked/checked_in) block a time range — cancelled/no_show/expired rows
-- and rows still pending a split payment don't hold the slot.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap_per_space"
  EXCLUDE USING gist (
    "schedule_block_id" WITH =,
    tstzrange("starts_at", "ends_at") WITH &&
  )
  WHERE (status IN ('booked', 'checked_in'));
