"""
╔══════════════════════════════════════════════════════════════════╗
║           STRYKTIPS FORMANALYS - Automatisk system              ║
║  Hämtar aktuellt Stryktips + senaste 5 matcher per lag          ║
║  Beräknar formpoäng och ger 1/X/2-rekommendation                ║
╚══════════════════════════════════════════════════════════════════╝

Beroenden: pip install requests beautifulsoup4 cloudscraper tabulate

Användning: python stryktips_form_analys.py
"""

import requests
import json
import time
import sys
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional, Tuple

# Försök importera config
try:
    from config import FOOTBALL_DATA_API_KEY, USE_FOOTBALL_DATA, API_FOOTBALL_KEY, USE_API_FOOTBALL
except ImportError:
    FOOTBALL_DATA_API_KEY = ""
    USE_FOOTBALL_DATA = False
    API_FOOTBALL_KEY = ""
    USE_API_FOOTBALL = False

# ─── Försök importera valfria paket ────────────────────────────────────────────
try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False


# ══════════════════════════════════════════════════════════════════════════════
# KONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

# Formpoäng-vikter per match (senaste match = index 0 = högst vikt)
MATCH_WEIGHTS = [1.5, 1.3, 1.1, 0.9, 0.7]

# Poäng per resultat (innan viktning)
POINTS_WIN  = 3.0
POINTS_DRAW = 1.0
POINTS_LOSS = 0.0

# Hemma/borta-justeringar
HOME_WIN_ADJUSTMENT   =  0.0   # Hemmvinst = förväntat, ingen bonus
AWAY_WIN_ADJUSTMENT   =  0.5   # Bortavinst = bonus
HOME_LOSS_ADJUSTMENT  = -0.5   # Hemmaförlust = avdrag
AWAY_LOSS_ADJUSTMENT  =  0.0   # Bortaförlust = förväntat, inget avdrag

# Motståndarstyrka: baserat på motståndarens ligaposition
# Position 1-4 = toppklubb, 5-10 = mittenklubb, 11+ = bottenlag
def opponent_strength_multiplier(opponent_position: Optional[int]) -> float:
    if opponent_position is None:
        return 1.0  # Okänd position = neutral
    if opponent_position <= 4:
        return 1.4  # Toppmotstånd ger 40% bonus
    elif opponent_position <= 10:
        return 1.1  # Mellanklass ger 10% bonus
    else:
        return 0.8  # Bottenlag ger 20% avdrag


# Egen styrka: bonus/avdrag baserat på lagets egen tabellposition
# Topplag förväntas prestera, bottenlag har det svårare
def team_strength_bonus(team_position: Optional[int]) -> float:
    if team_position is None:
        return 0.0  # Okänd position = ingen justering
    if team_position <= 4:
        return 1.5  # Topplag får +1.5 bonus
    elif team_position <= 10:
        return 0.5  # Mittenklubb får +0.5 bonus
    else:
        return -0.5  # Bottenlag får -0.5 avdrag

# Rekommendationsgränser (skillnad i formpoäng)
RECOMMEND_HOME_THRESHOLD = 3.0   # Hemmalag vinner med >3p skillnad → "1"
RECOMMEND_AWAY_THRESHOLD = 3.0   # Bortalag leder med >3p skillnad → "2"
# Annars → "X" (öppet)

# Delay mellan requests (sekunder) – var snäll mot servrar!
# Football-Data.org gratis: max 10 anrop/minut = 6 sek mellan anrop
REQUEST_DELAY = 6.5

# ═══════════════════════════════════════════════════════════════════════════════
# NYA FAKTORER - Vikter och tröskelvärden
# ═══════════════════════════════════════════════════════════════════════════════

# Hemma/bortaform-viktning
HOME_AWAY_FORM_WEIGHT = 0.3  # Hur mycket hemma/bortaform väger i totalen

# Målstatistik-vikter
OFFENSIVE_RATING_WEIGHT = 1.0   # Offensiv styrka
DEFENSIVE_RATING_WEIGHT = 1.0   # Defensiv styrka (hållen nolla = bra)
GOALS_SCORED_BENCHMARK = 1.5    # "Bra" är >1.5 mål/match
GOALS_CONCEDED_BENCHMARK = 1.2  # "Bra" är <1.2 insläppta/match

# Head-to-head-vikter
H2H_WEIGHT = 1.5  # Hur mycket H2H påverkar totalen
H2H_MATCHES_TO_FETCH = 5  # Antal H2H-matcher att analysera

# Trötthet/matchschema
FATIGUE_SHORT_REST_DAYS = 4  # Färre dagar = trötthetsfaktor aktiveras
FATIGUE_PENALTY = -0.5  # Avdrag vid kort vila (<4 dagar)
FATIGUE_CONGESTION_PENALTY = -1.0  # Avdrag vid >3 matcher på 14 dagar

# Motivationsfaktor (tabellställning)
MOTIVATION_TITLE_RACE_BONUS = 1.5   # Kämpar om titeln (≤3 poäng till topp)
MOTIVATION_RELEGATION_BONUS = 1.0   # Kämpar mot nedflyttning (≤3 poäng till säkert)
MOTIVATION_MIDTABLE_PENALTY = -0.5  # Mitt i tabellen utan målsättning


# ══════════════════════════════════════════════════════════════════════════════
# DATAKLASSER
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class Match:
    """Representerar ett matchresultat i ett lags historik."""
    date: str
    home_team: str
    away_team: str
    home_goals: int
    away_goals: int
    was_home: bool          # Spelade det analyserade laget hemma?
    opponent_position: Optional[int] = None  # Motståndarens tabellposition

    @property
    def result_for_team(self) -> str:
        """V, O eller F ur det analyserade lagets perspektiv."""
        if self.was_home:
            if self.home_goals > self.away_goals: return "V"
            if self.home_goals == self.away_goals: return "O"
            return "F"
        else:
            if self.away_goals > self.home_goals: return "V"
            if self.away_goals == self.home_goals: return "O"
            return "F"

    @property
    def score_string(self) -> str:
        return f"{self.home_goals}-{self.away_goals}"

    @property
    def opponent_name(self) -> str:
        return self.away_team if self.was_home else self.home_team

    @property
    def venue(self) -> str:
        return "H" if self.was_home else "B"

    @property
    def goals_scored(self) -> int:
        """Antal mål gjorda av det analyserade laget."""
        return self.home_goals if self.was_home else self.away_goals

    @property
    def goals_conceded(self) -> int:
        """Antal mål insläppta av det analyserade laget."""
        return self.away_goals if self.was_home else self.home_goals


@dataclass
class TeamForm:
    """Formanalys för ett lag."""
    team_name: str
    matches: list[Match] = field(default_factory=list)
    team_position: Optional[int] = None  # Lagets egen tabellposition
    team_points: Optional[int] = None  # Lagets poäng i tabellen
    league_leader_points: Optional[int] = None  # Toppens poäng
    relegation_line_points: Optional[int] = None  # Säker-gräns poäng
    h2h_score: float = 0.0  # Head-to-head score mot motståndaren
    next_match_is_home: bool = True  # För att beräkna rätt hemma/bortaform

    @property
    def form_score(self) -> float:
        """Beräknar viktad formpoäng för de senaste matcherna."""
        total = 0.0
        for i, match in enumerate(self.matches[:5]):
            weight = MATCH_WEIGHTS[i] if i < len(MATCH_WEIGHTS) else 0.7

            # Baspoäng
            result = match.result_for_team
            if result == "V":
                base = POINTS_WIN
            elif result == "O":
                base = POINTS_DRAW
            else:
                base = POINTS_LOSS

            # Hemma/borta-justering
            if match.was_home and result == "F":
                base += HOME_LOSS_ADJUSTMENT
            elif not match.was_home and result == "V":
                base += AWAY_WIN_ADJUSTMENT
            elif match.was_home and result == "V":
                base += HOME_WIN_ADJUSTMENT
            elif not match.was_home and result == "F":
                base += AWAY_LOSS_ADJUSTMENT

            # Motståndarstyrka
            strength = opponent_strength_multiplier(match.opponent_position)

            total += base * weight * strength

        # Lägg till bonus/avdrag baserat på lagets egen styrka
        total += team_strength_bonus(self.team_position)

        return round(total, 2)

    @property
    def home_form_score(self) -> float:
        """Beräknar formpoäng endast för hemmamatcher."""
        home_matches = [m for m in self.matches if m.was_home][:5]
        if not home_matches:
            return 0.0
        
        total = 0.0
        for i, match in enumerate(home_matches):
            weight = MATCH_WEIGHTS[i] if i < len(MATCH_WEIGHTS) else 0.7
            result = match.result_for_team
            if result == "V":
                base = POINTS_WIN
            elif result == "O":
                base = POINTS_DRAW
            else:
                base = POINTS_LOSS + HOME_LOSS_ADJUSTMENT
            
            strength = opponent_strength_multiplier(match.opponent_position)
            total += base * weight * strength
        
        return round(total, 2)

    @property
    def away_form_score(self) -> float:
        """Beräknar formpoäng endast för bortamatcher."""
        away_matches = [m for m in self.matches if not m.was_home][:5]
        if not away_matches:
            return 0.0
        
        total = 0.0
        for i, match in enumerate(away_matches):
            weight = MATCH_WEIGHTS[i] if i < len(MATCH_WEIGHTS) else 0.7
            result = match.result_for_team
            if result == "V":
                base = POINTS_WIN + AWAY_WIN_ADJUSTMENT
            elif result == "O":
                base = POINTS_DRAW
            else:
                base = POINTS_LOSS
            
            strength = opponent_strength_multiplier(match.opponent_position)
            total += base * weight * strength
        
        return round(total, 2)

    @property
    def relevant_venue_form(self) -> float:
        """Returnerar hemma- eller bortaform beroende på nästa match."""
        if self.next_match_is_home:
            return self.home_form_score
        return self.away_form_score

    @property
    def goals_scored_avg(self) -> float:
        """Genomsnittligt antal gjorda mål per match."""
        if not self.matches:
            return 0.0
        total = sum(m.goals_scored for m in self.matches[:5])
        return round(total / len(self.matches[:5]), 2)

    @property
    def goals_conceded_avg(self) -> float:
        """Genomsnittligt antal insläppta mål per match."""
        if not self.matches:
            return 0.0
        total = sum(m.goals_conceded for m in self.matches[:5])
        return round(total / len(self.matches[:5]), 2)

    @property
    def offensive_rating(self) -> float:
        """Offensiv styrka: +poäng om över benchmark, -poäng om under."""
        diff = self.goals_scored_avg - GOALS_SCORED_BENCHMARK
        return round(diff * OFFENSIVE_RATING_WEIGHT, 2)

    @property
    def defensive_rating(self) -> float:
        """Defensiv styrka: +poäng om under benchmark (bra), -poäng om över (dåligt)."""
        diff = GOALS_CONCEDED_BENCHMARK - self.goals_conceded_avg
        return round(diff * DEFENSIVE_RATING_WEIGHT, 2)

    @property
    def goal_rating(self) -> float:
        """Kombinerad målrating (offensiv + defensiv)."""
        return round(self.offensive_rating + self.defensive_rating, 2)

    @property
    def days_since_last_match(self) -> Optional[int]:
        """Antal dagar sedan senaste matchen."""
        if not self.matches:
            return None
        try:
            last_date = datetime.strptime(self.matches[0].date, "%Y-%m-%d")
            today = datetime.now()
            return (today - last_date).days
        except (ValueError, TypeError):
            return None

    @property
    def matches_last_14_days(self) -> int:
        """Antal matcher spelade de senaste 14 dagarna."""
        if not self.matches:
            return 0
        
        today = datetime.now()
        cutoff = today - timedelta(days=14)
        count = 0
        
        for match in self.matches:
            try:
                match_date = datetime.strptime(match.date, "%Y-%m-%d")
                if match_date >= cutoff:
                    count += 1
            except (ValueError, TypeError):
                continue
        
        return count

    @property
    def fatigue_factor(self) -> float:
        """Trötthetsfaktor: avdrag vid kort vila eller många matcher."""
        penalty = 0.0
        
        # Kort vila sedan senaste match
        days = self.days_since_last_match
        if days is not None and days < FATIGUE_SHORT_REST_DAYS:
            penalty += FATIGUE_PENALTY
        
        # Matchträngsel (>3 matcher på 14 dagar)
        if self.matches_last_14_days > 3:
            penalty += FATIGUE_CONGESTION_PENALTY
        
        return round(penalty, 2)

    @property
    def motivation_factor(self) -> float:
        """Motivationsfaktor baserat på tabellsituation."""
        if self.team_points is None:
            return 0.0
        
        # Kämpar om titeln?
        if self.league_leader_points is not None:
            points_from_top = self.league_leader_points - self.team_points
            if points_from_top <= 3:
                return MOTIVATION_TITLE_RACE_BONUS
        
        # Kämpar mot nedflyttning?
        if self.relegation_line_points is not None:
            points_to_safety = self.team_points - self.relegation_line_points
            if points_to_safety <= 3:
                return MOTIVATION_RELEGATION_BONUS
        
        # Mitt i tabellen utan tydlig målsättning?
        if self.team_position is not None:
            total_teams = 20  # Antag 20 lag
            if 7 <= self.team_position <= 14:
                return MOTIVATION_MIDTABLE_PENALTY
        
        return 0.0

    @property
    def total_weighted_score(self) -> float:
        """
        Total viktad poäng som kombinerar alla faktorer:
        - Grundläggande formpoäng (form_score)
        - Hemma/bortaform-bonus
        - Målstatistik
        - Head-to-head
        - Trötthet
        - Motivation
        """
        total = self.form_score
        
        # Lägg till hemma/bortaform-bonus
        venue_bonus = (self.relevant_venue_form - self.form_score) * HOME_AWAY_FORM_WEIGHT
        total += venue_bonus
        
        # Lägg till målstatistik
        total += self.goal_rating
        
        # Lägg till H2H-score (sätts externt)
        total += self.h2h_score
        
        # Lägg till trötthetsfaktor
        total += self.fatigue_factor
        
        # Lägg till motivationsfaktor
        total += self.motivation_factor
        
        return round(total, 2)

    @property
    def form_string(self) -> str:
        """Ex: V V O F V"""
        return " ".join(m.result_for_team for m in self.matches[:5])

    @property
    def num_matches(self) -> int:
        return len(self.matches)


@dataclass
class StryktipsMatch:
    """En match i Stryktipset."""
    match_number: int        # 1-13
    home_team: str
    away_team: str
    competition: str
    match_date: str
    home_form: Optional[TeamForm] = None
    away_form: Optional[TeamForm] = None

    @property
    def recommendation(self) -> str:
        """1, X eller 2 baserat på total viktad poängskillnad."""
        if not self.home_form or not self.away_form:
            return "?"
        diff = self.home_form.total_weighted_score - self.away_form.total_weighted_score
        if diff >= RECOMMEND_HOME_THRESHOLD:
            return "1"
        elif diff <= -RECOMMEND_AWAY_THRESHOLD:
            return "2"
        else:
            return "X"

    @property
    def recommendation_basic(self) -> str:
        """1, X eller 2 baserat på enbart grundläggande formpoäng."""
        if not self.home_form or not self.away_form:
            return "?"
        diff = self.home_form.form_score - self.away_form.form_score
        if diff >= RECOMMEND_HOME_THRESHOLD:
            return "1"
        elif diff <= -RECOMMEND_AWAY_THRESHOLD:
            return "2"
        else:
            return "X"

    @property
    def confidence(self) -> str:
        """Indikerar hur stark rekommendationen är."""
        if not self.home_form or not self.away_form:
            return "-"
        diff = abs(self.home_form.total_weighted_score - self.away_form.total_weighted_score)
        if diff >= 6:   return "★★★"
        elif diff >= 4: return "★★☆"
        else:           return "★☆☆"

    @property
    def score_breakdown(self) -> dict:
        """Detaljerad uppdelning av poängberäkningen för båda lagen."""
        if not self.home_form or not self.away_form:
            return {}
        
        return {
            "home": {
                "base_form": self.home_form.form_score,
                "home_away_form": self.home_form.home_form_score,
                "goal_rating": self.home_form.goal_rating,
                "h2h_score": self.home_form.h2h_score,
                "fatigue": self.home_form.fatigue_factor,
                "motivation": self.home_form.motivation_factor,
                "total": self.home_form.total_weighted_score,
            },
            "away": {
                "base_form": self.away_form.form_score,
                "home_away_form": self.away_form.away_form_score,
                "goal_rating": self.away_form.goal_rating,
                "h2h_score": self.away_form.h2h_score,
                "fatigue": self.away_form.fatigue_factor,
                "motivation": self.away_form.motivation_factor,
                "total": self.away_form.total_weighted_score,
            }
        }


# ══════════════════════════════════════════════════════════════════════════════
# DATAHÄMTNING – SVENSKA SPEL (Stryktips)
# ══════════════════════════════════════════════════════════════════════════════

def get_session() -> requests.Session:
    """Skapar en requests-session med lämpliga headers."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        "Referer": "https://www.svenskaspel.se/",
    })
    return session


def fetch_stryktips(session: requests.Session) -> list[StryktipsMatch]:
    """
    Hämtar aktuell Stryktipsomgång från Svenska Spels API.
    Returnerar lista med StryktipsMatch-objekt.
    """
    print("📡 Hämtar aktuellt Stryktips från Svenska Spel...")

    # Svenska Spels publika API för Stryktips
    url = "https://www.svenskaspel.se/api/draw/1/stryktips/draws"

    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        print(f"  ⚠️  Kunde inte hämta Stryktips: {e}")
        print("  → Försöker alternativ URL...")
        return fetch_stryktips_alternative(session)

    matches = []
    try:
        draw = data["draws"][0]  # Senaste/nästa omgång
        events = draw["drawEvents"]

        for i, event in enumerate(events, 1):
            participants = event.get("eventComment", "").split(" - ")
            if len(participants) >= 2:
                home = participants[0].strip()
                away = participants[1].strip()
            else:
                home = event.get("homeTeam", f"Hemmalag {i}")
                away = event.get("awayTeam", f"Bortalag {i}")

            match = StryktipsMatch(
                match_number=i,
                home_team=home,
                away_team=away,
                competition=event.get("eventTypeId", "Okänd liga"),
                match_date=event.get("eventDate", ""),
            )
            matches.append(match)

        print(f"  ✅ Hämtade {len(matches)} matcher från Stryktipsomgång")

    except (KeyError, IndexError) as e:
        print(f"  ⚠️  Kunde inte tolka data: {e}")
        return fetch_stryktips_alternative(session)

    return matches


def fetch_stryktips_alternative(session: requests.Session) -> list[StryktipsMatch]:
    """
    Alternativ: Hämta från Stryktips-JSON via en annan endpoint.
    Om allt misslyckas – visa instruktioner för manuell inmatning.
    """
    alt_url = "https://www.svenskaspel.se/api/draw/1/stryktips/pools"
    try:
        resp = session.get(alt_url, timeout=15)
        data = resp.json()
        # Försök tolka alternativ struktur
        print("  ✅ Alternativ endpoint fungerade")
        # Parsing-logik beror på faktisk struktur – utöka vid behov
    except Exception:
        pass

    print("\n" + "═"*60)
    print("  MANUELL INMATNING KRÄVS")
    print("  Gå till: https://www.svenskaspel.se/stryktips")
    print("  och mata in matcherna nedan:")
    print("═"*60 + "\n")
    return manual_input_matches()


def manual_input_matches() -> list[StryktipsMatch]:
    """
    Fallback: Låt användaren mata in matcherna manuellt.
    Används om automatisk hämtning misslyckas.
    """
    print("Ange antal matcher (vanligtvis 13):")
    try:
        n = int(input("Antal matcher: ").strip() or "13")
    except ValueError:
        n = 13

    matches = []
    for i in range(1, n + 1):
        print(f"\nMatch {i}:")
        home = input(f"  Hemmalag: ").strip()
        away = input(f"  Bortalag: ").strip()
        league = input(f"  Liga (Enter för att hoppa): ").strip() or "Okänd"
        matches.append(StryktipsMatch(
            match_number=i,
            home_team=home,
            away_team=away,
            competition=league,
            match_date="",
        ))
    return matches


# ══════════════════════════════════════════════════════════════════════════════
# DATAHÄMTNING – Football-Data.org (Gratis med API-nyckel, 5 matcher/lag)
# ══════════════════════════════════════════════════════════════════════════════

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"

# Team-ID mappning för Football-Data.org (de stora ligorna)
FOOTBALL_DATA_TEAMS = {
    # Premier League
    "arsenal": 57, "aston villa": 58, "bournemouth": 1044, "brentford": 402,
    "brighton": 397, "brighton and hove albion": 397, "chelsea": 61, "crystal palace": 354,
    "everton": 62, "fulham": 63, "ipswich": 349, "ipswich town": 349,
    "leicester": 338, "leicester city": 338, "liverpool": 64, "man city": 65,
    "manchester city": 65, "man utd": 66, "manchester united": 66, "man united": 66,
    "newcastle": 67, "newcastle united": 67, "nottingham forest": 351, "forest": 351,
    "southampton": 340, "tottenham": 73, "spurs": 73, "tottenham hotspur": 73,
    "west ham": 563, "west ham united": 563, "wolves": 76, "wolverhampton": 76,
    "wolverhampton wanderers": 76,
    # Championship
    "birmingham": 332, "birmingham city": 332, "blackburn": 59, "blackburn rovers": 59,
    "bristol city": 387, "burnley": 328, "cardiff": 715, "cardiff city": 715,
    "coventry": 1076, "coventry city": 1076, "derby": 342, "derby county": 342,
    "hull": 322, "hull city": 322, "leeds": 341, "leeds united": 341,
    "luton": 389, "luton town": 389, "middlesbrough": 343, "millwall": 384,
    "norwich": 68, "norwich city": 68, "oxford": 1082, "oxford united": 1082,
    "plymouth": 1138, "plymouth argyle": 1138, "portsmouth": 1516, "preston": 1081,
    "preston north end": 1081, "qpr": 69, "queens park rangers": 69,
    "sheffield utd": 356, "sheffield united": 356, "sheffield wed": 345,
    "sheffield wednesday": 345, "stoke": 70, "stoke city": 70, "sunderland": 71,
    "swansea": 72, "swansea city": 72, "watford": 346, "west brom": 74,
    "west bromwich albion": 74,
}

# Fallback: API-nyckel från miljövariabel om inte i config
def get_football_data_api_key():
    return FOOTBALL_DATA_API_KEY or os.environ.get("FOOTBALL_DATA_API_KEY", "")


def fetch_matches_football_data(session: requests.Session, team_name: str) -> TeamForm:
    """
    Hämtar lagets senaste 5 matcher via Football-Data.org.
    Kräver API-nyckel (gratis: 10 anrop/min).
    """
    print(f"  📊 Hämtar form för: {team_name} (Football-Data.org)")
    
    team_form = TeamForm(team_name=team_name)
    api_key = get_football_data_api_key()
    
    if not api_key:
        print(f"  ⚠️  Ingen API-nyckel! Lägg till i config.py")
        return team_form
    
    # Hitta team-ID
    team_lower = team_name.lower().strip()
    team_id = FOOTBALL_DATA_TEAMS.get(team_lower)
    
    # Försök hitta med delsträngar
    if not team_id:
        for key, tid in FOOTBALL_DATA_TEAMS.items():
            if team_lower in key or key in team_lower:
                team_id = tid
                break
    
    if not team_id:
        print(f"  ⚠️  Kunde inte hitta {team_name} i Football-Data.org")
        return team_form
    
    print(f"  🔍 Hittade team ID: {team_id}")
    
    # Hämta senaste 5 avslutade matcher
    url = f"{FOOTBALL_DATA_BASE}/teams/{team_id}/matches"
    headers = {"X-Auth-Token": api_key}
    params = {"status": "FINISHED", "limit": 5}
    
    time.sleep(REQUEST_DELAY)  # Rate limiting
    
    try:
        resp = session.get(url, headers=headers, params=params, timeout=15)
        
        if resp.status_code == 403:
            print(f"  ⚠️  API returnerade 403 - kontrollera din nyckel i config.py")
            return team_form
        elif resp.status_code == 429:
            print(f"  ⚠️  Rate limit nådd - vänta en minut")
            return team_form
        
        resp.raise_for_status()
        data = resp.json()
        
        matches = data.get("matches", [])
        
        for m in matches[:5]:
            home_team = m["homeTeam"]["name"]
            away_team = m["awayTeam"]["name"]
            home_score = m["score"]["fullTime"]["home"] or 0
            away_score = m["score"]["fullTime"]["away"] or 0
            
            # Avgör om vi spelade hemma
            was_home = (m["homeTeam"]["id"] == team_id)
            date_str = m.get("utcDate", "")[:10]
            
            match = Match(
                date=date_str,
                home_team=home_team,
                away_team=away_team,
                home_goals=home_score,
                away_goals=away_score,
                was_home=was_home,
            )
            # Slå upp motståndarens tabellposition
            opponent = away_team if was_home else home_team
            match.opponent_position = get_team_position(opponent)
            team_form.matches.append(match)
        
        # Sätt lagets egen tabellposition och motivation-data
        team_data = get_team_data(team_name)
        if team_data:
            team_form.team_position = team_data.get("position")
            team_form.team_points = team_data.get("points")
            league = team_data.get("league")
            if league:
                league_meta = get_league_metadata(league)
                if league_meta:
                    team_form.league_leader_points = league_meta.get("leader_points")
                    team_form.relegation_line_points = league_meta.get("relegation_line_points")
        
        print(f"     ✅ {len(team_form.matches)} matcher hämtade | Form: {team_form.form_string} | Formpoäng: {team_form.form_score}")
        
    except Exception as e:
        print(f"  ⚠️  Fel vid Football-Data.org: {e}")
    
    return team_form


# ══════════════════════════════════════════════════════════════════════════════
# LIGATABELLER – Hämta positioner för motståndarstyrka-viktning
# ══════════════════════════════════════════════════════════════════════════════

# Cache för ligatabeller (team_name -> {"position": int, "points": int})
_standings_cache: dict[str, dict] = {}
_standings_loaded = False

# Lagrar liga-metadata (leader_points, relegation_line_points per liga)
_league_metadata: dict[str, dict] = {}

# Football-Data.org competition codes
FOOTBALL_DATA_COMPETITIONS = {
    "PL": "Premier League",
    "ELC": "Championship",
}

# TheSportsDB league IDs för standings
SPORTSDB_STANDINGS_LEAGUES = {
    4396: "League One",
    4397: "League Two",
    4590: "National League",
    4350: "Allsvenskan",
}


def normalize_team_name(name: str) -> str:
    """Normaliserar lagnamn för bättre matchning."""
    # Ta bort vanliga suffix
    name = name.lower().strip()
    for suffix in [" fc", " afc", " city", " town", " united", " wanderers", " rovers"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)].strip()
    return name


def fetch_all_standings(session: requests.Session) -> None:
    """
    Hämtar alla ligatabeller och bygger en cache med team_name -> {position, points}.
    Anropas en gång i början av analysen.
    """
    global _standings_cache, _standings_loaded, _league_metadata
    
    if _standings_loaded:
        return
    
    print("📊 Hämtar ligatabeller för motståndarstyrka...")
    
    api_key = get_football_data_api_key()
    
    # 1. Football-Data.org (Premier League + Championship)
    if api_key:
        for comp_code, comp_name in FOOTBALL_DATA_COMPETITIONS.items():
            time.sleep(REQUEST_DELAY)
            try:
                url = f"{FOOTBALL_DATA_BASE}/competitions/{comp_code}/standings"
                headers = {"X-Auth-Token": api_key}
                resp = session.get(url, headers=headers, timeout=15)
                
                if resp.status_code == 200:
                    data = resp.json()
                    standings = data.get("standings", [{}])
                    if standings:
                        table = standings[0].get("table", [])
                        
                        # Beräkna liga-metadata
                        if table:
                            leader_points = table[0].get("points", 0) if table else 0
                            # Nedflyttningsgräns: position 18+ är i fara
                            relegation_line = next((e.get("points", 0) for e in table if e.get("position", 0) == 17), 0)
                            _league_metadata[comp_code] = {
                                "leader_points": leader_points,
                                "relegation_line_points": relegation_line,
                            }
                        
                        for entry in table:
                            team_name = entry.get("team", {}).get("name", "")
                            position = entry.get("position", 0)
                            points = entry.get("points", 0)
                            if team_name and position:
                                # Spara med flera varianter av namnet
                                team_data = {
                                    "position": position,
                                    "points": points,
                                    "league": comp_code,
                                }
                                _standings_cache[team_name.lower()] = team_data
                                _standings_cache[normalize_team_name(team_name)] = team_data
                        print(f"   ✅ {comp_name}: {len(table)} lag")
                else:
                    print(f"   ⚠️  {comp_name}: HTTP {resp.status_code}")
            except Exception as e:
                print(f"   ⚠️  {comp_name}: {e}")
    
    # 2. TheSportsDB (League One, League Two, etc.)
    for league_id, league_name in SPORTSDB_STANDINGS_LEAGUES.items():
        time.sleep(1)  # Snällare mot TheSportsDB
        try:
            url = f"https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l={league_id}&s=2025-2026"
            resp = session.get(url, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                table = data.get("table") or []
                
                # Beräkna liga-metadata
                if table:
                    leader_points = int(table[0].get("intPoints", 0)) if table else 0
                    relegation_line = 0
                    for e in table:
                        if int(e.get("intRank", 0)) == 21:  # Position 21+ är nedflyttning i EFL
                            relegation_line = int(e.get("intPoints", 0))
                            break
                    _league_metadata[str(league_id)] = {
                        "leader_points": leader_points,
                        "relegation_line_points": relegation_line,
                    }
                
                for entry in table:
                    team_name = entry.get("strTeam", "")
                    position = entry.get("intRank")
                    points = entry.get("intPoints", 0)
                    if team_name and position:
                        try:
                            pos_int = int(position)
                            pts_int = int(points) if points else 0
                            team_data = {
                                "position": pos_int,
                                "points": pts_int,
                                "league": str(league_id),
                            }
                            _standings_cache[team_name.lower()] = team_data
                            _standings_cache[normalize_team_name(team_name)] = team_data
                        except (ValueError, TypeError):
                            pass
                if table:
                    print(f"   ✅ {league_name}: {len(table)} lag")
        except Exception as e:
            print(f"   ⚠️  {league_name}: {e}")
    
    _standings_loaded = True
    print(f"   📈 Totalt {len(_standings_cache)} lag med tabellposition")


def get_team_position(team_name: str) -> Optional[int]:
    """Slår upp ett lags tabellposition från cache."""
    if not _standings_loaded:
        return None
    
    # Prova olika varianter
    variants = [
        team_name.lower(),
        normalize_team_name(team_name),
        team_name.lower().replace("fc", "").strip(),
    ]
    
    for variant in variants:
        if variant in _standings_cache:
            data = _standings_cache[variant]
            if isinstance(data, dict):
                return data.get("position")
            return data  # Bakåtkompatibilitet
    
    return None


def get_team_data(team_name: str) -> Optional[dict]:
    """Slår upp ett lags fullständiga tabelldata (position, points, league)."""
    if not _standings_loaded:
        return None
    
    variants = [
        team_name.lower(),
        normalize_team_name(team_name),
        team_name.lower().replace("fc", "").strip(),
    ]
    
    for variant in variants:
        if variant in _standings_cache:
            data = _standings_cache[variant]
            if isinstance(data, dict):
                return data
    
    return None


def get_league_metadata(league_code: str) -> Optional[dict]:
    """Returnerar liga-metadata (leader_points, relegation_line_points)."""
    return _league_metadata.get(league_code)


# ══════════════════════════════════════════════════════════════════════════════
# DATAHÄMTNING – API-Football (Gratis 100 anrop/dag, täcker alla ligor)
# ══════════════════════════════════════════════════════════════════════════════

API_FOOTBALL_BASE = "https://v3.football.api-sports.io"

def get_api_football_key():
    return API_FOOTBALL_KEY or os.environ.get("API_FOOTBALL_KEY", "")


def search_team_api_football(session: requests.Session, team_name: str) -> Optional[int]:
    """Söker efter ett lag på API-Football och returnerar team-ID."""
    api_key = get_api_football_key()
    if not api_key:
        return None
    
    url = f"{API_FOOTBALL_BASE}/teams"
    headers = {"x-apisports-key": api_key}
    params = {"search": team_name}
    
    try:
        resp = session.get(url, headers=headers, params=params, timeout=10)
        data = resp.json()
        
        teams = data.get("response", [])
        if teams:
            # Ta första träffen
            return teams[0]["team"]["id"]
    except Exception:
        pass
    
    return None


def fetch_matches_api_football(session: requests.Session, team_name: str) -> TeamForm:
    """
    Hämtar lagets senaste 5 matcher via API-Football.
    Täcker alla ligor inkl. League One, League Two, National League.
    """
    print(f"  📊 Hämtar form för: {team_name} (API-Football)")
    
    team_form = TeamForm(team_name=team_name)
    api_key = get_api_football_key()
    
    if not api_key:
        print(f"  ⚠️  Ingen API-Football nyckel! Lägg till i config.py")
        return team_form
    
    # Sök efter laget
    team_id = search_team_api_football(session, team_name)
    
    if not team_id:
        # Försök expandera namnet
        expanded = expand_team_name(team_name)
        if expanded != team_name:
            team_id = search_team_api_football(session, expanded)
    
    if not team_id:
        print(f"  ⚠️  Kunde inte hitta {team_name} i API-Football")
        return team_form
    
    print(f"  🔍 Hittade team ID: {team_id}")
    
    # Hämta matcher för säsongen (gratis plan stöder inte 'last' parameter)
    # Använd season + status istället
    url = f"{API_FOOTBALL_BASE}/fixtures"
    headers = {"x-apisports-key": api_key}
    params = {"team": team_id, "season": 2025, "status": "FT"}  # FT = Full Time (avslutade)
    
    time.sleep(1)  # Rate limiting
    
    try:
        resp = session.get(url, headers=headers, params=params, timeout=15)
        data = resp.json()
        
        if data.get("errors"):
            errors = data["errors"]
            if isinstance(errors, dict) and errors.get("requests"):
                print(f"  ⚠️  API-Football daglig gräns nådd")
            elif isinstance(errors, dict) and "plan" in str(errors):
                print(f"  ⚠️  API-Football begränsning: {errors}")
            else:
                print(f"  ⚠️  API-Football fel: {errors}")
            return team_form
        
        fixtures = data.get("response", [])
        
        # Sortera efter datum (nyast först) och ta de 5 senaste
        fixtures_sorted = sorted(
            fixtures, 
            key=lambda x: x["fixture"].get("date", ""), 
            reverse=True
        )[:5]
        
        for fix in fixtures_sorted:
            fixture = fix["fixture"]
            teams_data = fix["teams"]
            goals = fix["goals"]
            
            home_team = teams_data["home"]["name"]
            away_team = teams_data["away"]["name"]
            home_score = goals["home"] or 0
            away_score = goals["away"] or 0
            
            # Avgör om vi spelade hemma
            was_home = (teams_data["home"]["id"] == team_id)
            date_str = fixture.get("date", "")[:10]
            
            match = Match(
                date=date_str,
                home_team=home_team,
                away_team=away_team,
                home_goals=home_score,
                away_goals=away_score,
                was_home=was_home,
            )
            # Slå upp motståndarens tabellposition
            opponent = away_team if was_home else home_team
            match.opponent_position = get_team_position(opponent)
            team_form.matches.append(match)
        
        # Sätt lagets egen tabellposition och motivation-data
        team_data = get_team_data(team_name)
        if team_data:
            team_form.team_position = team_data.get("position")
            team_form.team_points = team_data.get("points")
            league = team_data.get("league")
            if league:
                league_meta = get_league_metadata(league)
                if league_meta:
                    team_form.league_leader_points = league_meta.get("leader_points")
                    team_form.relegation_line_points = league_meta.get("relegation_line_points")
        
        print(f"     ✅ {len(team_form.matches)} matcher hämtade | Form: {team_form.form_string} | Formpoäng: {team_form.form_score}")
        
    except Exception as e:
        print(f"  ⚠️  Fel vid API-Football: {e}")
    
    return team_form


# ══════════════════════════════════════════════════════════════════════════════
# HEAD-TO-HEAD DATA – Hämta historiska möten mellan två lag
# ══════════════════════════════════════════════════════════════════════════════

def fetch_h2h_score(session: requests.Session, team_a: str, team_b: str) -> Tuple[float, float]:
    """
    Hämtar H2H-historik och returnerar (team_a_h2h_score, team_b_h2h_score).
    Score är baserad på senaste mötena mellan lagen.
    
    Returnerar (0.0, 0.0) om ingen data hittas.
    """
    print(f"  🔄 Hämtar H2H: {team_a} vs {team_b}")
    
    h2h_a = 0.0
    h2h_b = 0.0
    
    # Försök 1: Football-Data.org (om vi har team-IDs)
    api_key = get_football_data_api_key()
    if api_key:
        team_a_id = FOOTBALL_DATA_TEAMS.get(team_a.lower().strip())
        team_b_id = FOOTBALL_DATA_TEAMS.get(team_b.lower().strip())
        
        if team_a_id and team_b_id:
            time.sleep(REQUEST_DELAY)
            try:
                url = f"{FOOTBALL_DATA_BASE}/teams/{team_a_id}/matches"
                headers = {"X-Auth-Token": api_key}
                params = {"status": "FINISHED", "limit": 50}  # Hämta fler för att hitta H2H
                resp = session.get(url, headers=headers, params=params, timeout=15)
                
                if resp.status_code == 200:
                    data = resp.json()
                    matches = data.get("matches", [])
                    
                    h2h_matches = []
                    for m in matches:
                        home_id = m["homeTeam"]["id"]
                        away_id = m["awayTeam"]["id"]
                        # Kontrollera om detta är en match mellan de två lagen
                        if (home_id == team_a_id and away_id == team_b_id) or \
                           (home_id == team_b_id and away_id == team_a_id):
                            h2h_matches.append(m)
                    
                    # Analysera de senaste H2H-matcherna
                    for m in h2h_matches[:H2H_MATCHES_TO_FETCH]:
                        home_id = m["homeTeam"]["id"]
                        home_score = m["score"]["fullTime"]["home"] or 0
                        away_score = m["score"]["fullTime"]["away"] or 0
                        
                        if home_score > away_score:
                            winner_id = home_id
                        elif away_score > home_score:
                            winner_id = m["awayTeam"]["id"]
                        else:
                            winner_id = None  # Oavgjort
                        
                        if winner_id == team_a_id:
                            h2h_a += H2H_WEIGHT
                        elif winner_id == team_b_id:
                            h2h_b += H2H_WEIGHT
                        else:
                            h2h_a += H2H_WEIGHT * 0.3
                            h2h_b += H2H_WEIGHT * 0.3
                    
                    if h2h_matches:
                        print(f"     ✅ H2H: {len(h2h_matches)} möten analyserade")
                        return round(h2h_a, 2), round(h2h_b, 2)
                        
            except Exception as e:
                print(f"     ⚠️ H2H-fel: {e}")
    
    # Försök 2: TheSportsDB H2H endpoint
    try:
        team_a_id = search_team_id_cached(session, team_a)
        team_b_id = search_team_id_cached(session, team_b)
        
        if team_a_id and team_b_id:
            url = f"https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e={requests.utils.quote(team_a)}%20vs%20{requests.utils.quote(team_b)}"
            time.sleep(1)
            resp = session.get(url, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                events = data.get("event") or []
                
                for event in events[:H2H_MATCHES_TO_FETCH]:
                    home_score = int(event.get("intHomeScore") or 0)
                    away_score = int(event.get("intAwayScore") or 0)
                    home_team = event.get("strHomeTeam", "").lower()
                    
                    if home_score > away_score:
                        if team_a.lower() in home_team:
                            h2h_a += H2H_WEIGHT
                        else:
                            h2h_b += H2H_WEIGHT
                    elif away_score > home_score:
                        if team_a.lower() in home_team:
                            h2h_b += H2H_WEIGHT
                        else:
                            h2h_a += H2H_WEIGHT
                    else:
                        h2h_a += H2H_WEIGHT * 0.3
                        h2h_b += H2H_WEIGHT * 0.3
                
                if events:
                    print(f"     ✅ H2H via TheSportsDB: {len(events[:H2H_MATCHES_TO_FETCH])} möten")
                    return round(h2h_a, 2), round(h2h_b, 2)
    except Exception as e:
        print(f"     ⚠️ H2H TheSportsDB-fel: {e}")
    
    print(f"     ℹ️ Ingen H2H-data hittad")
    return 0.0, 0.0


# Cache för team-ID-sökningar
_team_id_cache: dict[str, Optional[str]] = {}

def search_team_id_cached(session: requests.Session, team_name: str) -> Optional[str]:
    """Cachad version av search_team_id."""
    cache_key = team_name.lower().strip()
    if cache_key in _team_id_cache:
        return _team_id_cache[cache_key]
    
    result = search_team_id(session, team_name)
    _team_id_cache[cache_key] = result
    return result


# ══════════════════════════════════════════════════════════════════════════════
# DATAHÄMTNING – LAGFORM (TheSportsDB API - Gratis fallback)
# ══════════════════════════════════════════════════════════════════════════════

SPORTSDB_SEARCH_URL = "https://www.thesportsdb.com/api/v1/json/3/searchteams.php"
SPORTSDB_LAST_EVENTS = "https://www.thesportsdb.com/api/v1/json/3/eventslast.php"
SPORTSDB_PAST_LEAGUE = "https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php"

# Mappning av vanliga förkortningar till fullständiga namn
TEAM_ALIASES = {
    "newcastle": "Newcastle United",
    "west ham": "West Ham United",
    "brighton": "Brighton and Hove Albion",
    "leeds": "Leeds United",
    "norwich": "Norwich City",
    "ipswich": "Ipswich Town",
    "derby": "Derby County",
    "birmingham": "Birmingham City",
    "oxford": "Oxford United",
    "bradford": "Bradford City",
    "lincoln": "Lincoln City",
    "mansfield": "Mansfield Town",
    "wimbledon": "AFC Wimbledon",
    "charlton": "Charlton Athletic",
    "man city": "Manchester City",
    "man utd": "Manchester United",
    "man united": "Manchester United",
    "spurs": "Tottenham Hotspur",
    "tottenham": "Tottenham Hotspur",
    "wolves": "Wolverhampton Wanderers",
    "wolverhampton": "Wolverhampton Wanderers",
    "palace": "Crystal Palace",
    "forest": "Nottingham Forest",
    "nottingham": "Nottingham Forest",
    "villa": "Aston Villa",
    "sheffield utd": "Sheffield United",
    "sheffield united": "Sheffield United",
    "sheffield wed": "Sheffield Wednesday",
    "qpr": "Queens Park Rangers",
    "west brom": "West Bromwich Albion",
    "baggies": "West Bromwich Albion",
}

# Liga-ID:n för att hämta matcher (TheSportsDB)
LEAGUE_IDS = {
    "Premier League": 4328,
    "Championship": 4329,
    "League One": 4396,
    "League Two": 4397,
    "National League": 4590,
    "Allsvenskan": 4350,
    "La Liga": 4335,
    "Serie A": 4332,
    "Bundesliga": 4331,
    "Ligue 1": 4334,
}

# Cache för liga-matcher (för att undvika upprepade anrop)
_league_cache = {}


def expand_team_name(team_name: str) -> str:
    """Expanderar förkortade lagnamn till fullständiga namn."""
    lower = team_name.lower().strip()
    if lower in TEAM_ALIASES:
        return TEAM_ALIASES[lower]
    return team_name


def search_team_id(session: requests.Session, team_name: str) -> Optional[str]:
    """
    Söker efter ett lag på TheSportsDB och returnerar deras ID.
    """
    # Försök först med expanderat namn
    expanded = expand_team_name(team_name)
    search_names = [expanded] if expanded != team_name else []
    search_names.append(team_name)
    
    for search_name in search_names:
        url = f"{SPORTSDB_SEARCH_URL}?t={requests.utils.quote(search_name)}"
        try:
            resp = session.get(url, timeout=10)
            data = resp.json()
            teams = data.get("teams") or []
            
            search_lower = search_name.lower()
            for team in teams:
                name = team.get("strTeam", "").lower()
                alt_name = team.get("strTeamAlternate", "").lower()
                short = team.get("strTeamShort", "").lower() if team.get("strTeamShort") else ""
                
                # Matcha på namn, alternativnamn eller kortnamn
                if (search_lower in name or name in search_lower or
                    search_lower in alt_name or 
                    search_lower == short):
                    if team.get("strSport") == "Soccer":
                        team_id = team.get("idTeam")
                        print(f"  🔍 Hittade: {team.get('strTeam')} (ID: {team_id})")
                        return team_id
            
            # Om exakt match inte hittades, ta första fotbollslaget
            for team in teams:
                if team.get("strSport") == "Soccer":
                    team_id = team.get("idTeam")
                    print(f"  🔍 Hittade: {team.get('strTeam')} (ID: {team_id})")
                    return team_id
        except Exception as e:
            print(f"  ⚠️  Sökfel för {search_name}: {e}")
            continue
                
    print(f"  ⚠️  Hittade inte lag: {team_name}")
    return None


def fetch_league_matches(session: requests.Session, league_id: int) -> list:
    """Hämtar senaste matcher från en liga (cachas)."""
    if league_id in _league_cache:
        return _league_cache[league_id]
    
    url = f"{SPORTSDB_PAST_LEAGUE}?id={league_id}"
    try:
        resp = session.get(url, timeout=15)
        data = resp.json()
        events = data.get("events") or []
        _league_cache[league_id] = events
        return events
    except Exception:
        return []


def fetch_last_5_matches(session: requests.Session, team_name: str) -> TeamForm:
    """
    Hämtar lagets senaste 5 matcher via TheSportsDB.
    Kombinerar team-API och liga-API för att få fler matcher.
    """
    print(f"  📊 Hämtar form för: {team_name}")
    time.sleep(REQUEST_DELAY)

    team_form = TeamForm(team_name=team_name)
    
    # Expandera namnet
    expanded_name = expand_team_name(team_name)
    team_id = search_team_id(session, team_name)

    if team_id is None:
        print(f"  ⚠️  Kunde inte hitta {team_name}, formpoäng sätts till 0")
        return team_form

    time.sleep(REQUEST_DELAY)

    # Hämta senaste matcher från team-API
    url = f"{SPORTSDB_LAST_EVENTS}?id={team_id}"
    all_matches = []
    
    try:
        resp = session.get(url, timeout=10)
        data = resp.json()
        events = data.get("results") or []

        for event in events:
            if event.get("strStatus") == "Match Finished" and event.get("intHomeScore") is not None:
                all_matches.append(event)

    except Exception as e:
        print(f"  ⚠️  Fel vid team-API: {e}")

    # Om vi har färre än 5 matcher, komplettera från liga-API:er
    if len(all_matches) < 5:
        for league_name, league_id in LEAGUE_IDS.items():
            if len(all_matches) >= 5:
                break
            
            time.sleep(0.5)
            league_events = fetch_league_matches(session, league_id)
            
            # Hitta matcher där vårt lag spelar
            expanded = expand_team_name(team_name)
            for event in league_events:
                if len(all_matches) >= 5:
                    break
                    
                home = event.get("strHomeTeam", "")
                away = event.get("strAwayTeam", "")
                
                # Matcha på lagnamn (flexibelt)
                team_lower = team_name.lower()
                expanded_lower = expanded.lower()
                
                if (team_lower in home.lower() or team_lower in away.lower() or
                    expanded_lower in home.lower() or expanded_lower in away.lower() or
                    home.lower() in expanded_lower or away.lower() in expanded_lower):
                    
                    if event.get("strStatus") == "Match Finished" and event.get("intHomeScore") is not None:
                        # Kontrollera att vi inte redan har denna match
                        event_id = event.get("idEvent")
                        if not any(m.get("idEvent") == event_id for m in all_matches):
                            all_matches.append(event)

    # Konvertera till Match-objekt
    for event in all_matches[:5]:
        home_name = event.get("strHomeTeam", "")
        away_name = event.get("strAwayTeam", "")
        home_score = int(event.get("intHomeScore") or 0)
        away_score = int(event.get("intAwayScore") or 0)
        
        # Avgör om vi spelade hemma
        expanded = expand_team_name(team_name)
        was_home = (team_name.lower() in home_name.lower() or 
                    expanded.lower() in home_name.lower() or
                    home_name.lower() in expanded.lower())
        
        date_str = event.get("dateEvent", "")

        match = Match(
            date=date_str,
            home_team=home_name,
            away_team=away_name,
            home_goals=home_score,
            away_goals=away_score,
            was_home=was_home,
        )
        # Slå upp motståndarens tabellposition
        opponent = away_name if was_home else home_name
        match.opponent_position = get_team_position(opponent)
        team_form.matches.append(match)

    # Sätt lagets egen tabellposition
    team_form.team_position = get_team_position(team_name)

    print(f"     ✅ {len(team_form.matches)} matcher hämtade | Form: {team_form.form_string} | Formpoäng: {team_form.form_score}")

    return team_form


def fetch_last_5_matches_auto(session: requests.Session, team_name: str) -> TeamForm:
    """
    Väljer automatiskt bästa API:
    1. Football-Data.org om API-nyckel finns (Premier League + Championship)
    2. API-Football som fallback (League One, League Two, alla ligor)
    3. TheSportsDB som sista fallback (1-2 matcher)
    """
    api_key = get_football_data_api_key()
    api_football_key = get_api_football_key()
    
    # Försök Football-Data.org först (Premier League + Championship)
    if api_key and USE_FOOTBALL_DATA:
        result = fetch_matches_football_data(session, team_name)
        if result.num_matches >= 3:  # Bra resultat
            return result
        elif result.num_matches > 0:
            # Fick något, men försök API-Football för fler matcher
            pass
        else:
            # Ingen träff, försök API-Football
            pass
    
    # Försök API-Football (täcker alla ligor)
    if api_football_key and USE_API_FOOTBALL:
        print(f"  ↩️  Försöker API-Football...")
        result = fetch_matches_api_football(session, team_name)
        if result.num_matches > 0:
            return result
    
    # Sista fallback: TheSportsDB
    print(f"  ↩️  Fallback till TheSportsDB...")
    return fetch_last_5_matches(session, team_name)


def fetch_team_league_position(session: requests.Session, team_id: str) -> Optional[int]:
    """
    TheSportsDB har ingen enkel endpoint för ligaposition.
    Returnerar None.
    """
    return None


# ══════════════════════════════════════════════════════════════════════════════
# ANALYS & OUTPUT
# ══════════════════════════════════════════════════════════════════════════════

def analyze_all_matches(matches: list[StryktipsMatch], session: requests.Session) -> None:
    """
    Kör formanalys för alla lag i Stryktipset.
    """
    print(f"\n{'═'*60}")
    print("  HÄMTAR FORMDATA FÖR ALLA LAG")
    print(f"{'═'*60}\n")

    # Hämta ligatabeller först (för motståndarstyrka-viktning)
    fetch_all_standings(session)
    
    all_teams = set()
    for m in matches:
        all_teams.add(m.home_team)
        all_teams.add(m.away_team)

    # Hämta form för varje unikt lag (caching för lag som spelar flera ggr)
    form_cache: dict[str, TeamForm] = {}
    for team in sorted(all_teams):
        if team not in form_cache:
            form_cache[team] = fetch_last_5_matches_auto(session, team)

    # Koppla formdata till matcherna
    for m in matches:
        m.home_form = form_cache.get(m.home_team, TeamForm(team_name=m.home_team))
        m.away_form = form_cache.get(m.away_team, TeamForm(team_name=m.away_team))


def print_detailed_form(team_form: TeamForm, label: str) -> None:
    """Skriver ut detaljerad formhistorik för ett lag."""
    print(f"\n    {label}: {team_form.team_name}")
    print(f"    Formpoäng: {team_form.form_score:.2f} | Form: {team_form.form_string}")
    for j, match in enumerate(team_form.matches[:5]):
        result = match.result_for_team
        result_icon = {"V": "✅", "O": "⬜", "F": "❌"}.get(result, "?")
        opp_pos = f"(pos.{match.opponent_position})" if match.opponent_position else ""
        print(f"      {j+1}. [{match.venue}] {match.home_team} {match.score_string} {match.away_team}"
              f"  →  {result_icon} {result}  {opp_pos}")


def print_results(matches: list[StryktipsMatch]) -> None:
    """
    Skriver ut det slutliga analysresultatet som en snygg tabell.
    """
    print(f"\n\n{'═'*70}")
    print("  STRYKTIPS FORMANALYS – RESULTAT")
    print(f"{'═'*70}\n")

    # Detaljerad vy per match
    for m in matches:
        rec = m.recommendation
        rec_icon = {"1": "🏠", "X": "⚖️ ", "2": "✈️ "}.get(rec, "❓")
        print(f"\n{'─'*65}")
        print(f"  Match {m.match_number:2d}  │  {m.home_team} vs {m.away_team}")
        if m.competition:
            print(f"            │  {m.competition}")

        if m.home_form:
            print_detailed_form(m.home_form, "Hemma")
        if m.away_form:
            print_detailed_form(m.away_form, "Borta")

        diff = 0.0
        if m.home_form and m.away_form:
            diff = m.home_form.form_score - m.away_form.form_score

        print(f"\n    → Rekommendation: {rec_icon} {rec}  {m.confidence}")
        print(f"       (Formpoängsskillnad: {diff:+.2f})")

    # Summering
    print(f"\n\n{'═'*70}")
    print("  SAMMANFATTNING – STRYKTIPSRAD")
    print(f"{'═'*70}\n")

    if HAS_TABULATE:
        table_data = []
        for m in matches:
            home_score = m.home_form.form_score if m.home_form else 0
            away_score = m.away_form.form_score if m.away_form else 0
            home_form  = m.home_form.form_string if m.home_form else "----"
            away_form  = m.away_form.form_string if m.away_form else "----"
            diff = home_score - away_score
            table_data.append([
                m.match_number,
                m.home_team[:18],
                m.away_team[:18],
                f"{home_score:.1f}",
                f"{away_score:.1f}",
                f"{diff:+.1f}",
                m.recommendation,
                m.confidence,
            ])
        headers = ["#", "Hemma", "Borta", "H-form", "B-form", "Diff", "Rek", "Styrka"]
        print(tabulate(table_data, headers=headers, tablefmt="rounded_outline"))
    else:
        # Enkel tabell utan tabulate
        print(f"  {'#':>2}  {'Hemma':<20} {'Borta':<20} {'H-p':>5} {'B-p':>5} {'Diff':>6} {'Rek':>4}  {'Styrka'}")
        print(f"  {'─'*70}")
        for m in matches:
            home_score = m.home_form.form_score if m.home_form else 0
            away_score = m.away_form.form_score if m.away_form else 0
            diff = home_score - away_score
            print(f"  {m.match_number:>2}  {m.home_team:<20} {m.away_team:<20} "
                  f"{home_score:>5.1f} {away_score:>5.1f} {diff:>+6.1f} "
                  f"{m.recommendation:>4}  {m.confidence}")

    # Summerad rad
    rad = "".join(m.recommendation for m in matches)
    print(f"\n  📋 Din systemrad: {' '.join(m.recommendation for m in matches)}")
    print(f"  📋 Kompakt:       {rad}\n")

    # Varning
    print("  ⚠️  OBS: Formanalys är EN faktor av många. Skadade spelare,")
    print("  väder, tabellposition och taktik påverkar också utfallet.")
    print(f"\n{'═'*70}\n")


def save_results_to_file(matches: list[StryktipsMatch]) -> None:
    """Sparar resultaten till en JSON-fil för vidare analys."""
    output = []
    for m in matches:
        output.append({
            "match": m.match_number,
            "home": m.home_team,
            "away": m.away_team,
            "competition": m.competition,
            "home_form_score": m.home_form.form_score if m.home_form else None,
            "away_form_score": m.away_form.form_score if m.away_form else None,
            "home_form_string": m.home_form.form_string if m.home_form else None,
            "away_form_string": m.away_form.form_string if m.away_form else None,
            "recommendation": m.recommendation,
            "confidence": m.confidence,
        })

    filename = f"stryktips_analys_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"  💾 Resultat sparade till: {filename}")


# ══════════════════════════════════════════════════════════════════════════════
# DEMO-LÄGE (om nätverket inte når Sofascore)
# ══════════════════════════════════════════════════════════════════════════════

def run_demo() -> None:
    """
    Kör en demo med påhittad data för att visa hur systemet fungerar.
    Används för test utan internetanslutning till Sofascore.
    """
    print("\n🎮 Kör i DEMO-LÄGE med exempeldata...\n")

    demo_matches = [
        StryktipsMatch(1, "AIK", "Djurgårdens IF", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(2, "Malmö FF", "IFK Göteborg", "Allsvenskan", "2025-02-22"),
        StryktipsMatch(3, "Arsenal", "Chelsea", "Premier League", "2025-02-22"),
    ]

    # Fyll i exempeldata för AIK
    aik = TeamForm("AIK")
    aik.matches = [
        Match("2025-02-15", "AIK", "Hammarby", 2, 1, True, 6),
        Match("2025-02-08", "IFK Norrköping", "AIK", 0, 3, False, 8),
        Match("2025-02-01", "AIK", "Elfsborg", 1, 1, True, 5),
        Match("2025-01-25", "BK Häcken", "AIK", 2, 1, False, 9),
        Match("2025-01-18", "AIK", "Sirius", 3, 0, True, 14),
    ]

    djurgardens = TeamForm("Djurgårdens IF")
    djurgardens.matches = [
        Match("2025-02-15", "Djurgårdens IF", "Sirius", 3, 3, True, 12),
        Match("2025-02-08", "Djurgårdens IF", "BK Häcken", 1, 0, True, 7),
        Match("2025-02-01", "Malmö FF", "Djurgårdens IF", 2, 0, False, 2),
        Match("2025-01-25", "Djurgårdens IF", "IFK Göteborg", 2, 2, True, 4),
        Match("2025-01-18", "Elfsborg", "Djurgårdens IF", 1, 1, False, 3),
    ]

    malmo = TeamForm("Malmö FF")
    malmo.matches = [
        Match("2025-02-15", "Malmö FF", "AIK", 1, 0, True, 3),
        Match("2025-02-08", "IFK Göteborg", "Malmö FF", 0, 2, False, 4),
        Match("2025-02-01", "Malmö FF", "Djurgårdens IF", 2, 0, True, 2),
        Match("2025-01-25", "Elfsborg", "Malmö FF", 1, 1, False, 5),
        Match("2025-01-18", "Malmö FF", "BK Häcken", 3, 1, True, 7),
    ]

    ifk = TeamForm("IFK Göteborg")
    ifk.matches = [
        Match("2025-02-15", "IFK Göteborg", "Hammarby", 0, 1, True, 8),
        Match("2025-02-08", "IFK Göteborg", "Malmö FF", 0, 2, True, 1),
        Match("2025-02-01", "Sirius", "IFK Göteborg", 2, 0, False, 13),
        Match("2025-01-25", "Djurgårdens IF", "IFK Göteborg", 2, 2, False, 3),
        Match("2025-01-18", "IFK Göteborg", "BK Häcken", 1, 0, True, 9),
    ]

    arsenal = TeamForm("Arsenal")
    arsenal.matches = [
        Match("2025-02-15", "Arsenal", "Man City", 3, 1, True, 2),
        Match("2025-02-08", "Liverpool", "Arsenal", 1, 2, False, 1),
        Match("2025-02-01", "Arsenal", "Tottenham", 2, 0, True, 4),
        Match("2025-01-25", "Fulham", "Arsenal", 0, 1, False, 10),
        Match("2025-01-18", "Arsenal", "Brentford", 2, 2, True, 12),
    ]

    chelsea = TeamForm("Chelsea")
    chelsea.matches = [
        Match("2025-02-15", "Chelsea", "Everton", 2, 0, True, 17),
        Match("2025-02-08", "Chelsea", "West Ham", 1, 1, True, 14),
        Match("2025-02-01", "Man Utd", "Chelsea", 1, 2, False, 13),
        Match("2025-01-25", "Chelsea", "Newcastle", 0, 2, True, 5),
        Match("2025-01-18", "Brighton", "Chelsea", 3, 1, False, 8),
    ]

    demo_matches[0].home_form = aik
    demo_matches[0].away_form = djurgardens
    demo_matches[1].home_form = malmo
    demo_matches[1].away_form = ifk
    demo_matches[2].home_form = arsenal
    demo_matches[2].away_form = chelsea

    print_results(demo_matches)


# ══════════════════════════════════════════════════════════════════════════════
# HUVUDPROGRAM
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("\n" + "═"*60)
    print("  STRYKTIPS FORMANALYSSYSTEM")
    print(f"  Körning: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═"*60)

    # Kontrollera om vi vill köra demo
    if "--demo" in sys.argv:
        run_demo()
        return

    session = get_session()

    # 1. Hämta aktuellt Stryktips
    matches = fetch_stryktips(session)

    if not matches:
        print("❌ Kunde inte hämta Stryktipset. Avbryter.")
        sys.exit(1)

    # 2. Hämta form för alla lag
    analyze_all_matches(matches, session)

    # 3. Skriv ut resultat
    print_results(matches)

    # 4. Spara till fil
    save_choice = input("  Spara resultat till JSON-fil? (j/n): ").strip().lower()
    if save_choice in ("j", "ja", "y", "yes"):
        save_results_to_file(matches)


if __name__ == "__main__":
    main()
