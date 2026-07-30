BEGIN;

UPDATE site_content
SET value = E'装下这个夏天\n需要的一切'
WHERE key = 'hero2_title'
  AND value = '装下这个夏天\n需要的一切';

COMMIT;
