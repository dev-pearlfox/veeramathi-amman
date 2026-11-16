-- One-time change: the donation tabs (திருப்பணி நன்கொடை and நன்கொடை) get their own இரசீது எண் column.
-- Run in Supabase -> SQL Editor, BEFORE the new site files go live (the page saves to this column).
-- Safe to run again: step 1 does nothing if the column exists, step 3 only touches notes that still hold the old text.

-- 1) The new column.
alter table income_entries add column if not exists receipt_no text not null default '';

-- 2) PREVIEW (changes nothing): every row whose note starts with "இரசீது எண்", and what would happen to it.
--    "moves" = the whole note is just "இரசீது எண்: <one number or code>", so step 3 moves it and empties the note.
--    "stays" = the note has other words too, so step 3 leaves it alone (edit those by hand on the page).
select kind, id, note,
       case when kind in ('thirupani', 'donation')
             and note ~ '^\s*இரசீது\s*எண்\s*[:：]?\s*[^\s:：]\S*\s*$' then 'moves' else 'stays' end as step_3,
       substring(note from '^\s*இரசீது\s*எண்\s*[:：]?\s*([^\s:：]\S*)\s*$') as receipt_number
from income_entries
where note ~ '^\s*இரசீது\s*எண்'
order by kind, created_at;

-- 3) MOVE: number -> receipt_no, note -> empty. Only the two donation kinds, only exact "இரசீது எண்: <number>" notes.
update income_entries
set receipt_no = substring(note from '^\s*இரசீது\s*எண்\s*[:：]?\s*([^\s:：]\S*)\s*$'),
    note       = '',
    updated_at = now()
where kind in ('thirupani', 'donation')
  and receipt_no = ''
  and note ~ '^\s*இரசீது\s*எண்\s*[:：]?\s*[^\s:：]\S*\s*$';
