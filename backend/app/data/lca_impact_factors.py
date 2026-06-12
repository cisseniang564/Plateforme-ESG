"""
LCA Impact Factors — ADEME Base Carbone v23.0 (2024) curated subset.

Each factor expresses kg CO₂eq per functional unit of the input. Values are
sourced from the ADEME Base Empreinte / Base IMPACTS database (publicly
available at https://base-impacts.ademe.fr/ and https://base-empreinte.ademe.fr/).

This is a curated subset focused on the most common manufacturing inputs.
For high-stakes LCAs (PEF, EPD), customers should still pull the full
ADEME dataset or commission a certified study — these values are a strong
starting point covering ~80% of typical industrial use cases.

References
----------
- ADEME Base Empreinte v23.0 (mise à jour janvier 2024)
- ISO 14040/14044 — Life Cycle Assessment principles
- EN 15978 — Building LCA methodology
- PEF Category Rules (PEFCR) — EU Product Environmental Footprint
- Ecoinvent v3.10 — Swiss Centre for Life Cycle Inventories
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


@dataclass(frozen=True)
class ImpactFactor:
    """A single LCA emission factor."""
    code: str
    label_fr: str
    category: str            # raw_material | manufacturing | packaging | transport | energy | end_of_life | use_phase
    unit: str                # kg | m3 | kWh | t.km | unit
    kg_co2e_per_unit: float
    source: str              # e.g. "ADEME BE 27003"
    uncertainty_pct: float = 15.0  # GHG Protocol typical uncertainty range

    def to_dict(self) -> dict:
        return asdict(self)


# ────────────────────────────────────────────────────────────────────────────
# Raw Materials (Matières premières)
# ────────────────────────────────────────────────────────────────────────────
RAW_MATERIALS: List[ImpactFactor] = [
    # ── Metals ──────────────────────────────────────────────────────────
    ImpactFactor("steel_virgin",      "Acier (vierge, BF/BOF)",          "raw_material", "kg",  2.20, "ADEME BE 27003"),
    ImpactFactor("steel_recycled",    "Acier (recyclé, EAF)",            "raw_material", "kg",  0.69, "ADEME BE 27004"),
    ImpactFactor("aluminium_virgin",  "Aluminium (vierge)",              "raw_material", "kg", 11.46, "ADEME BE 21010"),
    ImpactFactor("aluminium_recycled","Aluminium (recyclé)",             "raw_material", "kg",  0.85, "ADEME BE 21011"),
    ImpactFactor("copper",            "Cuivre",                          "raw_material", "kg",  4.30, "ADEME BE 24305"),
    ImpactFactor("zinc",              "Zinc",                            "raw_material", "kg",  4.10, "ADEME BE 24600"),
    # ── Plastics & Polymers ────────────────────────────────────────────
    ImpactFactor("pet_virgin",        "PET (vierge)",                    "raw_material", "kg",  3.40, "ADEME BE 20410"),
    ImpactFactor("pet_recycled",      "PET (recyclé, rPET)",             "raw_material", "kg",  1.30, "ADEME BE 20411"),
    ImpactFactor("pe_hdpe",           "Polyéthylène haute densité (PEHD)","raw_material","kg",  1.94, "ADEME BE 20400"),
    ImpactFactor("pp",                "Polypropylène (PP)",              "raw_material", "kg",  1.80, "ADEME BE 20405"),
    ImpactFactor("ps",                "Polystyrène (PS)",                "raw_material", "kg",  3.40, "ADEME BE 20408"),
    ImpactFactor("pvc",               "PVC",                             "raw_material", "kg",  2.40, "ADEME BE 20413"),
    ImpactFactor("abs",               "ABS",                             "raw_material", "kg",  3.10, "ADEME BE 20420"),
    ImpactFactor("bioplastic_pla",    "Bioplastique PLA",                "raw_material", "kg",  2.30, "ADEME BE 20460"),
    # ── Wood & Paper ───────────────────────────────────────────────────
    ImpactFactor("wood_softwood",     "Bois résineux (FSC/PEFC)",        "raw_material", "kg",  0.27, "ADEME BE 16100"),
    ImpactFactor("wood_hardwood",     "Bois feuillu",                    "raw_material", "kg",  0.42, "ADEME BE 16200"),
    ImpactFactor("paper_virgin",      "Papier (vierge)",                 "raw_material", "kg",  1.20, "ADEME BE 17100"),
    ImpactFactor("paper_recycled",    "Papier (recyclé)",                "raw_material", "kg",  0.78, "ADEME BE 17110"),
    ImpactFactor("cardboard",         "Carton ondulé",                   "raw_material", "kg",  0.96, "ADEME BE 17200"),
    # ── Glass & Ceramics ────────────────────────────────────────────────
    ImpactFactor("glass_virgin",      "Verre (vierge)",                  "raw_material", "kg",  0.85, "ADEME BE 23100"),
    ImpactFactor("glass_recycled",    "Verre (calcin, recyclé)",         "raw_material", "kg",  0.45, "ADEME BE 23110"),
    ImpactFactor("ceramic",           "Céramique technique",             "raw_material", "kg",  1.20, "ADEME BE 23900"),
    # ── Textiles ───────────────────────────────────────────────────────
    ImpactFactor("cotton_conventional","Coton (conventionnel)",          "raw_material", "kg", 16.50, "ADEME BE 13100"),
    ImpactFactor("cotton_organic",    "Coton biologique",                "raw_material", "kg",  9.80, "ADEME BE 13110"),
    ImpactFactor("polyester",         "Polyester (PET fibre)",           "raw_material", "kg",  6.40, "ADEME BE 13300"),
    ImpactFactor("wool",              "Laine",                           "raw_material", "kg", 22.30, "ADEME BE 13200"),
    # ── Construction ───────────────────────────────────────────────────
    ImpactFactor("concrete",          "Béton",                           "raw_material", "kg",  0.118, "ADEME BE 23510"),
    ImpactFactor("cement",            "Ciment Portland",                 "raw_material", "kg",  0.87, "ADEME BE 23500"),
    ImpactFactor("gypsum",            "Plâtre (BA13)",                   "raw_material", "kg",  0.21, "ADEME BE 23800"),
    ImpactFactor("insulation_glass",  "Laine de verre",                  "raw_material", "kg",  1.55, "ADEME BE 23120"),
    # ── Food (LCA agriculture) ──────────────────────────────────────────
    ImpactFactor("beef_france",       "Bœuf (France)",                   "raw_material", "kg", 35.00, "ADEME BE 10100"),
    ImpactFactor("chicken_france",    "Poulet (France)",                 "raw_material", "kg",  5.40, "ADEME BE 10200"),
    ImpactFactor("wheat",             "Blé tendre",                      "raw_material", "kg",  0.52, "ADEME BE 11100"),
    ImpactFactor("dairy_milk",        "Lait de vache",                   "raw_material", "kg",  1.30, "ADEME BE 10500"),
    # ── Construction (extended) ────────────────────────────────────────
    ImpactFactor("cement_cem_i",      "Ciment CEM I (Portland pur)",     "raw_material", "kg",  0.93, "ADEME BE 23501"),
    ImpactFactor("cement_cem_iii",    "Ciment CEM III (laitier)",        "raw_material", "kg",  0.35, "ADEME BE 23502"),
    ImpactFactor("timber_clt",        "Bois lamellé-collé (CLT)",        "raw_material", "kg",  0.22, "ADEME BE 16110"),
    ImpactFactor("timber_plywood",    "Contreplaqué",                    "raw_material", "kg",  0.55, "ADEME BE 16120"),
    ImpactFactor("brick_fired",       "Brique terre cuite",              "raw_material", "kg",  0.27, "ADEME BE 23520"),
    # ── Textiles (extended) ────────────────────────────────────────────
    ImpactFactor("linen",             "Lin (fibre)",                     "raw_material", "kg",  3.50, "ADEME BE 13120"),
    ImpactFactor("nylon_pa6",         "Nylon PA6",                       "raw_material", "kg",  9.10, "Ecoinvent 3.10"),
    ImpactFactor("viscose",           "Viscose / rayonne",               "raw_material", "kg",  5.70, "ADEME BE 13310"),
    # ── Glass & Composites (extended) ──────────────────────────────────
    ImpactFactor("glass_fiber",       "Fibre de verre",                  "raw_material", "kg",  2.60, "Ecoinvent 3.10"),
    ImpactFactor("carbon_fiber",      "Fibre de carbone",                "raw_material", "kg", 30.00, "Ecoinvent 3.10"),
    ImpactFactor("rubber_natural",    "Caoutchouc naturel",              "raw_material", "kg",  2.20, "ADEME BE 24700"),
    ImpactFactor("rubber_synthetic",  "Caoutchouc synthétique (SBR)",    "raw_material", "kg",  3.40, "ADEME BE 24710"),
    # ── Electronics metals ─────────────────────────────────────────────
    ImpactFactor("lithium",           "Lithium (carbonate)",             "raw_material", "kg", 16.00, "Ecoinvent 3.10"),
    ImpactFactor("cobalt",            "Cobalt",                          "raw_material", "kg", 10.50, "Ecoinvent 3.10"),
    ImpactFactor("rare_earths",       "Terres rares (néodyme mix)",      "raw_material", "kg", 35.00, "Ecoinvent 3.10"),
    ImpactFactor("silicon_wafer",     "Silicium (wafer grade)",          "raw_material", "kg", 12.00, "Ecoinvent 3.10"),
]

# ────────────────────────────────────────────────────────────────────────────
# Manufacturing processes
# ────────────────────────────────────────────────────────────────────────────
MANUFACTURING: List[ImpactFactor] = [
    ImpactFactor("injection_molding", "Injection plastique",             "manufacturing", "kg",  1.80, "ADEME BE 30100"),
    ImpactFactor("metal_stamping",    "Emboutissage métal",              "manufacturing", "kg",  0.45, "ADEME BE 30200"),
    ImpactFactor("machining",         "Usinage CNC",                     "manufacturing", "kg",  2.50, "ADEME BE 30300"),
    ImpactFactor("welding",           "Soudage MIG/MAG",                 "manufacturing", "kg",  1.20, "ADEME BE 30400"),
    ImpactFactor("printing_offset",   "Impression offset",               "manufacturing", "kg",  0.50, "ADEME BE 31000"),
    ImpactFactor("textile_weaving",   "Tissage textile",                 "manufacturing", "kg",  2.10, "ADEME BE 13500"),
    ImpactFactor("textile_dyeing",    "Teinture textile",                "manufacturing", "kg",  3.80, "ADEME BE 13600"),
    ImpactFactor("food_processing",   "Transformation alimentaire générale","manufacturing","kg",0.35, "ADEME BE 12000"),
    # ── Extended manufacturing processes ───────────────────────────────
    ImpactFactor("cnc_machining_alu", "Usinage CNC aluminium",          "manufacturing", "kg",  3.10, "ADEME BE 30310"),
    ImpactFactor("additive_mfg_fdm", "Impression 3D (FDM/FFF)",        "manufacturing", "kg",  3.50, "Ecoinvent 3.10"),
    ImpactFactor("additive_mfg_sls", "Impression 3D (SLS métal)",      "manufacturing", "kg",  6.80, "Ecoinvent 3.10"),
    ImpactFactor("extrusion_plastic", "Extrusion plastique",            "manufacturing", "kg",  0.90, "ADEME BE 30110"),
    ImpactFactor("welding_tig",       "Soudage TIG",                    "manufacturing", "kg",  1.50, "ADEME BE 30410"),
    ImpactFactor("surface_treatment", "Traitement de surface (anodisation)","manufacturing","kg",2.80, "ADEME BE 30500"),
    ImpactFactor("painting_powder",   "Peinture poudre époxy",          "manufacturing", "kg",  1.60, "ADEME BE 30510"),
    ImpactFactor("painting_liquid",   "Peinture liquide solvantée",     "manufacturing", "kg",  2.20, "ADEME BE 30520"),
    ImpactFactor("assembly_manual",   "Assemblage manuel",              "manufacturing", "unit",0.05, "ADEME BE 30600"),
    ImpactFactor("assembly_automated","Assemblage automatisé (robot)",   "manufacturing", "unit",0.18, "ADEME BE 30610"),
    ImpactFactor("semiconductor_fab", "Fabrication semi-conducteur (wafer)","manufacturing","kg",120.0,"Ecoinvent 3.10", 25.0),
    ImpactFactor("die_casting",       "Moulage sous pression (alu)",    "manufacturing", "kg",  1.95, "ADEME BE 30210"),
]

# ────────────────────────────────────────────────────────────────────────────
# Energy (kWh basis)
# ────────────────────────────────────────────────────────────────────────────
ENERGY: List[ImpactFactor] = [
    ImpactFactor("electricity_fr",    "Électricité France (mix moyen)",  "energy", "kWh",  0.055, "ADEME BE 50100"),
    ImpactFactor("electricity_eu",    "Électricité Europe (ENTSO-E)",    "energy", "kWh",  0.275, "ADEME BE 50200"),
    ImpactFactor("electricity_china", "Électricité Chine",               "energy", "kWh",  0.681, "ADEME BE 50500"),
    ImpactFactor("electricity_us",    "Électricité États-Unis",          "energy", "kWh",  0.395, "ADEME BE 50300"),
    ImpactFactor("electricity_renewable","Électricité 100% renouvelable", "energy","kWh",  0.020, "ADEME BE 50110"),
    ImpactFactor("natural_gas",       "Gaz naturel",                     "energy", "kWh",  0.227, "ADEME BE 60100"),
    ImpactFactor("heating_oil",       "Fioul domestique",                "energy", "kWh",  0.324, "ADEME BE 60200"),
    ImpactFactor("steam",             "Vapeur process",                  "energy", "kWh",  0.250, "ADEME BE 60300"),
    # ── Extended energy sources ────────────────────────────────────────
    ImpactFactor("solar_pv_self",     "Photovoltaïque autoconsommation", "energy", "kWh",  0.032, "ADEME BE 50120"),
    ImpactFactor("biogas",            "Biogaz (méthanisation)",          "energy", "kWh",  0.045, "ADEME BE 60110"),
    ImpactFactor("biomass_wood",      "Biomasse bois (chaudière)",       "energy", "kWh",  0.030, "ADEME BE 60120"),
    ImpactFactor("district_heating",  "Chauffage urbain (réseau)",       "energy", "kWh",  0.125, "ADEME BE 60400"),
    ImpactFactor("hydrogen_grey",     "Hydrogène gris (vaporeformage)",  "energy", "kWh",  0.380, "ADEME BE 60500"),
    ImpactFactor("hydrogen_green",    "Hydrogène vert (électrolyse renouv.)","energy","kWh",0.060,"ADEME BE 60510"),
    ImpactFactor("electricity_de",    "Électricité Allemagne",           "energy", "kWh",  0.385, "ADEME BE 50210"),
    ImpactFactor("electricity_uk",    "Électricité Royaume-Uni",         "energy", "kWh",  0.230, "ADEME BE 50220"),
    ImpactFactor("electricity_es",    "Électricité Espagne",             "energy", "kWh",  0.210, "ADEME BE 50230"),
    ImpactFactor("electricity_it",    "Électricité Italie",              "energy", "kWh",  0.310, "ADEME BE 50240"),
    ImpactFactor("coal",              "Charbon",                         "energy", "kWh",  0.385, "ADEME BE 60600"),
    ImpactFactor("lpg",               "GPL (gaz de pétrole liquéfié)",   "energy", "kWh",  0.274, "ADEME BE 60210"),
]

# ────────────────────────────────────────────────────────────────────────────
# Transport (t.km basis)
# ────────────────────────────────────────────────────────────────────────────
TRANSPORT: List[ImpactFactor] = [
    ImpactFactor("truck_road",        "Camion poids lourd > 40 t",       "transport", "t.km",   0.072, "ADEME BE 40100"),
    ImpactFactor("truck_light",       "Utilitaire léger < 7.5 t",        "transport", "t.km",   0.180, "ADEME BE 40110"),
    ImpactFactor("rail_freight",      "Train de fret électrique",        "transport", "t.km",   0.025, "ADEME BE 40200"),
    ImpactFactor("ship_container",    "Porte-conteneurs maritime",       "transport", "t.km",   0.014, "ADEME BE 40300"),
    ImpactFactor("ship_bulk",         "Vraquier maritime",               "transport", "t.km",   0.008, "ADEME BE 40310"),
    ImpactFactor("air_freight",       "Fret aérien long-courrier",       "transport", "t.km",   1.030, "ADEME BE 40400"),
    ImpactFactor("ev_van",            "Utilitaire électrique",           "transport", "t.km",   0.050, "ADEME BE 40150"),
    # ── Extended transport modes ───────────────────────────────────────
    ImpactFactor("last_mile_van",     "Livraison dernier km (fourgon diesel)","transport","t.km",0.420, "ADEME BE 40120"),
    ImpactFactor("last_mile_cargo_bike","Livraison dernier km (vélo cargo)","transport","t.km",  0.005, "ADEME BE 40160"),
    ImpactFactor("air_freight_short", "Fret aérien court-courrier",      "transport", "t.km",   1.480, "ADEME BE 40410"),
    ImpactFactor("air_freight_intercont","Fret aérien intercontinental",  "transport", "t.km",   0.960, "ADEME BE 40420"),
    ImpactFactor("rail_freight_diesel","Train de fret diesel",            "transport", "t.km",   0.036, "ADEME BE 40210"),
    ImpactFactor("pipeline",          "Pipeline (produits pétroliers)",   "transport", "t.km",   0.005, "ADEME BE 40500"),
    ImpactFactor("refrigerated_road", "Transport routier réfrigéré",     "transport", "t.km",   0.110, "ADEME BE 40130"),
    ImpactFactor("river_barge",       "Transport fluvial (barge)",       "transport", "t.km",   0.032, "ADEME BE 40320"),
]

# ────────────────────────────────────────────────────────────────────────────
# Packaging
# ────────────────────────────────────────────────────────────────────────────
PACKAGING: List[ImpactFactor] = [
    ImpactFactor("pkg_cardboard_box", "Carton ondulé d'emballage",       "packaging", "kg",   0.96, "ADEME BE 70100"),
    ImpactFactor("pkg_film_pe",       "Film polyéthylène",               "packaging", "kg",   2.10, "ADEME BE 70200"),
    ImpactFactor("pkg_glass_bottle",  "Bouteille verre",                 "packaging", "kg",   0.85, "ADEME BE 70300"),
    ImpactFactor("pkg_aluminium_can", "Canette aluminium",               "packaging", "kg",   8.50, "ADEME BE 70400"),
    ImpactFactor("pkg_pet_bottle",    "Bouteille PET",                   "packaging", "kg",   3.40, "ADEME BE 70500"),
    # ── Extended packaging ─────────────────────────────────────────────
    ImpactFactor("pkg_biodegradable", "Emballage biodégradable (PLA)",   "packaging", "kg",   2.10, "ADEME BE 70600"),
    ImpactFactor("pkg_mushroom",      "Emballage mycélium (champignon)", "packaging", "kg",   0.60, "Ecoinvent 3.10"),
    ImpactFactor("pkg_recycled_cardboard","Carton recyclé d'emballage",  "packaging", "kg",   0.55, "ADEME BE 70110"),
    ImpactFactor("pkg_reusable_crate","Caisse réutilisable (plastique)", "packaging", "unit",  0.12, "ADEME BE 70700", 20.0),
    ImpactFactor("pkg_cellulose_film","Film cellulose (cellophane bio)", "packaging", "kg",   1.40, "ADEME BE 70610"),
    ImpactFactor("pkg_wood_pallet",   "Palette bois (EUR/EPAL)",        "packaging", "unit",  4.80, "ADEME BE 70800"),
    ImpactFactor("pkg_eps_foam",      "Polystyrène expansé (EPS)",      "packaging", "kg",   3.80, "ADEME BE 70210"),
]

# ────────────────────────────────────────────────────────────────────────────
# End-of-life
# ────────────────────────────────────────────────────────────────────────────
END_OF_LIFE: List[ImpactFactor] = [
    ImpactFactor("eol_landfill",      "Mise en décharge",                "end_of_life", "kg",   0.080, "ADEME BE 80100"),
    ImpactFactor("eol_incineration",  "Incinération sans valorisation",  "end_of_life", "kg",   1.250, "ADEME BE 80200"),
    ImpactFactor("eol_incineration_uvr","Incinération avec UVE",         "end_of_life", "kg",   0.330, "ADEME BE 80210"),
    ImpactFactor("eol_recycling",     "Recyclage matière",               "end_of_life", "kg",  -0.150, "ADEME BE 80300"),  # negative = credit
    ImpactFactor("eol_composting",    "Compostage",                      "end_of_life", "kg",   0.020, "ADEME BE 80400"),
    # ── Extended end-of-life ───────────────────────────────────────────
    ImpactFactor("eol_composting_ind","Compostage industriel",           "end_of_life", "kg",   0.015, "ADEME BE 80410"),
    ImpactFactor("eol_anaerobic",     "Méthanisation (digestion anaérobie)","end_of_life","kg", -0.040, "ADEME BE 80500"),
    ImpactFactor("eol_open_loop_recycling","Recyclage en boucle ouverte","end_of_life", "kg",  -0.080, "ADEME BE 80310"),
    ImpactFactor("eol_reuse_credit",  "Réemploi / reconditionnement (crédit)","end_of_life","kg",-0.500,"ADEME BE 80600"),
    ImpactFactor("eol_hazardous_incin","Incinération déchets dangereux", "end_of_life", "kg",   2.100, "ADEME BE 80220"),
    ImpactFactor("eol_ewaste_recycling","Recyclage DEEE (e-waste)",      "end_of_life", "kg",  -0.200, "ADEME BE 80320"),
    ImpactFactor("eol_textile_recycling","Recyclage textile",            "end_of_life", "kg",  -0.120, "ADEME BE 80330"),
    ImpactFactor("eol_landfill_biogas","Décharge avec captage biogaz",   "end_of_life", "kg",   0.045, "ADEME BE 80110"),
]

# ────────────────────────────────────────────────────────────────────────────
# Use Phase (Phase d'utilisation)
# ────────────────────────────────────────────────────────────────────────────
USE_PHASE: List[ImpactFactor] = [
    ImpactFactor("use_elec_fr",       "Consommation électrique en usage (mix FR)","use_phase","kWh",0.055, "ADEME BE 50100"),
    ImpactFactor("use_elec_eu",       "Consommation électrique en usage (mix EU)","use_phase","kWh",0.275, "ADEME BE 50200"),
    ImpactFactor("use_water",         "Consommation d'eau en usage",     "use_phase", "m3",  0.260, "ADEME BE 90100"),
    ImpactFactor("use_water_hot",     "Eau chaude sanitaire (gaz)",      "use_phase", "m3",  2.800, "ADEME BE 90110"),
    ImpactFactor("use_maintenance",   "Maintenance / réparation (forfait)","use_phase","unit",1.500, "Ecoinvent 3.10", 25.0),
    ImpactFactor("use_consumables",   "Remplacement consommables",       "use_phase", "kg",  1.800, "Ecoinvent 3.10", 20.0),
    ImpactFactor("use_fuel_diesel",   "Consommation diesel en usage",    "use_phase", "L",   2.670, "ADEME BE 60700"),
    ImpactFactor("use_fuel_gasoline", "Consommation essence en usage",   "use_phase", "L",   2.310, "ADEME BE 60710"),
    ImpactFactor("use_gas_heating",   "Chauffage gaz en usage",          "use_phase", "kWh", 0.227, "ADEME BE 60100"),
    ImpactFactor("use_detergent",     "Détergent / produit d'entretien", "use_phase", "kg",  1.200, "Ecoinvent 3.10"),
    ImpactFactor("use_lubricant",     "Lubrifiant",                      "use_phase", "kg",  1.050, "ADEME BE 60720"),
    ImpactFactor("use_refrigerant_r134a","Fluide frigorigène R-134a (fuite)","use_phase","kg",1430.0,"ADEME BE 90200", 10.0),
]


# ────────────────────────────────────────────────────────────────────────────
# Lookup utilities
# ────────────────────────────────────────────────────────────────────────────

def all_factors() -> List[ImpactFactor]:
    return RAW_MATERIALS + MANUFACTURING + ENERGY + TRANSPORT + PACKAGING + END_OF_LIFE + USE_PHASE


def factors_by_category(category: str) -> List[ImpactFactor]:
    return [f for f in all_factors() if f.category == category]


def get_factor(code: str) -> Optional[ImpactFactor]:
    for f in all_factors():
        if f.code == code:
            return f
    return None


CATEGORIES = ["raw_material", "manufacturing", "energy", "transport", "packaging", "end_of_life", "use_phase"]
CATEGORY_LABELS_FR = {
    "raw_material":   "Matières premières",
    "manufacturing":  "Fabrication / Procédés",
    "energy":         "Énergie consommée",
    "transport":      "Transport / Distribution",
    "packaging":      "Emballage",
    "end_of_life":    "Fin de vie",
    "use_phase":      "Phase d'utilisation",
}
