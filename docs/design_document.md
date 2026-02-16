# Google Ads API Design Document
## Superpower - Internal Campaign Management Tool

---

### 1. Company Overview

**Company Name:** Superpower
**Contact Email:** jeff@superpower.com
**Website:** superpower.com

Superpower is a technology company that manages Google Ads campaigns to promote its products and services.

---

### 2. Tool Purpose

We are developing an internal tool to programmatically manage and monitor our Google Ads campaigns. The tool will be used exclusively by internal team members to:

1. **Campaign Reporting** - Retrieve performance metrics (impressions, clicks, conversions, cost) across campaigns, ad groups, and ads
2. **Campaign Management** - Monitor campaign status, budgets, and make adjustments as needed
3. **Performance Analysis** - Analyze campaign performance over different time periods to optimize ad spend

---

### 3. Technical Architecture

**System Components:**

```
+---------------------+
|   Internal User     |
|  (Superpower Team)  |
+----------+----------+
           |
           v
+---------------------+
|   MCP Server        |
|  (StreamableHTTP)   |
+----------+----------+
           |
           v
+---------------------+
|  Google Ads API     |
|  (v18+)             |
+----------+----------+
           |
           v
+---------------------+
|  Superpower MCC     |
|  (846-107-5268)     |
|         |           |
|         v           |
|  Superpower Ads     |
|  (861-809-6874)     |
+---------------------+
```

**Data Flow:**
- Internal users interact with the MCP server through Claude Code CLI
- MCP server authenticates via OAuth 2.0 and makes API calls
- Data is retrieved from Google Ads API and displayed to users
- No data is stored externally; all queries are real-time

---

### 4. API Services Used

| Service | Purpose |
|---------|---------|
| GoogleAdsService | Query campaigns, ad groups, ads, and metrics via GAQL |
| CustomerService | List accessible customer accounts |
| CampaignService | Retrieve and manage campaign settings |

---

### 5. Access Controls

**User Access:**
- Only internal Superpower team members have access to the tool
- Authentication is handled via Google OAuth 2.0
- The tool operates under a Manager Account (MCC) for centralized access

**Data Access:**
- The tool only accesses Superpower's own Google Ads accounts
- No third-party or client accounts are accessed
- No customer data is shared externally

---

### 6. Supported Campaign Types

- Search campaigns
- Performance Max campaigns
- Display campaigns
- Dynamic Search Ads (DSA)

---

### 7. Key Features

1. **List Campaigns** - View all campaigns with status, budget, and performance metrics
2. **Campaign Performance Reports** - Retrieve metrics by date range
3. **Ad Group Analysis** - Drill down into ad group performance
4. **Keyword Performance** - Analyze keyword-level metrics
5. **Search Term Reports** - View actual search terms triggering ads
6. **Asset Group Performance** - PMAX asset group analysis
7. **Budget Monitoring** - Track spend against budgets
8. **Conversion Tracking** - Monitor conversion actions and metrics

---

### 8. Security & Compliance

- OAuth 2.0 credentials stored securely in environment variables
- No credentials committed to version control
- Developer token used only for authorized Superpower accounts
- All API access logged by Google Ads

---

### 9. Rate Limits & Best Practices

- Tool respects Google Ads API rate limits
- Queries are optimized to minimize API calls
- Uses SearchStream for efficient data retrieval
- No automated bulk operations without user confirmation

---

**Document Version:** 1.0
**Last Updated:** February 2026
