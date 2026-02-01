"""
Standard laying curve for layer hens.
Based on typical commercial layer performance (ISA Brown, Lohmann, etc.)
"""
from typing import Optional, Dict, Tuple
from enum import Enum


class LayingPhase(str, Enum):
    PRE_LAY = "pre_lay"           # 0-17 weeks: no eggs
    ONSET = "onset"               # 18-20 weeks: start of laying
    RISING = "rising"             # 20-25 weeks: rapid increase
    PEAK = "peak"                 # 25-32 weeks: peak production
    POST_PEAK = "post_peak"       # 32-52 weeks: gradual decline
    END_OF_CYCLE = "end_cycle"    # 52+ weeks: low production


# Standard laying curve by age (weeks)
# Format: (min_expected, max_expected, optimal)
LAYING_CURVE: Dict[Tuple[int, int], Tuple[float, float, float]] = {
    (0, 17): (0, 0, 0),           # Pre-lay: no eggs
    (18, 18): (0, 10, 5),         # Week 18: first eggs
    (19, 19): (5, 25, 15),        # Week 19: starting
    (20, 20): (20, 50, 35),       # Week 20: rising
    (21, 21): (40, 70, 55),       # Week 21: rising
    (22, 22): (55, 80, 70),       # Week 22: rising
    (23, 23): (70, 88, 80),       # Week 23: approaching peak
    (24, 24): (80, 92, 88),       # Week 24: near peak
    (25, 26): (85, 95, 92),       # Week 25-26: peak
    (27, 30): (88, 96, 94),       # Week 27-30: peak plateau
    (31, 35): (85, 94, 91),       # Week 31-35: early post-peak
    (36, 40): (82, 92, 88),       # Week 36-40: post-peak
    (41, 45): (78, 88, 84),       # Week 41-45: decline
    (46, 50): (72, 84, 79),       # Week 46-50: decline
    (51, 55): (65, 78, 72),       # Week 51-55: late cycle
    (56, 60): (58, 72, 66),       # Week 56-60: late cycle
    (61, 70): (50, 68, 60),       # Week 61-70: end of cycle
    (71, 100): (40, 60, 50),      # 71+ weeks: very late
}


def get_age_weeks(age_days: int) -> int:
    """Convert age in days to weeks."""
    return age_days // 7


def get_laying_phase(age_weeks: int) -> LayingPhase:
    """Get the laying phase based on age in weeks."""
    if age_weeks < 18:
        return LayingPhase.PRE_LAY
    elif age_weeks < 20:
        return LayingPhase.ONSET
    elif age_weeks < 25:
        return LayingPhase.RISING
    elif age_weeks < 32:
        return LayingPhase.PEAK
    elif age_weeks < 52:
        return LayingPhase.POST_PEAK
    else:
        return LayingPhase.END_OF_CYCLE


def get_phase_label(phase: LayingPhase) -> str:
    """Get French label for laying phase."""
    labels = {
        LayingPhase.PRE_LAY: "Pre-ponte",
        LayingPhase.ONSET: "Debut de ponte",
        LayingPhase.RISING: "Montee en ponte",
        LayingPhase.PEAK: "Pic de ponte",
        LayingPhase.POST_PEAK: "Post-pic",
        LayingPhase.END_OF_CYCLE: "Fin de cycle"
    }
    return labels.get(phase, "Inconnu")


def get_expected_laying_rate(age_weeks: int) -> Dict:
    """
    Get expected laying rate for a given age in weeks.
    Returns min, max, and optimal expected rates.
    """
    for (min_week, max_week), (min_rate, max_rate, optimal) in LAYING_CURVE.items():
        if min_week <= age_weeks <= max_week:
            return {
                "min_expected": min_rate,
                "max_expected": max_rate,
                "optimal_expected": optimal,
                "age_weeks": age_weeks
            }

    # Default for very old flocks
    return {
        "min_expected": 30,
        "max_expected": 50,
        "optimal_expected": 40,
        "age_weeks": age_weeks
    }


def analyze_laying_performance(age_days: int, actual_rate: float) -> Dict:
    """
    Analyze laying performance vs expected for the age.
    Returns detailed analysis with recommendations.
    """
    age_weeks = get_age_weeks(age_days)
    phase = get_laying_phase(age_weeks)
    expected = get_expected_laying_rate(age_weeks)

    # Calculate performance score
    if expected["optimal_expected"] > 0:
        performance_ratio = actual_rate / expected["optimal_expected"]
    else:
        performance_ratio = 1.0 if actual_rate == 0 else 0

    # Determine status (using constants expected by frontend)
    if phase == LayingPhase.PRE_LAY:
        status = "PRE_LAY"
        status_label = "Pre-ponte"
    elif actual_rate > expected["max_expected"]:
        status = "EXCELLENT"
        status_label = "Excellente"
    elif actual_rate >= expected["optimal_expected"]:
        status = "GOOD"
        status_label = "Bonne"
    elif actual_rate >= expected["min_expected"]:
        status = "GOOD"
        status_label = "Normale"
    elif actual_rate >= expected["min_expected"] * 0.8:
        status = "BELOW_EXPECTED"
        status_label = "Sous les attentes"
    else:
        status = "CRITICAL"
        status_label = "Critique"

    # Generate recommendation
    recommendation = None
    if status == "BELOW_EXPECTED" and phase in [LayingPhase.RISING, LayingPhase.PEAK]:
        recommendation = "Le taux de ponte est inferieur a la normale. Verifiez: alimentation, eclairage (16h/jour), stress, maladies."
    elif status == "CRITICAL" and phase == LayingPhase.ONSET:
        recommendation = "La montee en ponte semble lente. Assurez-vous que l'aliment pondeuse est distribue et l'eclairage est correct."
    elif phase == LayingPhase.PRE_LAY and actual_rate > 5:
        recommendation = "Ponte precoce detectee. C'est inhabituel avant 18 semaines, verifiez l'age du lot."

    # Calculate gap vs optimal (deviation)
    deviation = actual_rate - expected["optimal_expected"]

    return {
        "age_days": age_days,
        "age_weeks": age_weeks,
        "phase": phase.value,
        "phase_label": get_phase_label(phase),
        "actual_rate": round(actual_rate, 1),
        "expected": expected,
        "performance_ratio": round(performance_ratio, 2),
        "status": status,
        "status_label": status_label,
        "deviation": round(deviation, 1),
        "recommendation": recommendation
    }


def get_full_laying_curve() -> list:
    """
    Get the full standard laying curve for charting.
    Returns list of points from week 16 to week 72.
    """
    curve = []
    for week in range(16, 73):
        expected = get_expected_laying_rate(week)
        phase = get_laying_phase(week)
        curve.append({
            "week": week,
            "age_days": week * 7,
            "min_expected": expected["min_expected"],
            "max_expected": expected["max_expected"],
            "optimal": expected["optimal_expected"],
            "phase": phase.value,
            "phase_label": get_phase_label(phase)
        })
    return curve


def estimate_peak_date(placement_date, age_at_placement_days: int = 1) -> Dict:
    """
    Estimate when peak production will occur based on placement date.
    Peak is typically around 27-30 weeks of age.
    """
    from datetime import timedelta

    # Age at placement in weeks
    age_at_placement_weeks = age_at_placement_days // 7

    # Weeks until onset (18 weeks)
    weeks_to_onset = max(0, 18 - age_at_placement_weeks)

    # Weeks until peak (27-30 weeks)
    weeks_to_peak_start = max(0, 27 - age_at_placement_weeks)
    weeks_to_peak_end = max(0, 30 - age_at_placement_weeks)

    onset_date = placement_date + timedelta(weeks=weeks_to_onset)
    peak_start = placement_date + timedelta(weeks=weeks_to_peak_start)
    peak_end = placement_date + timedelta(weeks=weeks_to_peak_end)

    return {
        "onset_date": onset_date,
        "peak_start_date": peak_start,
        "peak_end_date": peak_end,
        "weeks_to_onset": weeks_to_onset,
        "weeks_to_peak": weeks_to_peak_start
    }


def get_feed_recommendation_by_phase(phase: LayingPhase) -> Dict:
    """Get feed type recommendation based on laying phase."""
    recommendations = {
        LayingPhase.PRE_LAY: {
            "feed_type": "pre_layer",
            "feed_type_label": "Pre-ponte",
            "calcium_level": "2.0-2.5%",
            "protein_level": "16-17%",
            "note": "Preparer les os pour la ponte, transition vers aliment pondeuse a 5% de ponte"
        },
        LayingPhase.ONSET: {
            "feed_type": "layer",
            "feed_type_label": "Pondeuse",
            "calcium_level": "3.5-4.0%",
            "protein_level": "17-18%",
            "note": "Debut aliment pondeuse, augmenter progressivement le calcium"
        },
        LayingPhase.RISING: {
            "feed_type": "layer",
            "feed_type_label": "Pondeuse",
            "calcium_level": "4.0-4.2%",
            "protein_level": "17-18%",
            "note": "Phase critique, assurer apport calcium et energie suffisants"
        },
        LayingPhase.PEAK: {
            "feed_type": "layer",
            "feed_type_label": "Pondeuse pic",
            "calcium_level": "4.0-4.5%",
            "protein_level": "17-18%",
            "note": "Maintenir qualite aliment, consommation libre recommandee"
        },
        LayingPhase.POST_PEAK: {
            "feed_type": "layer",
            "feed_type_label": "Pondeuse",
            "calcium_level": "4.2-4.5%",
            "protein_level": "16-17%",
            "note": "Ajuster energie selon poids corporel, maintenir calcium eleve"
        },
        LayingPhase.END_OF_CYCLE: {
            "feed_type": "layer",
            "feed_type_label": "Pondeuse fin cycle",
            "calcium_level": "4.5%+",
            "protein_level": "15-16%",
            "note": "Calcium eleve pour qualite coquille, reduire energie si surpoids"
        }
    }
    return recommendations.get(phase, recommendations[LayingPhase.PEAK])
