# Project BASHO - B2B SaaS Outreach Agent

## Overview
Project BASHO is an MVP B2B SaaS outreach agent that helps sales representatives discover and rank decision-makers at target companies, then generates personalized outreach messages ready to send.

## Features
- **POC Validation**: Validate anchor POC existence using public sources (Google, company website, LinkedIn)
- **Organization Discovery**: Discover 1st-degree connected decision-makers through job postings, company websites, LinkedIn, and news
- **Email Discovery**: Identify email patterns and generate candidate emails with confidence scores
- **Smart Ranking**: Score and rank POCs using 50/50 combined confidence model (role/authority/relevance vs. email validation)
- **Configurable Weights**: Product-type-specific signal weights (video platform, HR tool, analytics, etc.) with user customization
- **Message Generation**: Generate personalized outreach messages using Claude API
- **User Review Workflow**: Multi-step UI with review and edit capabilities before final output

## Project Structure
```
basho-agent/
├── app/
│   ├── __init__.py           # FastAPI app initialization
│   ├── database.py           # Database setup (SQLite + async)
│   ├── models.py             # SQLAlchemy models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── signal_weights.py     # Product-type signal weights config
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py         # API endpoints
│   └── modules/
│       ├── __init__.py
│       ├── poc_validator.py          # POC validation module
│       ├── org_discovery.py          # Organization discovery
│       ├── email_discovery.py        # Email pattern discovery
│       ├── ranking_engine.py         # POC ranking and scoring
│       └── message_generator.py      # Claude message generation
├── main.py                   # Entry point
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Installation

1. **Clone and navigate to project**
```bash
cd basho-agent
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

## Quick Start

1. **Start the server**
```bash
python main.py
```

2. **Access API**
```
http://localhost:8000
Health check: http://localhost:8000/health
API docs: http://localhost:8000/docs (Swagger UI)
```

## API Endpoints

### 1. Validate POC
```
POST /api/validate-poc
```
Validate anchor POC existence and gather initial information.

**Request:**
```json
{
  "poc_name": "John Doe",
  "company_name": "TechCorp",
  "additional_context": "optional LinkedIn URL"
}
```

**Response:**
```json
{
  "is_valid": true,
  "confidence": 0.85,
  "found_info": {...},
  "needs_clarification": false,
  "sources": ["google_search", "company_website", "linkedin"]
}
```

### 2. Get Signal Weights
```
GET /api/signal-weights/{product_type}
```
Get default signal weights for product type (with option to customize).

**Parameters:**
- `product_type`: video_platform, hr_tool, analytics_tool, sales_enablement, security_compliance

**Response:**
```json
{
  "product_type": "video_platform",
  "default_weights": {...},
  "description": "B2B SaaS video hosting/production platform",
  "can_adjust": true
}
```

### 3. Discover and Rank
```
POST /api/discover-and-rank
```
Main discovery endpoint - orchestrates org discovery, email discovery, and ranking.

**Request:**
```json
{
  "anchor_poc_name": "John Doe",
  "company_name": "TechCorp",
  "product_type": "video_platform",
  "custom_weights": {"video_hiring_signal": 0.9}
}
```

**Response:**
```json
{
  "company_name": "TechCorp",
  "total_pocs_discovered": 8,
  "ranked_pocs": [...],
  "discovery_timestamp": "2026-02-06T...",
  "cache_status": "fresh",
  "messages_ready": false
}
```

### 4. Generate Messages
```
POST /api/generate-messages
```
Generate personalized outreach messages for discovered POCs.

### 5. Review and Finalize
```
POST /api/review-and-finalize
```
Final step with user review and adjustments before output.

## Data Flow

```
User Input (POC, Company, Product Type)
    ↓
[POC Validation] → Confirm anchor POC exists
    ↓
[Organization Discovery] → Find 1st-degree connected POCs
    ├─ Job postings (hiring managers, team structure)
    ├─ Company website (team pages, leadership)
    ├─ LinkedIn (org structure, employees)
    └─ News (executive changes, initiatives)
    ↓
[Email Discovery] → Identify email patterns + generate emails
    ├─ LinkedIn visible emails
    ├─ Company website
    ├─ Job postings
    └─ Pattern analysis
    ↓
[Ranking Engine] → Score POCs with 50/50 confidence model
    ├─ Role/Authority/Relevance (50%)
    └─ Email Pattern Validation (50%)
    ↓
[Message Generation] → Draft personalized messages (Claude API)
    ├─ Personal (if signals found)
    └─ Generic (if no personal info)
    ↓
[User Review] → User can reorder, edit, adjust tone
    ↓
[Final Output] → Copy-paste-ready messages for each POC
```

## Scoring Model

### Combined Confidence Score (0-1.0)
```
Combined Score = 0.5 × Role Component + 0.5 × Email Component

Role Component:
  = (Title Authority × Product Relevance Weight) + Reporting Chain Relevance
  
Email Component:
  = Email Pattern Confidence %

Example:
  Title Authority: 0.8 (Director level)
  Product Relevance: 0.9 (Content Director role)
  Email Confidence: 0.85 (pattern from 8+ verified emails)
  
  Combined = 0.5 × (0.8 × 0.9 + 0.15) + 0.5 × 0.85 = 0.72 + 0.425 = 0.77
```

## Signal Weights by Product Type

### Video Platform SaaS
- Content Director Title: 0.95
- CMO/VP Marketing: 0.90/0.85
- Video Hiring Signal: 0.85
- Content Manager: 0.75

### HR Tool
- CHRO Title: 0.95
- VP HR: 0.90
- Director of People Ops: 0.85
- HR Hiring Signal: 0.85

### Analytics Tool
- CFO Title: 0.90
- VP Finance: 0.85
- Data Officer: 0.85
- Finance Hiring Signal: 0.80

*(See `app/signal_weights.py` for complete weights)*

## Ethical Scraping Practices

- **2-3 second delays** between requests
- **Respect robots.txt** for all domains
- **Cache aggressively** - refresh data every 3 days
- **Public data only** - never bypass login/paywall
- **LinkedIn note** - we don't scrape LinkedIn directly (user provides POC names)
- **Transparent sourcing** - document which sources verified each data point

## Environment Variables

```
ANTHROPIC_API_KEY=sk-...                    # Claude API key
DATABASE_URL=sqlite:///./basho.db          # SQLite database
SCRAPING_DELAY_SECONDS=2.5                 # Delay between requests
CACHE_DAYS=3                               # Cache validity
MAX_RETRIES=3                              # Retry limit
```

## Database Models

- **Company**: Caches org structure, email patterns, job postings per company
- **POCDiscovery**: Discovered POCs with scores and ranking data
- **OutreachDraft**: Generated message drafts
- **SignalWeightConfig**: User signal weight configurations

## Development Notes

### MVP Scope
- Single company lookup per session
- Top 5 POCs discovery and ranking
- Messages for top 3-5 POCs
- SQLite for local persistence

### Future Enhancements
- Batch company processing (CSV import)
- Real-time news integration (NewsAPI)
- LinkedIn official API integration
- Email validation via third-party APIs
- A/B message testing
- Analytics dashboard
- Email sending integration
- Follow-up automation

## Troubleshooting

**"ANTHROPIC_API_KEY not found"**
- Check `.env` file has valid API key
- Restart server after updating `.env`

**"Database lock errors"**
- Ensure only one instance running
- Delete `basho.db` and restart if corrupted

**"Slow discovery"**
- Normal - respects 2-3 second delays between requests
- Company with 10+ POCs takes ~30-60 seconds

## Contact & Support

For questions or issues, refer to the project documentation or contact the development team.

## License

Proprietary - Project BASHO
