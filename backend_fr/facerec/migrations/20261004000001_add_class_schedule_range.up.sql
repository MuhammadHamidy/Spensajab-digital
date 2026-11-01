ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_start_time VARCHAR(5);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_end_time VARCHAR(5);

UPDATE classes
SET schedule_start_time = replace(substring(schedule_time from '[0-9]{1,2}[:.][0-9]{2}'), '.', ':'),
    schedule_end_time = replace(
        regexp_replace(substring(schedule_time from '-[[:space:]]*[0-9]{1,2}[:.][0-9]{2}'), '^-[[:space:]]*', ''),
        '.', ':'
    )
WHERE schedule_time IS NOT NULL
  AND schedule_time <> ''
  AND (schedule_start_time IS NULL OR schedule_start_time = '');
