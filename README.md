# Google Ads MCP Server

A Model Context Protocol (MCP) server that provides access to Google Ads API for comprehensive campaign analytics. Use with Claude Code for conversational ad performance analysis.

## Features

- **Google OAuth Authentication**: Secure login with Google for multi-user access
- **Remote HTTP Access**: StreamableHTTP transport for remote MCP connections
- **11 Analytics Tools**: Comprehensive Google Ads performance analytics
  - Account information
  - Campaign, Ad Group, and Ad performance metrics
  - Keyword performance with quality scores
  - Search term reports
  - Performance Max asset group analysis
  - Conversion action tracking
  - Demographic performance (age, gender, device)
  - Budget pacing and utilization analysis
  - Multi-level data export
- **Docker Support**: Containerized deployment with health checks
- **Production Ready**: Environment-based configuration, security best practices

## Prerequisites

- Node.js 24+ (or Docker)
- Google Ads API access ([apply for developer token](https://ads.google.com/aw/apicenter))
- Google Cloud project with OAuth 2.0 credentials
- Google Ads account with active campaigns

## Quick Setup (Local Development)

### 1. Clone and Install

```bash
git clone https://github.com/jgdeutsch/google-ads-mcp.git
cd google-ads-mcp
npm install
```

### 2. Get Google Ads API Credentials

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the Google Ads API
3. Create OAuth 2.0 credentials (Desktop application type)
4. Get your developer token from [Google Ads API Center](https://ads.google.com/aw/apicenter)

### 3. Get Refresh Token

```bash
# Edit scripts/get_refresh_token.py with your CLIENT_ID and CLIENT_SECRET
python3 scripts/get_refresh_token.py
```

### 4. Configure Environment

```bash
cp .env.example .env

# Edit .env and add:
# - GOOGLE_ADS_CLIENT_ID (from OAuth credentials)
# - GOOGLE_ADS_CLIENT_SECRET (from OAuth credentials)
# - GOOGLE_ADS_REFRESH_TOKEN (from step 3)
# - GOOGLE_ADS_DEVELOPER_TOKEN (from API Center)
# - GOOGLE_ADS_LOGIN_CUSTOMER_ID (MCC account, no dashes)
# - GOOGLE_ADS_CUSTOMER_ID (ad account, no dashes)
# - SESSION_SECRET (generate with: openssl rand -base64 32)
# - REQUIRE_AUTH=false (for local use)
```

### 5. Start the Server

```bash
npm run build && npm start
# Or for development with hot reload:
npm run dev
```

### 6. Configure Claude Code

Add to `~/.config/claude-code/mcp.json`:

```json
{
  "mcpServers": {
    "google-ads": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

### 7. Test in Claude Code

```
You: "Show me campaign performance for last 7 days"
You: "What are my top performing keywords?"
You: "Show search terms with highest spend"
You: "How's my budget pacing this month?"
```

## Available Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | `get-account` | Account info (name, currency, timezone, status) |
| 2 | `get-campaign-performance` | Campaign metrics with budget and bidding strategy |
| 3 | `get-ad-group-performance` | Ad group metrics with campaign context |
| 4 | `get-ad-performance` | Individual ad performance metrics |
| 5 | `get-keyword-performance` | Keyword metrics with quality scores |
| 6 | `get-search-terms` | Search queries that triggered your ads |
| 7 | `get-asset-group-performance` | Performance Max asset group metrics |
| 8 | `get-conversions` | Conversion actions and conversion metrics |
| 9 | `get-demographic-performance` | Performance by age, gender, or device |
| 10 | `get-budget-analysis` | Budget pacing and utilization rates |
| 11 | `export-data` | Multi-level data export with daily breakdowns |

## Date Ranges

All tools support these date range presets:

- `TODAY`, `YESTERDAY`
- `LAST_7_DAYS`, `LAST_14_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`
- `THIS_MONTH`, `LAST_MONTH`

## Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Production Deployment (Railway)

1. Fork this repo
2. Connect to Railway
3. Set environment variables in Railway dashboard
4. Deploy (uses Dockerfile automatically)

## Environment Variables

See `.env.example` for full documentation.

### Required

| Variable | Description |
|----------|-------------|
| `GOOGLE_ADS_CLIENT_ID` | OAuth client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth refresh token |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API developer token |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | MCC account ID (no dashes) |
| `GOOGLE_ADS_CUSTOMER_ID` | Ad account ID (no dashes) |
| `SESSION_SECRET` | Random 32+ char secret |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `development` | Environment |
| `REQUIRE_AUTH` | `false` | Enable OAuth for team access |
| `SESSION_TTL` | `86400000` | Session duration (ms) |

## Development

```bash
npm install          # Install dependencies
npm run type-check   # Type checking
npm run dev          # Development with hot reload
npm run build        # Build TypeScript
npm start            # Run built version
```

## Security

- OAuth 2.0 with PKCE for authentication
- Bearer tokens with 24-hour expiry
- Non-root Docker container
- No secrets in version control
- `.env` excluded via `.gitignore`

## License

MIT

## Support

- GitHub Issues: [https://github.com/jgdeutsch/google-ads-mcp/issues](https://github.com/jgdeutsch/google-ads-mcp/issues)

---

**Built with the Model Context Protocol SDK**
