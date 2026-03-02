"""
╔══════════════════════════════════════════════════════════════════╗
║           STRYKTIPS FORMANALYS - Webb-gränssnitt                ║
║  Flask-app för att visa Stryktipsanalys i webbläsaren           ║
╚══════════════════════════════════════════════════════════════════╝

Användning:
  python app.py
  Öppna http://localhost:5000 i webbläsaren
"""

from flask import Flask, render_template, jsonify, request
from datetime import datetime
import sys
import os

# Importera funktioner från det befintliga scriptet
from stryktips_form_analys import (
    get_session,
    fetch_stryktips,
    analyze_all_matches,
    StryktipsMatch,
    TeamForm,
    Match,
    fetch_last_5_matches_auto,
    fetch_all_standings,
    fetch_h2h_score,
)

app = Flask(__name__)


def get_demo_data():
    """Returnerar demo-data för testning utan API-anrop."""
    demo_matches = [
        StryktipsMatch(1, "AIK", "Djurgårdens IF", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(2, "Malmö FF", "IFK Göteborg", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(3, "Arsenal", "Chelsea", "Premier League", "2025-02-22"),
        StryktipsMatch(4, "Liverpool", "Man City", "Premier League", "2025-02-22"),
        StryktipsMatch(5, "Real Madrid", "Barcelona", "La Liga", "2025-02-22"),
        StryktipsMatch(6, "Bayern München", "Dortmund", "Bundesliga", "2025-02-22"),
        StryktipsMatch(7, "PSG", "Lyon", "Ligue 1", "2025-02-22"),
        StryktipsMatch(8, "Inter", "AC Milan", "Serie A", "2025-02-22"),
        StryktipsMatch(9, "Juventus", "Roma", "Serie A", "2025-02-22"),
        StryktipsMatch(10, "Hammarby", "IFK Norrköping", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(11, "BK Häcken", "Elfsborg", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(12, "Sirius", "Kalmar FF", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(13, "Mjällby", "Värnamo", "Allsvenskan", "2025-02-22"),
    ]

    # Fyll i exempeldata
    form_data = {
        "AIK": [
            Match("2025-02-15", "AIK", "Hammarby", 2, 1, True, 6),
            Match("2025-02-08", "IFK Norrköping", "AIK", 0, 3, False, 8),
            Match("2025-02-01", "AIK", "Elfsborg", 1, 1, True, 5),
            Match("2025-01-25", "BK Häcken", "AIK", 2, 1, False, 9),
            Match("2025-01-18", "AIK", "Sirius", 3, 0, True, 14),
        ],
        "Djurgårdens IF": [
            Match("2025-02-15", "Djurgårdens IF", "Sirius", 3, 3, True, 12),
            Match("2025-02-08", "Djurgårdens IF", "BK Häcken", 1, 0, True, 7),
            Match("2025-02-01", "Malmö FF", "Djurgårdens IF", 2, 0, False, 2),
            Match("2025-01-25", "Djurgårdens IF", "IFK Göteborg", 2, 2, True, 4),
            Match("2025-01-18", "Elfsborg", "Djurgårdens IF", 1, 1, False, 3),
        ],
        "Malmö FF": [
            Match("2025-02-15", "Malmö FF", "AIK", 1, 0, True, 3),
            Match("2025-02-08", "IFK Göteborg", "Malmö FF", 0, 2, False, 4),
            Match("2025-02-01", "Malmö FF", "Djurgårdens IF", 2, 0, True, 2),
            Match("2025-01-25", "Elfsborg", "Malmö FF", 1, 1, False, 5),
            Match("2025-01-18", "Malmö FF", "BK Häcken", 3, 1, True, 7),
        ],
        "IFK Göteborg": [
            Match("2025-02-15", "IFK Göteborg", "Hammarby", 0, 1, True, 8),
            Match("2025-02-08", "IFK Göteborg", "Malmö FF", 0, 2, True, 1),
            Match("2025-02-01", "Sirius", "IFK Göteborg", 2, 0, False, 13),
            Match("2025-01-25", "Djurgårdens IF", "IFK Göteborg", 2, 2, False, 3),
            Match("2025-01-18", "IFK Göteborg", "BK Häcken", 1, 0, True, 9),
        ],
        "Arsenal": [
            Match("2025-02-15", "Arsenal", "Man City", 3, 1, True, 2),
            Match("2025-02-08", "Liverpool", "Arsenal", 1, 2, False, 1),
            Match("2025-02-01", "Arsenal", "Tottenham", 2, 0, True, 4),
            Match("2025-01-25", "Fulham", "Arsenal", 0, 1, False, 10),
            Match("2025-01-18", "Arsenal", "Brentford", 2, 2, True, 12),
        ],
        "Chelsea": [
            Match("2025-02-15", "Chelsea", "Everton", 2, 0, True, 17),
            Match("2025-02-08", "Chelsea", "West Ham", 1, 1, True, 14),
            Match("2025-02-01", "Man Utd", "Chelsea", 1, 2, False, 13),
            Match("2025-01-25", "Chelsea", "Newcastle", 0, 2, True, 5),
            Match("2025-01-18", "Brighton", "Chelsea", 3, 1, False, 8),
        ],
        "Liverpool": [
            Match("2025-02-15", "Liverpool", "Everton", 2, 0, True, 16),
            Match("2025-02-08", "Liverpool", "Arsenal", 1, 2, True, 3),
            Match("2025-02-01", "Wolves", "Liverpool", 0, 3, False, 15),
            Match("2025-01-25", "Liverpool", "Brighton", 4, 1, True, 8),
            Match("2025-01-18", "Liverpool", "Man Utd", 2, 1, True, 12),
        ],
        "Man City": [
            Match("2025-02-15", "Arsenal", "Man City", 3, 1, False, 2),
            Match("2025-02-08", "Man City", "Newcastle", 2, 1, True, 5),
            Match("2025-02-01", "Man City", "Tottenham", 3, 0, True, 6),
            Match("2025-01-25", "Aston Villa", "Man City", 1, 1, False, 4),
            Match("2025-01-18", "Man City", "Brentford", 5, 0, True, 11),
        ],
        "Real Madrid": [
            Match("2025-02-15", "Real Madrid", "Atletico", 2, 1, True, 3),
            Match("2025-02-08", "Valencia", "Real Madrid", 0, 2, False, 12),
            Match("2025-02-01", "Real Madrid", "Sevilla", 3, 1, True, 8),
            Match("2025-01-25", "Villarreal", "Real Madrid", 1, 1, False, 6),
            Match("2025-01-18", "Real Madrid", "Athletic", 2, 0, True, 5),
        ],
        "Barcelona": [
            Match("2025-02-15", "Barcelona", "Betis", 4, 0, True, 10),
            Match("2025-02-08", "Barcelona", "Girona", 2, 2, True, 4),
            Match("2025-02-01", "Real Sociedad", "Barcelona", 1, 3, False, 7),
            Match("2025-01-25", "Barcelona", "Celta", 3, 1, True, 13),
            Match("2025-01-18", "Mallorca", "Barcelona", 0, 1, False, 9),
        ],
        "Bayern München": [
            Match("2025-02-15", "Bayern München", "Leipzig", 3, 2, True, 4),
            Match("2025-02-08", "Leverkusen", "Bayern München", 1, 1, False, 2),
            Match("2025-02-01", "Bayern München", "Frankfurt", 4, 0, True, 5),
            Match("2025-01-25", "Stuttgart", "Bayern München", 0, 2, False, 3),
            Match("2025-01-18", "Bayern München", "Wolfsburg", 3, 1, True, 8),
        ],
        "Dortmund": [
            Match("2025-02-15", "Dortmund", "Gladbach", 2, 1, True, 11),
            Match("2025-02-08", "Freiburg", "Dortmund", 1, 2, False, 7),
            Match("2025-02-01", "Dortmund", "Mainz", 3, 0, True, 12),
            Match("2025-01-25", "Dortmund", "Leverkusen", 1, 3, True, 2),
            Match("2025-01-18", "Union Berlin", "Dortmund", 0, 0, False, 9),
        ],
        "PSG": [
            Match("2025-02-15", "PSG", "Marseille", 3, 0, True, 3),
            Match("2025-02-08", "Monaco", "PSG", 1, 2, False, 2),
            Match("2025-02-01", "PSG", "Nice", 2, 1, True, 5),
            Match("2025-01-25", "Lens", "PSG", 0, 1, False, 4),
            Match("2025-01-18", "PSG", "Lille", 4, 0, True, 6),
        ],
        "Lyon": [
            Match("2025-02-15", "Lyon", "Nantes", 2, 2, True, 14),
            Match("2025-02-08", "Lyon", "Rennes", 1, 0, True, 8),
            Match("2025-02-01", "Toulouse", "Lyon", 2, 1, False, 11),
            Match("2025-01-25", "Lyon", "Nice", 0, 0, True, 5),
            Match("2025-01-18", "Strasbourg", "Lyon", 1, 2, False, 10),
        ],
        "Inter": [
            Match("2025-02-15", "Inter", "Napoli", 2, 0, True, 2),
            Match("2025-02-08", "Atalanta", "Inter", 1, 1, False, 3),
            Match("2025-02-01", "Inter", "Lazio", 3, 1, True, 5),
            Match("2025-01-25", "Bologna", "Inter", 0, 2, False, 6),
            Match("2025-01-18", "Inter", "Fiorentina", 4, 0, True, 7),
        ],
        "AC Milan": [
            Match("2025-02-15", "AC Milan", "Torino", 2, 1, True, 10),
            Match("2025-02-08", "AC Milan", "Roma", 1, 1, True, 8),
            Match("2025-02-01", "Udinese", "AC Milan", 0, 1, False, 12),
            Match("2025-01-25", "AC Milan", "Atalanta", 0, 2, True, 3),
            Match("2025-01-18", "Sassuolo", "AC Milan", 1, 3, False, 15),
        ],
        "Juventus": [
            Match("2025-02-15", "Juventus", "Fiorentina", 1, 0, True, 7),
            Match("2025-02-08", "Napoli", "Juventus", 2, 2, False, 2),
            Match("2025-02-01", "Juventus", "Bologna", 2, 1, True, 6),
            Match("2025-01-25", "Lazio", "Juventus", 0, 1, False, 5),
            Match("2025-01-18", "Juventus", "Monza", 3, 0, True, 16),
        ],
        "Roma": [
            Match("2025-02-15", "Roma", "Genoa", 2, 0, True, 13),
            Match("2025-02-08", "AC Milan", "Roma", 1, 1, False, 4),
            Match("2025-02-01", "Roma", "Cagliari", 3, 2, True, 17),
            Match("2025-01-25", "Verona", "Roma", 1, 2, False, 14),
            Match("2025-01-18", "Roma", "Napoli", 0, 1, True, 2),
        ],
        "Hammarby": [
            Match("2025-02-15", "AIK", "Hammarby", 2, 1, False, 3),
            Match("2025-02-08", "Hammarby", "Värnamo", 3, 0, True, 15),
            Match("2025-02-01", "Mjällby", "Hammarby", 1, 1, False, 14),
            Match("2025-01-25", "Hammarby", "Kalmar FF", 2, 0, True, 12),
            Match("2025-01-18", "Degerfors", "Hammarby", 0, 2, False, 16),
        ],
        "IFK Norrköping": [
            Match("2025-02-15", "IFK Norrköping", "Elfsborg", 1, 2, True, 4),
            Match("2025-02-08", "IFK Norrköping", "AIK", 0, 3, True, 3),
            Match("2025-02-01", "Sirius", "IFK Norrköping", 1, 1, False, 11),
            Match("2025-01-25", "IFK Norrköping", "Mjällby", 2, 1, True, 14),
            Match("2025-01-18", "Värnamo", "IFK Norrköping", 0, 0, False, 15),
        ],
        "BK Häcken": [
            Match("2025-02-15", "BK Häcken", "Malmö FF", 1, 2, True, 1),
            Match("2025-02-08", "Djurgårdens IF", "BK Häcken", 1, 0, False, 2),
            Match("2025-02-01", "BK Häcken", "Hammarby", 2, 2, True, 6),
            Match("2025-01-25", "BK Häcken", "AIK", 2, 1, True, 3),
            Match("2025-01-18", "IFK Göteborg", "BK Häcken", 1, 0, False, 10),
        ],
        "Elfsborg": [
            Match("2025-02-15", "Elfsborg", "Sirius", 3, 1, True, 11),
            Match("2025-02-08", "Elfsborg", "Kalmar FF", 2, 0, True, 13),
            Match("2025-02-01", "AIK", "Elfsborg", 1, 1, False, 3),
            Match("2025-01-25", "Elfsborg", "Malmö FF", 1, 1, True, 1),
            Match("2025-01-18", "Djurgårdens IF", "Elfsborg", 1, 1, False, 2),
        ],
        "Sirius": [
            Match("2025-02-15", "Elfsborg", "Sirius", 3, 1, False, 5),
            Match("2025-02-08", "Sirius", "Värnamo", 2, 1, True, 15),
            Match("2025-02-01", "Sirius", "IFK Norrköping", 1, 1, True, 8),
            Match("2025-01-25", "Kalmar FF", "Sirius", 0, 1, False, 13),
            Match("2025-01-18", "AIK", "Sirius", 3, 0, False, 3),
        ],
        "Kalmar FF": [
            Match("2025-02-15", "Kalmar FF", "Mjällby", 1, 0, True, 14),
            Match("2025-02-08", "Elfsborg", "Kalmar FF", 2, 0, False, 5),
            Match("2025-02-01", "Kalmar FF", "Degerfors", 2, 1, True, 16),
            Match("2025-01-25", "Kalmar FF", "Sirius", 0, 1, True, 11),
            Match("2025-01-18", "Värnamo", "Kalmar FF", 1, 1, False, 15),
        ],
        "Mjällby": [
            Match("2025-02-15", "Kalmar FF", "Mjällby", 1, 0, False, 13),
            Match("2025-02-08", "Mjällby", "Degerfors", 1, 0, True, 16),
            Match("2025-02-01", "Mjällby", "Hammarby", 1, 1, True, 6),
            Match("2025-01-25", "IFK Norrköping", "Mjällby", 2, 1, False, 8),
            Match("2025-01-18", "Mjällby", "Sirius", 0, 0, True, 11),
        ],
        "Värnamo": [
            Match("2025-02-15", "Värnamo", "Degerfors", 2, 1, True, 16),
            Match("2025-02-08", "Sirius", "Värnamo", 2, 1, False, 11),
            Match("2025-02-01", "Värnamo", "BK Häcken", 0, 3, True, 7),
            Match("2025-01-25", "Degerfors", "Värnamo", 1, 1, False, 16),
            Match("2025-01-18", "Värnamo", "IFK Norrköping", 0, 0, True, 8),
        ],
    }

    # Koppla formdata till matcher
    for m in demo_matches:
        home_form = TeamForm(team_name=m.home_team)
        away_form = TeamForm(team_name=m.away_team)
        
        if m.home_team in form_data:
            home_form.matches = form_data[m.home_team]
        if m.away_team in form_data:
            away_form.matches = form_data[m.away_team]
        
        m.home_form = home_form
        m.away_form = away_form

    return demo_matches


def matches_to_dict(matches):
    """Konverterar StryktipsMatch-objekt till dict för template."""
    result = []
    for m in matches:
        home_score = m.home_form.form_score if m.home_form else 0
        away_score = m.away_form.form_score if m.away_form else 0
        home_total = m.home_form.total_weighted_score if m.home_form else 0
        away_total = m.away_form.total_weighted_score if m.away_form else 0
        home_num = m.home_form.num_matches if m.home_form else 0
        away_num = m.away_form.num_matches if m.away_form else 0
        diff = home_total - away_total
        
        result.append({
            "number": m.match_number,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "competition": m.competition,
            "match_date": m.match_date,
            "home_form_score": home_score,
            "away_form_score": away_score,
            "home_total_score": home_total,
            "away_total_score": away_total,
            "home_form_string": m.home_form.form_string if m.home_form else "-",
            "away_form_string": m.away_form.form_string if m.away_form else "-",
            "home_num_matches": home_num,
            "away_num_matches": away_num,
            "full_data": home_num >= 5 and away_num >= 5,
            "diff": diff,
            "recommendation": m.recommendation,
            "recommendation_basic": m.recommendation_basic if hasattr(m, 'recommendation_basic') else m.recommendation,
            "confidence": m.confidence,
            # Nya faktorer för detaljerad visning
            "home_venue_form": m.home_form.home_form_score if m.home_form else 0,
            "away_venue_form": m.away_form.away_form_score if m.away_form else 0,
            "home_goal_rating": m.home_form.goal_rating if m.home_form else 0,
            "away_goal_rating": m.away_form.goal_rating if m.away_form else 0,
            "home_goals_scored_avg": m.home_form.goals_scored_avg if m.home_form else 0,
            "away_goals_scored_avg": m.away_form.goals_scored_avg if m.away_form else 0,
            "home_goals_conceded_avg": m.home_form.goals_conceded_avg if m.home_form else 0,
            "away_goals_conceded_avg": m.away_form.goals_conceded_avg if m.away_form else 0,
            "home_h2h_score": m.home_form.h2h_score if m.home_form else 0,
            "away_h2h_score": m.away_form.h2h_score if m.away_form else 0,
            "home_fatigue": m.home_form.fatigue_factor if m.home_form else 0,
            "away_fatigue": m.away_form.fatigue_factor if m.away_form else 0,
            "home_motivation": m.home_form.motivation_factor if m.home_form else 0,
            "away_motivation": m.away_form.motivation_factor if m.away_form else 0,
            "home_matches": [
                {
                    "date": match.date,
                    "opponent": match.opponent_name,
                    "venue": match.venue,
                    "score": match.score_string,
                    "result": match.result_for_team,
                    "opponent_position": match.opponent_position,
                }
                for match in (m.home_form.matches[:5] if m.home_form else [])
            ],
            "away_matches": [
                {
                    "date": match.date,
                    "opponent": match.opponent_name,
                    "venue": match.venue,
                    "score": match.score_string,
                    "result": match.result_for_team,
                    "opponent_position": match.opponent_position,
                }
                for match in (m.away_form.matches[:5] if m.away_form else [])
            ],
        })
    return result


@app.route("/")
def index():
    """Startsida."""
    return render_template("index.html")


@app.route("/demo")
def demo():
    """Kör analys med demo-data."""
    matches = get_demo_data()
    data = matches_to_dict(matches)
    rad = "".join(m["recommendation"] for m in data)
    return render_template(
        "result.html",
        matches=data,
        rad=rad,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        is_demo=True,
    )


@app.route("/analyze")
def analyze():
    """Hämtar live-data och kör analys."""
    session = get_session()
    
    # Hämta aktuellt Stryktips
    matches = fetch_stryktips(session)
    
    if not matches:
        return render_template(
            "result.html",
            matches=[],
            rad="",
            error="Kunde inte hämta Stryktipset från Svenska Spel.",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            is_demo=False,
        )
    
    # Analysera alla matcher
    analyze_all_matches(matches, session)
    
    data = matches_to_dict(matches)
    rad = "".join(m["recommendation"] for m in data)
    
    return render_template(
        "result.html",
        matches=data,
        rad=rad,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        is_demo=False,
    )


@app.route("/api/matches")
def api_matches():
    """API-endpoint som returnerar demo-data som JSON."""
    matches = get_demo_data()
    data = matches_to_dict(matches)
    return jsonify({
        "matches": data,
        "rad": "".join(m["recommendation"] for m in data),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })


@app.route("/manual")
def manual_input():
    """Visar formulär för manuell inmatning av matcher."""
    return render_template("manual_input.html")


@app.route("/analyze-manual", methods=["POST"])
def analyze_manual():
    """Analyserar manuellt inmatade matcher."""
    matches = []
    
    for i in range(1, 14):
        home = request.form.get(f"home_{i}", "").strip()
        away = request.form.get(f"away_{i}", "").strip()
        league = request.form.get(f"league_{i}", "Okänd")
        
        if home and away:
            matches.append(StryktipsMatch(
                match_number=i,
                home_team=home,
                away_team=away,
                competition=league,
                match_date=datetime.now().strftime("%Y-%m-%d"),
            ))
    
    if not matches:
        return render_template(
            "result.html",
            matches=[],
            rad="",
            error="Inga matcher angavs. Fyll i minst en match.",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            is_demo=False,
        )
    
    # Hämta formdata via Sofascore
    session = get_session()
    
    # Hämta ligatabeller
    fetch_all_standings(session)
    
    all_teams = set()
    for m in matches:
        all_teams.add(m.home_team)
        all_teams.add(m.away_team)
    
    form_cache = {}
    for team in sorted(all_teams):
        if team not in form_cache:
            try:
                form_cache[team] = fetch_last_5_matches_auto(session, team)
            except Exception as e:
                print(f"Fel vid hämtning för {team}: {e}")
                form_cache[team] = TeamForm(team_name=team)
    
    for m in matches:
        m.home_form = form_cache.get(m.home_team, TeamForm(team_name=m.home_team))
        m.away_form = form_cache.get(m.away_team, TeamForm(team_name=m.away_team))
        
        # Sätt hemma/borta-flaggor
        m.home_form.next_match_is_home = True
        m.away_form.next_match_is_home = False
        
        # Hämta H2H
        try:
            h2h_home, h2h_away = fetch_h2h_score(session, m.home_team, m.away_team)
            m.home_form.h2h_score = h2h_home
            m.away_form.h2h_score = h2h_away
        except Exception as e:
            print(f"H2H-fel: {e}")
    
    data = matches_to_dict(matches)
    rad = "".join(m["recommendation"] for m in data)
    
    return render_template(
        "result.html",
        matches=data,
        rad=rad,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        is_demo=False,
    )


@app.route("/paste")
def paste_input():
    """Visar sida för att klistra in matcher."""
    return render_template("paste_input.html")


@app.route("/analyze-paste", methods=["POST"])
def analyze_paste():
    """Analyserar inklistrade matcher."""
    import re
    
    paste_text = request.form.get("paste_text", "")
    
    # Parsa matcherna från texten
    matches = []
    lines = [l.strip() for l in paste_text.split('\n') if l.strip()]
    
    match_num = 1
    for line in lines:
        # Ta bort nummer-prefix
        cleaned = re.sub(r'^[\d]+[\.\)\:\s]+', '', line).strip()
        
        # Sök efter "lag1 - lag2" eller "lag1 vs lag2"
        parts = re.split(r'\s+[-–—]\s+|\s+vs\.?\s+', cleaned, flags=re.IGNORECASE)
        
        if len(parts) >= 2:
            home = parts[0].strip()
            away = parts[1].strip()
            
            if len(home) > 2 and len(away) > 2:
                matches.append(StryktipsMatch(
                    match_number=match_num,
                    home_team=home,
                    away_team=away,
                    competition="",
                    match_date=datetime.now().strftime("%Y-%m-%d"),
                ))
                match_num += 1
    
    if not matches:
        return render_template(
            "result.html",
            matches=[],
            rad="",
            error="Kunde inte tolka några matcher. Kontrollera formatet och försök igen.",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            is_demo=False,
        )
    
    # Hämta formdata
    session = get_session()
    
    # Hämta ligatabeller för motståndarstyrka-viktning
    fetch_all_standings(session)
    
    all_teams = set()
    for m in matches:
        all_teams.add(m.home_team)
        all_teams.add(m.away_team)
    
    form_cache = {}
    for team in sorted(all_teams):
        if team not in form_cache:
            try:
                form_cache[team] = fetch_last_5_matches_auto(session, team)
            except Exception as e:
                print(f"Fel vid hämtning för {team}: {e}")
                form_cache[team] = TeamForm(team_name=team)
    
    for m in matches:
        m.home_form = form_cache.get(m.home_team, TeamForm(team_name=m.home_team))
        m.away_form = form_cache.get(m.away_team, TeamForm(team_name=m.away_team))
        
        # Sätt hemma/borta-flaggor för korrekt venue-form
        m.home_form.next_match_is_home = True
        m.away_form.next_match_is_home = False
        
        # Hämta Head-to-Head score
        try:
            h2h_home, h2h_away = fetch_h2h_score(session, m.home_team, m.away_team)
            m.home_form.h2h_score = h2h_home
            m.away_form.h2h_score = h2h_away
        except Exception as e:
            print(f"H2H-fel för {m.home_team} vs {m.away_team}: {e}")
    
    data = matches_to_dict(matches)
    rad = "".join(m["recommendation"] for m in data)
    
    return render_template(
        "result.html",
        matches=data,
        rad=rad,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        is_demo=False,
    )


if __name__ == "__main__":
    print("\n" + "═"*60)
    print("  STRYKTIPS FORMANALYS - WEBBGRÄNSSNITT")
    print("  Öppna http://localhost:5001 i din webbläsare")
    print("═"*60 + "\n")
    app.run(debug=True, port=5001)
