-- Diagnostic : état du compte admin@greenconnect.cloud
SELECT
    u.id,
    u.email,
    u.is_active   AS "user_actif",
    u.created_at  AS "créé_le",
    t.name        AS "tenant",
    t.is_active   AS "tenant_actif",
    t.plan_tier   AS "plan"
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.email = 'admin@greenconnect.cloud';

-- Réactivation (décommentez si nécessaire) :
-- UPDATE users  SET is_active = true WHERE email = 'admin@greenconnect.cloud';
-- UPDATE tenants SET is_active = true WHERE id = (SELECT tenant_id FROM users WHERE email = 'admin@greenconnect.cloud');
