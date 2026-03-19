import asyncio
from uuid import UUID, uuid4
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_all_indicators():
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            # Supprimer indicateurs existants
            await session.execute(text("DELETE FROM indicator_data"))
            await session.execute(text("DELETE FROM indicators"))
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🌍 ENVIRONNEMENT - 60 indicateurs")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            environmental = [
                # Émissions GES (15)
                ("E-GHG-001", "Scope 1 - Émissions directes", "Émissions", "tCO2e", "GRI 305-1, ESRS E1"),
                ("E-GHG-002", "Scope 2 - Émissions indirectes énergie", "Émissions", "tCO2e", "GRI 305-2, ESRS E1"),
                ("E-GHG-003", "Scope 3 - Autres émissions indirectes", "Émissions", "tCO2e", "GRI 305-3, ESRS E1"),
                ("E-GHG-004", "Scope 3.1 - Biens et services achetés", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-005", "Scope 3.2 - Biens d'équipement", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-006", "Scope 3.3 - Énergie non incluse Scope 1-2", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-007", "Scope 3.4 - Transport amont", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-008", "Scope 3.5 - Déchets", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-009", "Scope 3.6 - Déplacements professionnels", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-010", "Scope 3.7 - Déplacements domicile-travail", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-011", "Scope 3.11 - Utilisation produits vendus", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-012", "Scope 3.12 - Fin de vie produits", "Émissions", "tCO2e", "GHG Protocol"),
                ("E-GHG-013", "Total emissions GES", "Émissions", "tCO2e", "ESRS E1-1"),
                ("E-GHG-014", "Intensité carbone par CA", "Émissions", "tCO2e/M€", "TCFD"),
                ("E-GHG-015", "Intensité carbone par employé", "Émissions", "tCO2e/ETP", "TCFD"),
                
                # Énergie (12)
                ("E-ENE-001", "Consommation énergie totale", "Énergie", "MWh", "GRI 302-1, ESRS E1"),
                ("E-ENE-002", "Consommation électricité", "Énergie", "MWh", "GRI 302-1"),
                ("E-ENE-003", "Consommation gaz naturel", "Énergie", "MWh", "GRI 302-1"),
                ("E-ENE-004", "Consommation fioul", "Énergie", "MWh", "GRI 302-1"),
                ("E-ENE-005", "Énergie renouvelable consommée", "Énergie", "MWh", "GRI 302-1, ESRS E1"),
                ("E-ENE-006", "Part énergie renouvelable", "Énergie", "%", "ESRS E1-5"),
                ("E-ENE-007", "Énergie produite sur site", "Énergie", "MWh", "GRI 302-1"),
                ("E-ENE-008", "Intensité énergétique CA", "Énergie", "MWh/M€", "GRI 302-3"),
                ("E-ENE-009", "Intensité énergétique m²", "Énergie", "kWh/m²", "GRI 302-3"),
                ("E-ENE-010", "Réduction consommation énergie", "Énergie", "MWh", "GRI 302-4"),
                ("E-ENE-011", "Investissements efficacité énergétique", "Énergie", "k€", "ESRS E1"),
                ("E-ENE-012", "Objectif réduction énergie", "Énergie", "%", "ESRS E1"),
                
                # Eau (8)
                ("E-WAT-001", "Consommation eau totale", "Eau", "m³", "GRI 303-5, ESRS E3"),
                ("E-WAT-002", "Eau prélevée", "Eau", "m³", "GRI 303-3"),
                ("E-WAT-003", "Eau recyclée/réutilisée", "Eau", "m³", "GRI 303-3"),
                ("E-WAT-004", "Part eau recyclée", "Eau", "%", "ESRS E3"),
                ("E-WAT-005", "Eau en zone stress hydrique", "Eau", "m³", "GRI 303-3"),
                ("E-WAT-006", "Intensité eau CA", "Eau", "m³/M€", "GRI 303-1"),
                ("E-WAT-007", "Rejets eaux usées", "Eau", "m³", "GRI 303-4"),
                ("E-WAT-008", "Objectif réduction eau", "Eau", "%", "ESRS E3"),
                
                # Déchets (10)
                ("E-WAS-001", "Production déchets totale", "Déchets", "tonnes", "GRI 306-3, ESRS E5"),
                ("E-WAS-002", "Déchets dangereux", "Déchets", "tonnes", "GRI 306-3"),
                ("E-WAS-003", "Déchets non dangereux", "Déchets", "tonnes", "GRI 306-3"),
                ("E-WAS-004", "Déchets recyclés", "Déchets", "tonnes", "GRI 306-4"),
                ("E-WAS-005", "Déchets valorisés", "Déchets", "tonnes", "GRI 306-4"),
                ("E-WAS-006", "Déchets incinérés", "Déchets", "tonnes", "GRI 306-5"),
                ("E-WAS-007", "Déchets mis en décharge", "Déchets", "tonnes", "GRI 306-5"),
                ("E-WAS-008", "Taux recyclage", "Déchets", "%", "ESRS E5-5"),
                ("E-WAS-009", "Taux valorisation", "Déchets", "%", "ESRS E5"),
                ("E-WAS-010", "Objectif zéro déchet enfouissement", "Déchets", "%", "ESRS E5"),
                
                # Biodiversité (8)
                ("E-BIO-001", "Sites en zones protégées", "Biodiversité", "nombre", "GRI 304-1, ESRS E4"),
                ("E-BIO-002", "Surface sites sensibles", "Biodiversité", "hectares", "ESRS E4"),
                ("E-BIO-003", "Espèces menacées impactées", "Biodiversité", "nombre", "GRI 304-2"),
                ("E-BIO-004", "Habitats restaurés", "Biodiversité", "hectares", "GRI 304-3"),
                ("E-BIO-005", "Investissements biodiversité", "Biodiversité", "k€", "ESRS E4"),
                ("E-BIO-006", "Sites certifiés biodiversité", "Biodiversité", "nombre", "ESRS E4"),
                ("E-BIO-007", "Part fournisseurs certifiés durables", "Biodiversité", "%", "ESRS E4"),
                ("E-BIO-008", "Objectifs biodiversité définis", "Biodiversité", "booléen", "ESRS E4"),
                
                # Économie circulaire (7)
                ("E-CIR-001", "Matières premières vierges", "Circularité", "tonnes", "GRI 301-1, ESRS E5"),
                ("E-BIO-002", "Matières recyclées utilisées", "Circularité", "tonnes", "GRI 301-2"),
                ("E-CIR-003", "Part matières recyclées", "Circularité", "%", "ESRS E5-4"),
                ("E-CIR-004", "Produits réparables", "Circularité", "%", "ESRS E5"),
                ("E-CIR-005", "Produits recyclables", "Circularité", "%", "ESRS E5"),
                ("E-CIR-006", "Durée vie moyenne produits", "Circularité", "années", "ESRS E5"),
                ("E-CIR-007", "Taux retour produits fin de vie", "Circularité", "%", "ESRS E5"),
            ]
            
            count_env = 0
            for code, name, category, unit, framework in environmental:
                await session.execute(text("""
                    INSERT INTO indicators (
                        id, tenant_id, code, name, pillar, category,
                        unit, data_type, framework, framework_reference,
                        is_active, is_mandatory, created_at, updated_at
                    ) VALUES (
                        :id, :tid, :code, :name, 'environmental', :cat,
                        :unit, 'numeric', 'Multi', :fw, true, true, NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()), "tid": str(tenant_id),
                    "code": code, "name": name, "cat": category,
                    "unit": unit, "fw": framework
                })
                count_env += 1
            
            print(f"✅ {count_env} indicateurs environnementaux créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("👥 SOCIAL - 60 indicateurs")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            social = [
                # Emploi (15)
                ("S-EMP-001", "Effectif total", "Emploi", "personnes", "GRI 2-7, ESRS S1"),
                ("S-EMP-002", "Effectif moyen", "Emploi", "personnes", "ESRS S1-6"),
                ("S-EMP-003", "CDI", "Emploi", "personnes", "GRI 2-7"),
                ("S-EMP-004", "CDD", "Emploi", "personnes", "GRI 2-7"),
                ("S-EMP-005", "Temps plein", "Emploi", "personnes", "GRI 2-7"),
                ("S-EMP-006", "Temps partiel", "Emploi", "personnes", "GRI 2-7"),
                ("S-EMP-007", "Intérimaires", "Emploi", "personnes", "GRI 2-8"),
                ("S-EMP-008", "Embauches", "Emploi", "personnes", "GRI 401-1"),
                ("S-EMP-009", "Départs", "Emploi", "personnes", "GRI 401-1"),
                ("S-EMP-010", "Taux de turnover", "Emploi", "%", "GRI 401-1, ESRS S1"),
                ("S-EMP-011", "Démissions", "Emploi", "personnes", "GRI 401-1"),
                ("S-EMP-012", "Licenciements", "Emploi", "personnes", "GRI 401-1"),
                ("S-EMP-013", "Départs retraite", "Emploi", "personnes", "GRI 401-1"),
                ("S-EMP-014", "Ancienneté moyenne", "Emploi", "années", "ESRS S1"),
                ("S-EMP-015", "Taux transformation CDD-CDI", "Emploi", "%", "ESRS S1"),
                
                # Diversité & Inclusion (15)
                ("S-DIV-001", "Femmes effectif total", "Diversité", "personnes", "GRI 405-1, ESRS S1"),
                ("S-DIV-002", "Part femmes effectif", "Diversité", "%", "ESRS S1-9"),
                ("S-DIV-003", "Femmes cadres", "Diversité", "personnes", "GRI 405-1"),
                ("S-DIV-004", "Part femmes cadres", "Diversité", "%", "ESRS S1"),
                ("S-DIV-005", "Femmes conseil administration", "Diversité", "personnes", "GRI 405-1"),
                ("S-DIV-006", "Part femmes CA", "Diversité", "%", "ESRS S1, Loi Copé-Zimmermann"),
                ("S-DIV-007", "Femmes comité direction", "Diversité", "personnes", "GRI 405-1"),
                ("S-DIV-008", "Part femmes CODIR", "Diversité", "%", "ESRS S1"),
                ("S-DIV-009", "Écart salarial F/H", "Diversité", "%", "GRI 405-2, ESRS S1"),
                ("S-DIV-010", "Index égalité F/H", "Diversité", "points/100", "Loi Rixain"),
                ("S-DIV-011", "Travailleurs handicapés", "Diversité", "personnes", "GRI 405-1"),
                ("S-DIV-012", "Taux emploi handicap", "Diversité", "%", "ESRS S1, OETH"),
                ("S-DIV-013", "Employés -30 ans", "Diversité", "%", "GRI 405-1"),
                ("S-DIV-014", "Employés >50 ans", "Diversité", "%", "GRI 405-1"),
                ("S-DIV-015", "Nationalités représentées", "Diversité", "nombre", "ESRS S1"),
                
                # Formation (10)
                ("S-FOR-001", "Heures formation totales", "Formation", "heures", "GRI 404-1, ESRS S1"),
                ("S-FOR-002", "Heures formation par employé", "Formation", "heures/pers", "GRI 404-1"),
                ("S-FOR-003", "Taux accès formation", "Formation", "%", "GRI 404-1"),
                ("S-FOR-004", "Budget formation", "Formation", "k€", "ESRS S1"),
                ("S-FOR-005", "Part masse salariale formation", "Formation", "%", "ESRS S1"),
                ("S-FOR-006", "Employés formés", "Formation", "personnes", "GRI 404-1"),
                ("S-FOR-007", "Formations techniques", "Formation", "heures", "GRI 404-2"),
                ("S-FOR-008", "Formations soft skills", "Formation", "heures", "GRI 404-2"),
                ("S-FOR-009", "Formations RSE/Éthique", "Formation", "heures", "ESRS S1"),
                ("S-FOR-010", "Certifications obtenues", "Formation", "nombre", "ESRS S1"),
                
                # Santé & Sécurité (12)
                ("S-SAN-001", "Accidents travail", "Santé Sécurité", "nombre", "GRI 403-9, ESRS S1"),
                ("S-SAN-002", "Accidents avec arrêt", "Santé Sécurité", "nombre", "GRI 403-9"),
                ("S-SAN-003", "Taux fréquence accidents", "Santé Sécurité", "TF", "GRI 403-9"),
                ("S-SAN-004", "Taux gravité accidents", "Santé Sécurité", "TG", "GRI 403-9"),
                ("S-SAN-005", "Jours arrêt maladie", "Santé Sécurité", "jours", "GRI 403-9"),
                ("S-SAN-006", "Taux absentéisme", "Santé Sécurité", "%", "GRI 403-9, ESRS S1"),
                ("S-SAN-007", "Maladies professionnelles", "Santé Sécurité", "nombre", "GRI 403-10"),
                ("S-SAN-008", "Décès travail", "Santé Sécurité", "nombre", "GRI 403-9"),
                ("S-SAN-009", "Près-accidents (near miss)", "Santé Sécurité", "nombre", "ESRS S1"),
                ("S-SAN-010", "Investissements santé/sécurité", "Santé Sécurité", "k€", "ESRS S1"),
                ("S-SAN-011", "Certifications sécurité", "Santé Sécurité", "nombre", "ESRS S1"),
                ("S-SAN-012", "Objectif zéro accident", "Santé Sécurité", "booléen", "ESRS S1"),
                
                # Rémunération (8)
                ("S-REM-001", "Masse salariale", "Rémunération", "k€", "ESRS S1"),
                ("S-REM-002", "Salaire moyen", "Rémunération", "k€", "GRI 2-21"),
                ("S-REM-003", "Salaire médian", "Rémunération", "k€", "GRI 2-21"),
                ("S-REM-004", "Ratio salaire min/légal", "Rémunération", "ratio", "GRI 202-1"),
                ("S-REM-005", "Ratio CEO/médian", "Rémunération", "ratio", "GRI 2-21, ESRS S1"),
                ("S-REM-006", "Salariés actionnaires", "Rémunération", "%", "ESRS S1"),
                ("S-REM-007", "Participation employés", "Rémunération", "k€", "ESRS S1"),
                ("S-REM-008", "Intéressement distribué", "Rémunération", "k€", "ESRS S1"),
            ]
            
            count_soc = 0
            for code, name, category, unit, framework in social:
                await session.execute(text("""
                    INSERT INTO indicators (
                        id, tenant_id, code, name, pillar, category,
                        unit, data_type, framework, framework_reference,
                        is_active, is_mandatory, created_at, updated_at
                    ) VALUES (
                        :id, :tid, :code, :name, 'social', :cat,
                        :unit, 'numeric', 'Multi', :fw, true, true, NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()), "tid": str(tenant_id),
                    "code": code, "name": name, "cat": category,
                    "unit": unit, "fw": framework
                })
                count_soc += 1
            
            print(f"✅ {count_soc} indicateurs sociaux créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("⚖️  GOUVERNANCE - 40 indicateurs")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            governance = [
                # Gouvernance (15)
                ("G-GOV-001", "Membres conseil administration", "Gouvernance", "personnes", "GRI 2-9, ESRS G1"),
                ("G-GOV-002", "Administrateurs indépendants", "Gouvernance", "personnes", "GRI 2-9"),
                ("G-GOV-003", "Part indépendants CA", "Gouvernance", "%", "ESRS G1"),
                ("G-GOV-004", "Réunions CA par an", "Gouvernance", "nombre", "GRI 2-9"),
                ("G-GOV-005", "Taux participation CA", "Gouvernance", "%", "ESRS G1"),
                ("G-GOV-006", "Comités spécialisés", "Gouvernance", "nombre", "GRI 2-9"),
                ("G-GOV-007", "Comité audit existe", "Gouvernance", "booléen", "ESRS G1"),
                ("G-GOV-008", "Comité RSE existe", "Gouvernance", "booléen", "ESRS G1"),
                ("G-GOV-009", "Durée mandats moyenne", "Gouvernance", "années", "ESRS G1"),
                ("G-GOV-010", "Administrateurs formés ESG", "Gouvernance", "%", "ESRS G1"),
                ("G-GOV-011", "Rémunération liée ESG", "Gouvernance", "%", "GRI 2-19, ESRS G1"),
                ("G-GOV-012", "Say on Pay approuvé", "Gouvernance", "booléen", "ESRS G1"),
                ("G-GOV-013", "Capital détenu salariés", "Gouvernance", "%", "GRI 2-1"),
                ("G-GOV-014", "Actionnaires >5%", "Gouvernance", "nombre", "GRI 2-1"),
                ("G-GOV-015", "Free float", "Gouvernance", "%", "ESRS G1"),
                
                # Éthique & Conformité (15)
                ("G-ETH-001", "Code éthique adopté", "Éthique", "booléen", "GRI 2-23, ESRS G1"),
                ("G-ETH-002", "Employés formés éthique", "Éthique", "%", "GRI 205-2"),
                ("G-ETH-003", "Heures formation éthique", "Éthique", "heures", "GRI 205-2"),
                ("G-ETH-004", "Incidents corruption", "Éthique", "nombre", "GRI 205-3, ESRS G1"),
                ("G-ETH-005", "Incidents corruption confirmés", "Éthique", "nombre", "GRI 205-3"),
                ("G-ETH-006", "Signalements lanceurs alerte", "Éthique", "nombre", "GRI 2-26, ESRS G1"),
                ("G-ETH-007", "Signalements traités", "Éthique", "%", "ESRS G1"),
                ("G-ETH-008", "Sanctions disciplinaires éthique", "Éthique", "nombre", "GRI 2-27"),
                ("G-ETH-009", "Amendes/sanctions réglementaires", "Éthique", "k€", "GRI 2-27, ESRS G1"),
                ("G-ETH-010", "Certification anti-corruption", "Éthique", "booléen", "ESRS G1"),
                ("G-ETH-011", "Fournisseurs évalués éthique", "Éthique", "%", "GRI 308-1"),
                ("G-ETH-012", "Politique protection données", "Éthique", "booléen", "GRI 418-1"),
                ("G-ETH-013", "Violations protection données", "Éthique", "nombre", "GRI 418-1"),
                ("G-ETH-014", "Certifications cybersécurité", "Éthique", "nombre", "ESRS G1"),
                ("G-ETH-015", "Incidents cybersécurité", "Éthique", "nombre", "ESRS G1"),
                
                # Chaîne valeur (10)
                ("G-SUP-001", "Fournisseurs actifs", "Chaîne valeur", "nombre", "GRI 2-6, ESRS G1"),
                ("G-SUP-002", "Fournisseurs évalués ESG", "Chaîne valeur", "%", "GRI 308-1"),
                ("G-SUP-003", "Fournisseurs audités", "Chaîne valeur", "nombre", "GRI 414-1"),
                ("G-SUP-004", "Achats locaux", "Chaîne valeur", "%", "GRI 204-1"),
                ("G-SUP-005", "Fournisseurs certifiés ISO", "Chaîne valeur", "%", "ESRS G1"),
                ("G-SUP-006", "Litiges fournisseurs", "Chaîne valeur", "nombre", "ESRS G1"),
                ("G-SUP-007", "Délai paiement moyen", "Chaîne valeur", "jours", "ESRS G1"),
                ("G-SUP-008", "Fournisseurs PME", "Chaîne valeur", "%", "ESRS G1"),
                ("G-SUP-009", "Score ESG moyen fournisseurs", "Chaîne valeur", "points/100", "ESRS G1"),
                ("G-SUP-010", "Audits droits humains supply chain", "Chaîne valeur", "nombre", "GRI 414-2"),
            ]
            
            count_gov = 0
            for code, name, category, unit, framework in governance:
                await session.execute(text("""
                    INSERT INTO indicators (
                        id, tenant_id, code, name, pillar, category,
                        unit, data_type, framework, framework_reference,
                        is_active, is_mandatory, created_at, updated_at
                    ) VALUES (
                        :id, :tid, :code, :name, 'governance', :cat,
                        :unit, 'numeric', 'Multi', :fw, true, true, NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()), "tid": str(tenant_id),
                    "code": code, "name": name, "cat": category,
                    "unit": unit, "fw": framework
                })
                count_gov += 1
            
            print(f"✅ {count_gov} indicateurs gouvernance créés")
            
            await session.commit()
            
            total = count_env + count_soc + count_gov
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED COMPLET RÉUSSI !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"✅ {total} indicateurs ESG créés")
            print(f"   • {count_env} Environnement")
            print(f"   • {count_soc} Social")
            print(f"   • {count_gov} Gouvernance")
            print("")
            print("📋 Frameworks: GRI, ESRS, TCFD, GHG Protocol")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_all_indicators())
