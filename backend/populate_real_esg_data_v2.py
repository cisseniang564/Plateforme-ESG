#!/usr/bin/env python3
"""
Populate ESG Platform with REAL materiality issues and risks
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Database URL
DATABASE_URL = "postgresql+asyncpg://esgflow_user:esgflow_password@db:5432/esgflow_dev"

# Real materiality issues
MATERIALITY_ISSUES = [
    {"name": "Financement de la transition bas-carbone", "category": "environmental", "financial_impact": 85, "esg_impact": 90, "stakeholders": "Investisseurs, Régulateurs, ONG climatiques", "description": "Engagement à financer des projets verts et à réduire l'exposition aux énergies fossiles"},
    {"name": "Stress tests climatiques", "category": "environmental", "financial_impact": 80, "esg_impact": 75, "stakeholders": "ACPR, BCE, Investisseurs institutionnels", "description": "Évaluation de la résilience du portefeuille face aux scénarios climatiques"},
    {"name": "Diversité dans les instances dirigeantes", "category": "social", "financial_impact": 65, "esg_impact": 80, "stakeholders": "Salariés, Investisseurs ESG, Médias", "description": "Mixité et représentation dans les comités de direction et conseils"},
    {"name": "Transition énergétique et mix bas-carbone", "category": "environmental", "financial_impact": 95, "esg_impact": 98, "stakeholders": "États, Investisseurs, Société civile", "description": "Évolution vers les énergies renouvelables et sortie progressive des fossiles"},
    {"name": "Émissions Scope 3 (utilisation des produits)", "category": "environmental", "financial_impact": 75, "esg_impact": 92, "stakeholders": "Clients, Régulateurs, ONG", "description": "Émissions liées à l'utilisation du pétrole/gaz vendus par les clients finaux"},
    {"name": "Sécurité des installations et prévention accidents", "category": "social", "financial_impact": 88, "esg_impact": 85, "stakeholders": "Salariés, Riverains, Autorités", "description": "Prévention des incidents industriels et protection des travailleurs"},
    {"name": "Économie circulaire et recyclage des matériaux", "category": "environmental", "financial_impact": 70, "esg_impact": 85, "stakeholders": "Fournisseurs, Clients, Régulateurs", "description": "Conception pour la réutilisation et valorisation des déchets"},
    {"name": "Électrification de la flotte automobile", "category": "environmental", "financial_impact": 92, "esg_impact": 88, "stakeholders": "Consommateurs, États, Constructeurs", "description": "Transition vers les véhicules électriques et abandon du thermique"},
    {"name": "Dépendance aux métaux critiques (lithium, cobalt)", "category": "environmental", "financial_impact": 85, "esg_impact": 78, "stakeholders": "Fournisseurs, ONG, Investisseurs", "description": "Sécurisation de l'approvisionnement en matières premières stratégiques"},
    {"name": "Conditions de travail dans la supply chain", "category": "social", "financial_impact": 72, "esg_impact": 88, "stakeholders": "Syndicats, ONG, Consommateurs", "description": "Audit et amélioration des conditions chez les sous-traitants"},
    {"name": "Traçabilité et sourcing responsable", "category": "environmental", "financial_impact": 68, "esg_impact": 82, "stakeholders": "Clients premium, ONG, Médias", "description": "Transparence sur l'origine des matières premières (cuir, coton, métaux)"},
    {"name": "Bien-être animal dans la supply chain", "category": "social", "financial_impact": 55, "esg_impact": 75, "stakeholders": "Associations, Consommateurs, Marques", "description": "Interdiction fourrure, conditions d'élevage, alternatives végétales"},
    {"name": "Diversité et inclusion dans les campagnes", "category": "social", "financial_impact": 60, "esg_impact": 70, "stakeholders": "Consommateurs, Influenceurs, Régies pub", "description": "Représentation plurielle dans le marketing et communication"},
    {"name": "Bâtiments bas-carbone et RE2020", "category": "environmental", "financial_impact": 82, "esg_impact": 88, "stakeholders": "Maîtres d'ouvrage, Collectivités, État", "description": "Conformité à la réglementation environnementale 2020"},
    {"name": "Sécurité des travailleurs sur chantiers", "category": "social", "financial_impact": 78, "esg_impact": 90, "stakeholders": "Salariés, Inspection du travail, Syndicats", "description": "Réduction des accidents du travail et protection collective"},
    {"name": "Protection des données personnelles (RGPD)", "category": "governance", "financial_impact": 85, "esg_impact": 82, "stakeholders": "Clients, CNIL, Autorités européennes", "description": "Conformité réglementaire et sécurité des données utilisateurs"},
    {"name": "Empreinte carbone des data centers", "category": "environmental", "financial_impact": 65, "esg_impact": 78, "stakeholders": "Investisseurs ESG, ONG tech, Régulateurs", "description": "Consommation énergétique et refroidissement des infrastructures cloud"},
    {"name": "Inclusion numérique et fracture digitale", "category": "social", "financial_impact": 58, "esg_impact": 72, "stakeholders": "Pouvoirs publics, Associations, Seniors", "description": "Accessibilité des services numériques pour tous les publics"},
    {"name": "Accès aux médicaments essentiels", "category": "social", "financial_impact": 70, "esg_impact": 92, "stakeholders": "Patients, OMS, ONG santé", "description": "Politique de prix et licences pour pays en développement"},
    {"name": "Éthique de la recherche clinique", "category": "governance", "financial_impact": 75, "esg_impact": 85, "stakeholders": "Autorités santé, Comités éthique, Patients", "description": "Conduite éthique des essais et consentement éclairé"},
]

# Real ESG risks
ESG_RISKS = [
    {"title": "Exposition au risque de transition (actifs fossiles)", "category": "environmental", "probability": 4, "impact": 5, "description": "Dépréciation d'actifs liés aux énergies fossiles suite aux politiques climatiques", "mitigation_plan": "Stress tests réguliers, réorientation progressive vers les énergies vertes", "responsible_person": "Directeur des Risques", "target_date": "2025-12-31"},
    {"title": "Non-conformité aux réglementations ESG (SFDR, Taxonomie)", "category": "governance", "probability": 3, "impact": 4, "description": "Sanctions pour non-respect des règlements européens ESG", "mitigation_plan": "Équipe dédiée conformité ESG, formation continue des équipes", "responsible_person": "Chief Compliance Officer", "target_date": "2025-06-30"},
    {"title": "Dépréciation d'actifs pétroliers et gaziers (stranded assets)", "category": "environmental", "probability": 5, "impact": 5, "description": "Actifs fossiles rendus obsolètes par la transition énergétique", "mitigation_plan": "Diversification vers ENR, programme de reconversion des actifs", "responsible_person": "Directeur Stratégie", "target_date": "2030-12-31"},
    {"title": "Accident industriel majeur (marée noire, explosion)", "category": "social", "probability": 2, "impact": 5, "description": "Incident environnemental avec impact humain et réputationnel catastrophique", "mitigation_plan": "Protocoles de sécurité renforcés, audits trimestriels, assurances", "responsible_person": "Directeur HSE", "target_date": "2025-03-31"},
    {"title": "Pénurie d'eau dans régions d'extraction", "category": "environmental", "probability": 4, "impact": 4, "description": "Stress hydrique limitant les opérations dans certaines zones", "mitigation_plan": "Technologies de recyclage eau, diversification géographique", "responsible_person": "VP Operations", "target_date": "2026-12-31"},
    {"title": "Rupture de la chaîne d'approvisionnement (semi-conducteurs)", "category": "social", "probability": 4, "impact": 5, "description": "Pénurie de composants critiques bloquant la production", "mitigation_plan": "Diversification fournisseurs, stocks stratégiques, vertical integration", "responsible_person": "Chief Supply Chain Officer", "target_date": "2025-09-30"},
    {"title": "Empreinte carbone de la production (Scope 1 & 2)", "category": "environmental", "probability": 3, "impact": 4, "description": "Dépassement des budgets carbone et exposition taxe carbone EU ETS", "mitigation_plan": "Efficacité énergétique, électrification des process, PPA renouvelables", "responsible_person": "Directeur RSE", "target_date": "2027-12-31"},
    {"title": "Dépendance aux terres rares et métaux critiques", "category": "environmental", "probability": 4, "impact": 4, "description": "Volatilité prix et disponibilité (lithium, cobalt, terres rares)", "mitigation_plan": "Contrats long terme, R&D substitution, recyclage batteries", "responsible_person": "Chief Procurement Officer", "target_date": "2026-06-30"},
    {"title": "Obsolescence des compétences face à l'IA/robotisation", "category": "social", "probability": 3, "impact": 3, "description": "Inadéquation des compétences workforce avec besoins futurs", "mitigation_plan": "Plan de formation massif, upskilling/reskilling, reconversion", "responsible_person": "DRH", "target_date": "2026-12-31"},
    {"title": "Échec de la transition vers l'électrique", "category": "environmental", "probability": 3, "impact": 5, "description": "Retard technologique face aux concurrents sur les VE", "mitigation_plan": "Investissement R&D batteries, partenariats stratégiques", "responsible_person": "Chief Technology Officer", "target_date": "2025-12-31"},
    {"title": "Réglementation anti-diesel/essence en zones urbaines", "category": "governance", "probability": 5, "impact": 4, "description": "Interdiction véhicules thermiques en villes, baisse des ventes", "mitigation_plan": "Accélération gamme électrique, conversion sites production", "responsible_person": "CEO", "target_date": "2028-12-31"},
    {"title": "Scandale conditions de travail fournisseurs (fast fashion)", "category": "social", "probability": 3, "impact": 5, "description": "Révélation travail forcé ou enfants dans la supply chain", "mitigation_plan": "Audits sociaux tiers, certification usines, transparence totale", "responsible_person": "Chief Sustainability Officer", "target_date": "2025-12-31"},
    {"title": "Boycott consommateurs sur bien-être animal", "category": "social", "probability": 2, "impact": 4, "description": "Campagnes ONG contre fourrure/cuir exotique", "mitigation_plan": "Sortie fourrure, alternatives végétales, traçabilité cuir", "responsible_person": "Directeur Collections", "target_date": "2026-06-30"},
    {"title": "Contrefaçon et perte de valeur de marque", "category": "governance", "probability": 4, "impact": 3, "description": "Prolifération produits contrefaits nuisant à l'image", "mitigation_plan": "Blockchain traçabilité, collaborations douanes, e-commerce sécurisé", "responsible_person": "Directeur Juridique", "target_date": "2027-12-31"},
    {"title": "Accidents mortels sur chantiers", "category": "social", "probability": 3, "impact": 5, "description": "Décès ou blessures graves de travailleurs", "mitigation_plan": "Formation sécurité obligatoire, équipements protection, sanctions", "responsible_person": "Directeur Sécurité Groupe", "target_date": "2025-06-30"},
    {"title": "Empreinte carbone du béton et acier", "category": "environmental", "probability": 4, "impact": 4, "description": "Impossibilité de réduire les émissions avec matériaux actuels", "mitigation_plan": "R&D béton bas-carbone, bois lamellé, acier vert, recyclage", "responsible_person": "Directeur Innovation", "target_date": "2028-12-31"},
    {"title": "Artificialisation des sols et biodiversité", "category": "environmental", "probability": 4, "impact": 3, "description": "Destruction habitats naturels par projets immobiliers", "mitigation_plan": "Études impact biodiversité, compensation écologique, toitures végétalisées", "responsible_person": "Directeur Environnement", "target_date": "2026-12-31"},
    {"title": "Cyberattaque majeure et fuite données clients", "category": "governance", "probability": 4, "impact": 5, "description": "Breach massif exposant données personnelles millions clients", "mitigation_plan": "SOC 24/7, tests intrusion, chiffrement end-to-end, plan réponse incident", "responsible_person": "CISO", "target_date": "2025-03-31"},
    {"title": "Obsolescence programmée et e-waste", "category": "environmental", "probability": 3, "impact": 3, "description": "Accusations durée de vie courte des produits, déchets électroniques", "mitigation_plan": "Indice réparabilité, reprise ancien matériel, recyclage composants", "responsible_person": "VP Product", "target_date": "2026-12-31"},
    {"title": "Consommation énergétique data centers", "category": "environmental", "probability": 3, "impact": 4, "description": "Explosion conso électrique avec croissance cloud et IA", "mitigation_plan": "Refroidissement liquide, IA optimisation, PPA solaires/éoliennes", "responsible_person": "VP Infrastructure", "target_date": "2027-12-31"},
    {"title": "Rupture d'approvisionnement médicaments essentiels", "category": "social", "probability": 3, "impact": 5, "description": "Pénurie médicaments critiques menaçant vies patients", "mitigation_plan": "Sites production multiples, stocks sécurité, relocalisations", "responsible_person": "VP Supply Chain Pharma", "target_date": "2025-12-31"},
    {"title": "Scandale éthique essais cliniques", "category": "governance", "probability": 2, "impact": 5, "description": "Violation protocole éthique dans recherche, consentement", "mitigation_plan": "Comité éthique indépendant, audits externes, formation chercheurs", "responsible_person": "Chief Medical Officer", "target_date": "2025-06-30"},
    {"title": "Prix des médicaments jugés excessifs", "category": "social", "probability": 4, "impact": 4, "description": "Pression régulateurs et opinion sur accès abordable aux traitements", "mitigation_plan": "Programmes accès patients, licences volontaires pays pauvres, transparence R&D", "responsible_person": "Chief Commercial Officer", "target_date": "2026-12-31"},
    {"title": "Déforestation dans chaîne soja/huile palme", "category": "environmental", "probability": 4, "impact": 4, "description": "Supply chain contribuant à déforestation Amazonie/Indonésie", "mitigation_plan": "Certification RSPO/Soja+, traçabilité satellite, exclusion fournisseurs", "responsible_person": "Head of Sustainable Sourcing", "target_date": "2025-12-31"},
    {"title": "Stress hydrique zones agricoles clés", "category": "environmental", "probability": 5, "impact": 4, "description": "Sécheresses récurrentes menaçant approvisionnement matières premières", "mitigation_plan": "Agriculture régénérative, irrigation efficiente, diversification bassins", "responsible_person": "VP Agriculture", "target_date": "2027-12-31"},
]

async def populate_data():
    tenant_id = "00000000-0000-0000-0000-000000000001"
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            print("\n" + "="*80)
            print("🚀 INSERTION DES DONNÉES ESG RÉELLES")
            print("="*80)
            
            # Clear existing
            print("\n🗑️  Suppression des données existantes...")
            await session.execute(text("DELETE FROM esg_risks WHERE tenant_id = :tid"), {"tid": tenant_id})
            await session.execute(text("DELETE FROM materiality_issues WHERE tenant_id = :tid"), {"tid": tenant_id})
            await session.commit()
            print("✅ Données supprimées")
            
            # Insert issues
            print(f"\n📊 Insertion de {len(MATERIALITY_ISSUES)} enjeux...")
            for issue in MATERIALITY_ISSUES:
                is_material = issue['financial_impact'] > 60 and issue['esg_impact'] > 60
                avg = (issue['financial_impact'] + issue['esg_impact']) / 2
                priority = 'high' if avg >= 75 else 'medium' if avg >= 50 else 'low'
                
                await session.execute(text("""
                    INSERT INTO materiality_issues
                    (id, tenant_id, name, description, category, financial_impact, esg_impact,
                     stakeholders, is_material, priority, created_at, updated_at)
                    VALUES
                    (gen_random_uuid(), :tid, :name, :desc, :cat, :fi, :ei, :sh, :mat, :pri, NOW(), NOW())
                """), {
                    'tid': tenant_id, 'name': issue['name'], 'desc': issue.get('description'),
                    'cat': issue['category'], 'fi': issue['financial_impact'], 'ei': issue['esg_impact'],
                    'sh': issue.get('stakeholders'), 'mat': is_material, 'pri': priority
                })
            await session.commit()
            print(f"✅ {len(MATERIALITY_ISSUES)} enjeux insérés")
            
            # Insert risks
            print(f"\n🛡️  Insertion de {len(ESG_RISKS)} risques...")
            for risk in ESG_RISKS:
                score = risk['probability'] * risk['impact']
                sev = 'critical' if score >= 20 else 'high' if score >= 12 else 'medium' if score >= 6 else 'low'
                
                await session.execute(text("""
                    INSERT INTO esg_risks
                    (id, tenant_id, title, description, category, probability, impact, risk_score,
                     severity, status, mitigation_plan, mitigation_status, responsible_person,
                     target_date, created_at, updated_at)
                    VALUES
                    (gen_random_uuid(), :tid, :title, :desc, :cat, :prob, :imp, :score, :sev, :status, :mit, :mstat, :resp, :td, NOW(), NOW())
                """), {
                    'tid': tenant_id, 'title': risk['title'], 'desc': risk.get('description'),
                    'cat': risk['category'], 'prob': risk['probability'], 'imp': risk['impact'],
                    'score': score, 'sev': sev, 'status': 'active', 'mit': risk.get('mitigation_plan'),
                    'mstat': 'in_progress', 'resp': risk.get('responsible_person'), 'td': risk.get('target_date')
                })
            await session.commit()
            print(f"✅ {len(ESG_RISKS)} risques insérés")
            
            # Summary
            print("\n" + "="*80)
            print("✅ SUCCÈS ! DONNÉES RÉELLES INSÉRÉES")
            print("="*80)
            print(f"\n📊 {len(MATERIALITY_ISSUES)} enjeux de matérialité")
            print(f"🛡️  {len(ESG_RISKS)} risques ESG")
            print("\n🌐 Testez: http://localhost:3000/materiality")
            print("          http://localhost:3000/risks\n")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(populate_data())
