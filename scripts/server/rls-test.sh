#!/usr/bin/env bash
# Teste l'isolation des données (RLS) sur une COPIE de la base de production.
# La vraie base n'est jamais modifiée : on la copie dans "esgflow_rlstest", on y applique
# les règles, on compte les lignes visibles par chaque client, puis on supprime la copie.
# Usage (root, sur le serveur) : bash scripts/server/rls-test.sh
set -Eeuo pipefail
cd "$(dirname "$0")"
DB=esgflow-db-1
U="$(docker exec $DB printenv POSTGRES_USER)"; P="$(docker exec $DB printenv POSTGRES_DB)"
T=esgflow_rlstest
q() { docker exec -i $DB psql -v ON_ERROR_STOP=1 -q -U "$U" -d "${2:-$P}" -c "$1"; }
cleanup() { docker exec $DB psql -q -U "$U" -d postgres -c "DROP DATABASE IF EXISTS $T" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if [ "$(docker exec $DB psql -At -U "$U" -d "$P" -c "select rolsuper from pg_roles where rolname=current_user")" = "t" ]; then
  echo "!! Le rôle $U est super-utilisateur : PostgreSQL ignore alors toute isolation, le test serait faux."; exit 1
fi
echo "1/4 Copie de la base ($P -> $T)"
cleanup
docker exec $DB psql -q -U "$U" -d postgres -c "CREATE DATABASE $T"
docker exec $DB pg_dump -U "$U" --no-owner "$P" | docker exec -i $DB psql -q -U "$U" -d "$T" >/dev/null 2>&1

echo "2/4 Application des règles RLS sur la copie"
docker exec -i $DB psql -q -U "$U" -d "$T" < rls-enable.sql 2>&1 | grep -c ERROR | sed 's/^/   instructions en erreur (suppliers absente = normal) : /' || true
echo "   tables avec RLS : $(docker exec $DB psql -At -U "$U" -d "$T" -c "select count(*) from pg_class where relkind='r' and relrowsecurity")"

echo "3/4 Lignes visibles par client (doit : somme des clients = total ; sans client = 0)"
docker exec -i $DB psql -q -U "$U" -d "$T" <<'SQL'
DO $$
DECLARE r record; tid uuid; tids uuid[]; total bigint; sumt bigint; v bigint; nul bigint; exp_sum bigint; exp_v bigint; bad int := 0;
BEGIN
  SET LOCAL row_security = on;
  SELECT array_agg(id) INTO tids FROM tenants;   -- lu avant toute sélection de client
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped
           WHERE c.relkind='r' AND c.relrowsecurity ORDER BY 1 LOOP
    -- total réel : on contourne temporairement la RLS (copie jetable, role propriétaire)
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('SELECT count(*) FROM %I', r.relname) INTO total;
    EXECUTE format('SELECT count(*) FROM %I WHERE tenant_id IS NULL', r.relname) INTO nul;
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.relname);
    sumt := 0;
    FOREACH tid IN ARRAY tids LOOP
      PERFORM set_config('app.current_tenant_id', tid::text, true);
      EXECUTE format('SELECT count(*) FROM %I', r.relname) INTO v;
      sumt := sumt + v;
    END LOOP;
    PERFORM set_config('app.current_tenant_id', '', true);
    -- les tenants ont leur propre règle ; ici table sous FORCE sans contexte
    EXECUTE format('SELECT count(*) FROM %I', r.relname) INTO v;
    -- roles : les rôles système (tenant_id vide) sont partagés par tous les clients, voulu
    IF r.relname = 'roles' THEN
      exp_sum := (total - nul) + nul * array_length(tids, 1); exp_v := nul;
    ELSE
      exp_sum := total - nul; exp_v := 0;
    END IF;
    IF sumt <> exp_sum OR v <> exp_v THEN bad := bad + 1; END IF;
    RAISE NOTICE '% %  total=% (sans client=%)  somme_par_client=%  sans_contexte=%',
      CASE WHEN sumt = exp_sum AND v = exp_v THEN 'OK ' ELSE 'KO ' END, rpad(r.relname,24), total, nul, sumt, v;
  END LOOP;
  RAISE NOTICE 'Tables en anomalie : %', bad;
END $$;
SQL

echo "4/4 Copie supprimée. Rien n'a été modifié en production."
