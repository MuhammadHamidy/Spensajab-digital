-- Only one open attendance session may exist for a class at a time.
-- Preserve the newest session before applying the constraint to existing data.
WITH ranked_open_sessions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY class_id
            ORDER BY COALESCE(opened_at, created_at) DESC, created_at DESC
        ) AS row_number
    FROM class_sessions
    WHERE status = 'OPEN'
)
UPDATE class_sessions
SET
    status = 'CLOSED',
    closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
    SELECT id
    FROM ranked_open_sessions
    WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_sessions_one_open_per_class
ON class_sessions(class_id)
WHERE status = 'OPEN';
