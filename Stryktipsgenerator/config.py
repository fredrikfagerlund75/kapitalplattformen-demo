"""
Konfiguration för Stryktips Formanalys
======================================

Football-Data.org API (gratis):
1. Gå till: https://www.football-data.org/client/register
2. Registrera dig (gratis, tar 1 min)
3. Kopiera API-nyckeln från bekräftelsemailet
4. Klistra in den nedan

API-Football (gratis, täcker League One/Two):
1. Gå till: https://www.api-football.com/
2. Klicka "Get Free API Key" eller "Sign Up"
3. Kopiera din API-nyckel från dashboard
4. Klistra in den nedan
"""

# Din Football-Data.org API-nyckel (gratis: 10 anrop/min, Premier League + Championship)
FOOTBALL_DATA_API_KEY = "c55f899d752c4f76b94d9dc780e890d7"

# Din API-Football nyckel (gratis: 100 anrop/dag, alla ligor inkl League One/Two)
API_FOOTBALL_KEY = "c3956301f8db12ac5dcf02e96522d7a1"

# Sätt till True för att använda Football-Data.org istället för TheSportsDB
USE_FOOTBALL_DATA = True

# Sätt till True för att använda API-Football för lag som saknas i Football-Data.org
USE_API_FOOTBALL = True
