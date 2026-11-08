UPDATE customers
SET payload = jsonb_set(payload, '{preferredChannel}', '"EMAIL"'::jsonb, true)
WHERE payload->>'preferredChannel' IS DISTINCT FROM 'EMAIL';

UPDATE notifications
SET payload = payload || jsonb_build_object(
  'status', 'FAILED',
  'mode', 'LEGACY',
  'deliveryNotes', 'Legacy simulated notification; delivery was not sent or verified.'
)
WHERE payload->>'mode' = 'DEMO_SANDBOX'
   OR payload->>'channel' IN ('SMS', 'WHATSAPP')
   OR payload->>'status' = 'DELIVERED';
