#!/usr/bin/env python3
"""
Populate ESG Platform with REAL materiality issues and risks
Based on actual CAC40 companies in the database
"""
import asyncio
import sys
from datetime import datetime, timedelta
from sqlalchemy import text

sys.path.insert(0, '/app')

from app.db.session import async_session_maker

# Real materiality issues by sector
MATERIALITY_ISSUES = [
    # FINANCE
    {"name": "Financement de la transition bas-carbone", "category": "environmental", "financial_impact": 85, "esg_impact": 90, "stakeholders": "Investisseurs, Régulateurs, ONG climatiques", "description": "Engagement à financer des projets verts et à réduire l'exposition aux énergies fossiles"},
    {"name": "Stress tests climatiques", "category": "environmental", "financial_impact": 80, "esg_impact": 75, "stakeholders": "ACPR, BCE, Investisseurs institutionnels", "description": "Évaluation de la résilience du portefeuille face aux scénarios climatiques"},
    {"name": "Diversité dans les instances dirigeantes", "category": "social", "financial_impact": 65, "esg_impact": 80, "stakeholders": "Salariés, Investisseurs ESG, Médias", "description": "Mixité et représentation dans les comités de direction et conseils"},
    
    # ENERGY
    {"name": "Transition énergétique et mix bas-carbone", "category": "environmental", "financial_impact": 95, "esg_impact": 98, "stakeholders": "États, Investisseurs, Société civile", "description": "Évolution vers les énergies renouvelables et sortie progressive des fossiles"},
    {"name": "Émissions Scope 3 (utilisation des produits)", "category": "environmental", "financial_impact": 75, "esg_impact": 92, "stakeholders": "Clients, Régulateurs, ONG", "description": "Émissions liées à l'utilisation du pétrole/gaz vendus par les clients finaux"},
    {"name": "Sécurité des installations et prévention accidents", "category": "social", "financial_impact": 88, "esg_impact": 85, "stakeholders": "Salariés, Riverains, Autorités", "description": "Prévention des incidents industriels et protection des travailleurs"},
    
    # MANUFACTURING / AUTOMOTIVE
    {"name": "Économie circulaire et recyclage des matériaux", "category": "environmental", "financial_impact": 70, "esg_impact": 85, "stakeholders": "Fournisseurs, Clients, Régulateurs", "description": "Conception pour la réutilisation et valorisation des déchets"},
    {"name": "Électrification de la flotte automobile", "category": "environmental", "financial_impact": 92, "esg_impact": 88, "stakeholders": "Consommateurs, États, Constructeurs", "description": "Transition vers les véhicules électriques et abandon du thermique"},
    {"name": "Dépendance aux métaux critiques (lithium, cobalt)", "category": "environmental", "financial_impact": 85, "esg_impact": 78, "stakeholders": "Fournisseurs, ONG, Investisseurs", "description": "Sécurisation de l'approvisionnement en matières premières stratégiques"},
    {"name": "Conditions de travail dans la supply chain", "category": "social", "financial_impact": 72, "esg_impact": 88, "stakeholders": "Syndicats, ONG, Consommateurs", "description": "Audit et amélioration des conditions chez les sous-traitants"},
    
    # LUXURY / RETAIL
    {"name": "Traçabilité et sourcing responsable", "category": "environmental", "financial_impact": 68, "esg_impact": 82, "stakeholders": "Clients premium, ONG, Médias", "description": "Transparence sur l'origine des matières premières (cuir, coton, métaux)"},
    {"name": "Bien-être animal dans la supply chain", "category": "social", "financial_impact": 55, "esg_impact": 75, "stakeholders": "Associations, Consommateurs, Marques", "description": "Interdiction fourrure, conditions d'élevage, alternatives végétales"},
    {"name": "Diversité et inclusion dans les campagnes", "category": "social", "financial_impact": 60, "esg_impact": 70, "stakeholders": "Consommateurs, Influenceurs, Régies pub", "description": "Représentation plurielle dans le marketing et communication"},
    
    # CONSTRUCTION
    {"name": "Bâtiments bas-carbone et RE2020", "category": "environmental", "financial_impact": 82, "esg_impact": 88, "stakeholders": "Maîtres d'ouvrage, Collectivités, État", "description": "Conformité à la réglementation environnementale 2020"},
    {"name": "Sécurité des travailleurs sur chantiers", "category": "social", "financial_impact": 78, "esg_impact": 90, "stakeholders": "Salariés, Inspection du travail, Syndicats", "description": "Réduction des accidents du travail et protection collective"},
    
    # TECHNOLOGY / TELECOM
    {"name": "Protection des données personnelles (RGPD)", "category": "governance", "financial_impact": 85, "esg_impact": 82, "stakeholders": "Clients, CNIL, Autorités européennes", "description": "Conformité réglementaire et sécurité des données utilisateurs"},
    {"name": "Empreinte carbone des data centers", "category": "environmental", "financial_impact": 65, "esg_impact": 78, "stakeholders": "Investisseurs ESG, ONG tech, Régulateurs", "description": "Consommation énergétique et refroidissement des infrastructures cloud"},
    {"name": "Inclusion numérique et fracture digitale", "category": "social", "financial_impact": 58, "esg_impact": 72, "stakeholders": "Pouvoirs publics, Associations, Seniors", "description": "Accessibilité des services numériques pour tous les publics"},
    
    # HEALTHCARE
    {"name": "Accès aux médicaments essentiels", "category": "social", "financial_impact": 70, "esg_impact": 92, "stakeholders": "Patients, OMS, ONG santé", "description": "Politique de prix et licences pour pays en développement"},
    {"name": "Éthique de la recherche clinique", "category": "governance", "financial_impact": 75, "esg_impact": 85, "stakeholders": "Autorités santé, Comités éthique, Patients", "description": "Conduite éthique des essais et consentement éclairé"},
]

# Real ESG risks by sector
ESG_RISKS = [
    # FINANCE - Climate & Regulatory
    {"title": "Exposition au risque de transition (actifs fossiles)", "category": "environmental", "probability": 4, "impact": 5, "description": "Dépréciation d'actifs liés aux énergies fossiles suite aux politiques climatiques", "mitigation_plan": "Stress tests réguliers, réorientation progressive vers les énergies vertes", "responsible_person": "Directeur des Risques", "target_date": "2025-12-31"},
    {"title": "Non-conformité aux réglementations ESG (SFDR, Taxonomie)", "category": "governance", "probability": 3, "impact": 4, "description": "Sanctions pour non-respect des règlements européens ESG", "mitigation_plan": "Équipe dédiée conformité ESG, formation continue des équipes", "responsible_person": "Chief Compliance Officer", "target_date": "2025-06-30"},
    
    # ENERGY - Transition & Safety
    {"title": "Dépréciation d'actifs pétroliers et gaziers (stranded assets)", "category": "environmental", "probability": 5, "impact": 5, "description": "Actifs fossiles rendus obsolètes par la transition énergétique", "mitigation_plan": "Diversification vers ENR, programme de reconversion des actifs", "responsible_person": "Directeur Stratégie", "target_date": "2030-12-31"},
    {"title": "Accident industriel majeur (marée noire, explosion)", "category": "social", "probability": 2, "impact": 5, "description": "Incident environnemental avec impact humain et réputationnel catastrophique", "mitigation_plan": "Protocoles de sécurité renforcés, audits trimestriels, assurances", "responsible_person": "Directeur HSE", "target_date": "2025-03-31"},
    {"title": "Pénurie d'eau dans régions d'extraction", "category": "environmental", "probability": 4, "impact": 4, "description": "Stress hydrique limitant les opérations dans certaines zones", "mitigation_plan": "Technologies de recyclage eau, diversification géographique", "responsible_person": "VP Operations", "target_date": "2026-12-31"},
    
    # MANUFACTURING - Supply Chain & Carbon
    {"title": "Rupture de la chaîne d'approvisionnement (semi-conducteurs)", "category": "social", "probability": 4, "impact": 5, "description": "Pénurie de composants critiques bloquant la production", "mitigation_plan": "Diversification fournisseurs, stocks stratégiques, vertical integration", "responsible_person": "Chief Supply Chain Officer", "target_date": "2025-09-30"},
    {"title": "Empreinte carbone de la production (Scope 1 & 2)", "category": "environmental", "probability": 3, "impact": 4, "description": "Dépassement des budgets carbone et exposition taxe carbone EU ETS", "mitigation_plan": "Efficacité énergétique, électrification des process, PPA renouvelables", "responsible_person": "Directeur RSE", "target_date": "2027-12-31"},
    {"title": "Dépendance aux terres rares et métaux critiques", "category": "environmental", "probability": 4, "impact": 4, "description": "Volatilité prix et disponibilité (lithium, cobalt, terres rares)", "mitigation_plan": "Contrats long terme, R&D substitution, recyclage batteries", "responsible_person": "Chief Procurement Officer", "target_date": "2026-06-30"},
    {"title": "Obsolescence des compétences face à l'IA/robotisation", "category": "social", "probability": 3, "impact": 3, "description": "Inadéquation des compétences workforce avec besoins futurs", "mitigation_plan": "Plan de formation massif, upskilling/reskilling, reconversion", "responsible_person": "DRH", "target_date": "2026-12-31"},
    
    # AUTOMOTIVE
    {"title": "Échec de la transition vers l'électrique", "category": "environmental", "probability": 3, "impact": 5, "description": "Retard technologique face aux concurrents sur les VE", "mitigation_plan": "Investissement R&D batteries, partenariats stratégiques", "responsible_person": "Chief Technology Officer", "target_date": "2025-12-31"},
    {"title": "Réglementation anti-diesel/essence en zones urbaines", "category": "governance", "probability": 5, "impact": 4, "description": "Interdiction véhicules thermiques en villes, baisse des ventes", "mitigation_plan": "Accélération gamme électrique, conversion sites production", "responsible_person": "CEO", "target_date": "2028-12-31"},
    
    # LUXURY / RETAIL - Reputation & Ethics
    {"title": "Scandale conditions de travail fournisseurs (fast fashion)", "category": "social", "probability": 3, "impact": 5, "description": "Révélation travail forcé ou enfants dans la supply chain", "mitigation_plan": "Audits sociaux tiers, certification usines, transparence totale", "responsible_person": "Chief Sustainability Officer", "target_date": "2025-12-31"},
    {"title": "Boycott consommateurs sur bien-être animal", "category": "social", "probability": 2, "impact": 4, "description": "Campagnes ONG contre fourrure/cuir exotique", "mitigation_plan": "Sortie fourrure, alternatives végétales, traçabilité cuir", "responsible_person": "Directeur Collections", "target_date": "2026-06-30"},
    {"title": "Contrefaçon et perte de valeur de marque", "category": "governance", "probability": 4, "impact": 3, "description": "Prolifération produits contrefaits nuisant à l'image", "mitigation_plan": "Blockchain traçabilité, collaborations douanes, e-commerce sécurisé", "responsible_person": "Directeur Juridique", "target_date": "2027-12-31"},
    
    # CONSTRUCTION - Safety & Carbon
    {"title": "Accidents mortels sur chantiers", "category": "social", "probability": 3, "impact": 5, "description": "Décès ou blessures graves de travailleurs", "mitigation_plan": "Formation sécurité obligatoire, équipements protection, sanctions", "responsible_person": "Directeur Sécurité Groupe", "target_date": "2025-06-30"},
    {"title": "Empreinte carbone du béton et acier", "category": "environmental", "probability": 4, "impact": 4, "description": "Impossibilité de réduire les émissions avec matériaux actuels", "mitigation_plan": "R&D béton bas-carbone, bois lamellé, acier vert, recyclage", "responsible_person": "Directeur Innovation", "target_date": "2028-12-31"},
    {"title": "Artificialisation des sols et biodiversité", "category": "environmental", "probability": 4, "impact": 3, "description": "Destruction habitats naturels par projets immobiliers", "mitigation_plan": "Études impact biodiversité, compensation écologique, toitures végétalisées", "responsible_person": "Directeur Environnement", "target_date": "2026-12-31"},
    
    # TECHNOLOGY / TELECOM - Cyber & Energy
    {"title": "Cyberattaque majeure et fuite données clients", "category": "governance", "probability": 4, "impact": 5, "description": "Breach massif exposant données personnelles millions clients", "mitigation_plan": "SOC 24/7, tests intrusion, chiffrement end-to-end, plan réponse incident", "responsible_person": "CISO", "target_date": "2025-03-31"},
    {"title": "Obsolescence programmée et e-waste", "category": "environmental", "probability": 3, "impact": 3, "description": "Accusations durée de vie courte des produits, déchets électroniques", "mitigation_plan": "Indice réparabilité, reprise ancien matériel, recyclage composants", "responsible_person": "VP Product", "target_date": "2026-12-31"},
    {"title": "Consommation énergétique data centers", "category": "environmental", "probability": 3, "impact": 4, "description": "Explosion conso électrique avec croissance cloud et IA", "mitigation_plan": "Refroidissement liquide, IA optimisation, PPA solaires/éoliennes", "responsible_person": "VP Infrastructure", "target_date": "2027-12-31"},
    
    # HEALTHCARE - Access & Ethics
    {"title": "Rupture d'approvisionnement médicaments essentiels", "category": "social", "probability": 3, "impact": 5, "description": "Pénurie médicaments critiques menaçant vies patients", "mitigation_plan": "Sites production multiples, stocks sécurité, relocalisations", "responsible_person": "VP Supply Chain Pharma", "target_date": "2025-12-31"},
    {"title": "Scandale éthique essais cliniques", "category": "governance", "probability": 2, "impact": 5, "description": "Violation protocole éthique dans recherche, consentement", "mitigation_plan": "Comité éthique indépendant, audits externes, formation chercheurs", "responsible_person": "Chief Medical Officer", "target_date": "2025-06-30"},
    {"title": "Prix des médicaments jugés excessifs", "category": "social", "probability": 4, "impact": 4, "description": "Pression régulateurs et opinion sur accès abordable aux traitements", "mitigation_plan": "Programmes accès patients, licences volontaires pays pauvres, transparence R&D", "responsible_person": "Chief Commercial Officer", "target_date": "2026-12-31"},
    
    # AGRICULTURE / FOOD
    {"title": "Déforestation dans chaîne soja/huile palme", "category": "environmental", "probability": 4, "impact": 4, "description": "Supply chain contribuant à déforestation Amazonie/Indonésie", "mitigation_plan": "Certification RSPO/Soja+, traçabilité satellite, exclusion fournisseurs", "responsible_person": "Head of Sustainable Sourcing", "target_date": "2025-12-31"},
    {"title": "Stress hydrique zones agricoles clés", "category": "environmental", "probability": 5, "impact": 4, "description": "Sécheresses récurrentes menaçant approvisionnement matières premières", "mitigation_plan": "Agriculture régénérative, irrigation efficiente, diversification bassins", "responsible_person": "VP Agriculture", "target_date": "2027-12-31"},
    
    # WASTE MANAGEMENT
    {"title": "Pollution par microplastiques et lixiviats", "category": "environmental", "probability": 3, "impact": 4, "description": "Contamination sols/nappes phréatiques par décharges", "mitigation_plan": "Technologies traitement avancées, monitoring continu, réhabilitation sites", "responsible_person": "Directeur Technique", "target_date": "2026-12-31"},
]

async def populate_data():
    """Insert real materiality issues and ESG risks into database"""
    tenant_id = "00000000-0000-0000-0000-000000000001"
    
    async with async_session_maker() as session:
        try:
            print("\n" + "="*80)
            print("🚀 INSERTION DES DONNÉES ESG RÉELLES")
            print("="*80)
            
            # Clear existing test data
            print("\n🗑️  Suppression des données de test existantes...")
            await session.execute(text("DELETE FROM esg_risks WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
            await session.execute(text("DELETE FROM materiality_issues WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
            await session.commit()
            print("✅ Données de test supprimées")
            
            # Insert materiality issues
            print(f"\n📊 Insertion de {len(MATERIALITY_ISSUES)} enjeux de matérialité...")
            for issue in MATERIALITY_ISSUES:
                is_material = issue['financial_impact'] > 60 and issue['esg_impact'] > 60
                avg_score = (issue['financial_impact'] + issue['esg_impact']) / 2
                priority = 'high' if avg_score >= 75 else 'medium' if avg_score >= 50 else 'low'
                
                await session.execute(text("""
                    INSERT INTO materiality_issues 
                    (tenant_id, name, description, category, financial_impact, esg_impact, 
                     stakeholders, is_material, priority, created_at, updated_at)
                    VALUES 
                    (:tenant_id, :name, :description, :category, :financial_impact, :esg_impact,
                     :stakeholders, :is_material, :priority, NOW(), NOW())
                """), {
                    'tenant_id': tenant_id,
                    'name': issue['name'],
                    'description': issue.get('description'),
                    'category': issue['category'],
                    'financial_impact': issue['financial_impact'],
                    'esg_impact': issue['esg_impact'],
                    'stakeholders': issue.get('stakeholders'),
                    'is_material': is_material,
                    'priority': priority
                })
            
            await session.commit()
            print(f"✅ {len(MATERIALITY_ISSUES)} enjeux de matérialité insérés")
            
            # Insert ESG risks
            print(f"\n🛡️  Insertion de {len(ESG_RISKS)} risques ESG...")
            for risk in ESG_RISKS:
                risk_score = risk['probability'] * risk['impact']
                if risk_score >= 20:
                    severity = 'critical'
                elif risk_score >= 12:
                    severity = 'high'
                elif risk_score >= 6:
                    severity = 'medium'
                else:
                    severity = 'low'
                
                target_date = None
                if risk.get('target_date'):
                    target_date = risk['target_date']
                
                await session.execute(text("""
                    INSERT INTO esg_risks
                    (tenant_id, title, description, category, probability, impact, risk_score,
                     severity, status, mitigation_plan, mitigation_status, responsible_person,
                     target_date, created_at, updated_at)
                    VALUES
                    (:tenant_id, :title, :description, :category, :probability, :impact, :risk_score,
                     :severity, :status, :mitigation_plan, :mitigation_status, :responsible_person,
                     :target_date, NOW(), NOW())
                """), {
                    'tenant_id': tenant_id,
                    'title': risk['title'],
                    'description': risk.get('description'),
                    'category': risk['category'],
                    'probability': risk['probability'],
                    'impact': risk['impact'],
                    'risk_score': risk_score,
                    'severity': severity,
                    'status': 'active',
                    'mitigation_plan': risk.get('mitigation_plan'),
                    'mitigation_status': 'in_progress',
                    'responsible_person': risk.get('responsible_person'),
                    'target_date': target_date
                })
            
            await session.commit()
            print(f"✅ {len(ESG_RISKS)} risques ESG insérés")
            
            # Summary
            print("\n" + "="*80)
            print("📈 RÉSUMÉ DES DONNÉES INSÉRÉES")
            print("="*80)
            
            # Count by category
            result = await session.execute(text("""
                SELECT category, COUNT(*) as count
                FROM materiality_issues
                WHERE tenant_id = :tenant_id
                GROUP BY category
                ORDER BY count DESC
            """), {'tenant_id': tenant_id})
            
            print("\n📊 Enjeux de Matérialité par catégorie:")
            for row in result:
                print(f"   • {row.category:15} : {row.count:2} enjeux")
            
            result = await session.execute(text("""
                SELECT severity, COUNT(*) as count
                FROM esg_risks
                WHERE tenant_id = :tenant_id
                GROUP BY severity
                ORDER BY 
                    CASE severity
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END
            """), {'tenant_id': tenant_id})
            
            print("\n🛡️  Risques ESG par sévérité:")
            for row in result:
                print(f"   • {row.severity:10} : {row.count:2} risques")
            
            print("\n" + "="*80)
            print("✅ DONNÉES RÉELLES INSÉRÉES AVEC SUCCÈS !")
            print("="*80)
            print("\n🌐 Testez maintenant:")
            print("   • http://localhost:3000/materiality")
            print("   • http://localhost:3000/risks")
            print("\n")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(populate_data())
