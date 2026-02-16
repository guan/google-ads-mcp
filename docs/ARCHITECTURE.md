# Google Ads MCP Server Architecture

## Overview

This document describes the architecture of the Google Ads MCP server, including authentication, API integration, and tool design.

## System Architecture

```
Claude Code CLI
    |
    v
Express HTTP Server (StreamableHTTP MCP Transport)
    |
    v
Authentication Layer (Google OAuth 2.0 / Bearer Tokens)
    |
    v
MCP Tool Router (11 tools)
    |
    v
Google Ads API Client (GAQL queries)
    |
    v
Google Ads API v18+ (SearchStream)
    |
    v
Superpower MCC (846-107-5268) -> Superpower Ads (861-809-6874)
```

## Authentication

### Dual Mode

The server supports two modes:

1. **Local mode** (`REQUIRE_AUTH=false`): Uses `GOOGLE_ADS_REFRESH_TOKEN` directly. No OAuth login needed. Best for single-user local development.

2. **Production mode** (`REQUIRE_AUTH=true`): Requires Google OAuth login for each user. Team members authenticate with their Google accounts.

### OAuth Flow

```
1. Client -> GET /authorize?response_type=code&client_id=...&redirect_uri=...
2. Server stores auth request in session, redirects to Google OAuth
3. Google -> GET /auth/callback?code=...
4. Server exchanges code for user profile, generates authorization code
5. Client -> POST /token (exchange authorization code for access token)
6. Client uses Bearer token for all MCP requests
```

### Token Management

- **Access tokens**: 24-hour expiry, in-memory store
- **Session cookies**: 24-hour expiry, signed with SESSION_SECRET
- **PKCE support**: S256 and plain code challenge methods

## Google Ads API Integration

### GAQL (Google Ads Query Language)

All data is retrieved using GAQL queries. The `google-ads-api` npm package handles:
- OAuth token refresh
- Request retries
- Pagination (via SearchStream)
- Protobuf deserialization

### Key Patterns

1. **Cost in Micros**: Google Ads returns costs in micros (1,000,000 = $1.00). The `microsToDollars()` utility handles conversion.

2. **Enum Values**: Status, campaign type, etc. are returned as numeric enum values. Parser utilities map these to human-readable strings.

3. **Date Ranges**: GAQL supports both `DURING` presets (LAST_7_DAYS, THIS_MONTH) and explicit `BETWEEN` ranges.

## Available Tools

| # | Tool | GAQL Resource | Description |
|---|------|---------------|-------------|
| 1 | `get-account` | `customer` | Account info (name, currency, timezone) |
| 2 | `get-campaign-performance` | `campaign` | Campaign metrics with budget and bidding info |
| 3 | `get-ad-group-performance` | `ad_group` | Ad group metrics with campaign context |
| 4 | `get-ad-performance` | `ad_group_ad` | Individual ad metrics |
| 5 | `get-keyword-performance` | `keyword_view` | Keyword metrics with quality score |
| 6 | `get-search-terms` | `search_term_view` | Actual search queries triggering ads |
| 7 | `get-asset-group-performance` | `asset_group` | PMAX asset group metrics |
| 8 | `get-conversions` | `conversion_action` + `campaign` | Conversion definitions and metrics |
| 9 | `get-demographic-performance` | `campaign` segments | Age, gender, device breakdowns |
| 10 | `get-budget-analysis` | `campaign` + `campaign_budget` | Budget pacing and utilization |
| 11 | `export-data` | Multiple | Multi-level data export with daily breakdowns |

## File Structure

```
src/
├── index.ts              # Entry point: Express + MCP server
├── config/
│   └── index.ts           # Environment validation (zod)
├── auth/
│   ├── google-oauth.ts    # Google OAuth 2.0 flow
│   ├── device-code.ts     # Device code flow + token stores
│   └── token-store.ts     # Re-exports for convenience
├── lib/
│   ├── google-ads-client.ts  # GAQL query execution, micros conversion
│   ├── parsers.ts            # Enum maps, formatting utilities
│   ├── comparison.ts         # Delta calculation, change classification
│   └── ranking.ts            # Entity ranking, stats calculation
├── middleware/
│   └── auth.ts            # Bearer token + session auth
├── mcp/
│   └── server.ts          # Tool registration re-exports
├── routes/
│   ├── auth.ts            # /auth/google, /auth/callback, /auth/me
│   ├── oauth.ts           # /.well-known/*, /authorize, /token, /register
│   └── health.ts          # /health
└── tools/
    ├── index.ts           # Tool registry
    ├── accounts.ts        # get-account
    ├── campaigns.ts       # get-campaign-performance
    ├── ad-groups.ts       # get-ad-group-performance
    ├── ads.ts             # get-ad-performance
    ├── keywords.ts        # get-keyword-performance
    ├── search-terms.ts    # get-search-terms
    ├── asset-groups.ts    # get-asset-group-performance
    ├── conversions.ts     # get-conversions
    ├── demographic-performance.ts  # get-demographic-performance
    ├── budget-analysis.ts # get-budget-analysis
    └── data-export.ts     # export-data
```

## Deployment

### Railway (Recommended)

- Multi-stage Docker build (Alpine)
- Dockerfile + railway.json configuration
- Health checks every 30 seconds
- Non-root user for security

### Environment Variables

All secrets are passed via environment variables. See `.env.example` for the complete list.

## Security

- OAuth 2.0 with PKCE for authentication
- Bearer tokens with 24-hour expiry
- Non-root container user
- No secrets in version control
- CORS configured for MCP client compatibility
