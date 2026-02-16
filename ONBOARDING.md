# Team Onboarding Guide - Google Ads MCP

## Quick Start (30 Seconds)

### Option 1: One Command (Recommended)

```bash
claude add <YOUR_DEPLOYED_URL>/mcp
```

Then ask in Claude Code:
```
"Show me campaign performance for last 7 days"
```

Claude will automatically prompt you to authenticate with Google.

---

### Option 2: Manual Configuration

Edit `~/.config/claude-code/mcp.json`:

```json
{
  "mcpServers": {
    "google-ads": {
      "url": "<YOUR_DEPLOYED_URL>/mcp",
      "transport": "http"
    }
  }
}
```

Then restart Claude Code.

---

## Troubleshooting

### "Session not found" or "Connection reset"

**This is normal after server updates!**

**Solution (10 seconds):**
1. Close Claude Code completely
2. Reopen Claude Code
3. Try your query again
4. If prompted, re-authenticate with Google

### Session expired (after 24 hours)

Your session lasts 24 hours. Claude will prompt you to re-authenticate automatically.

### Still having issues?

Check server status:
```bash
curl <YOUR_DEPLOYED_URL>/health
```

---

## What You Can Do

### Campaign Analysis
- "Show me campaign performance for last 7 days"
- "Which campaigns have the highest cost per conversion?"
- "Compare this month vs last month spend"

### Keyword Intelligence
- "What are my top performing keywords?"
- "Show keywords with quality score below 5"
- "Which search terms are driving the most conversions?"

### Budget Monitoring
- "How's my budget pacing this month?"
- "Which campaigns are underspending?"
- "Show budget utilization across all campaigns"

### Conversion Tracking
- "Show me conversion metrics by campaign"
- "What conversion actions are configured?"
- "Which campaigns have the best conversion rates?"

### PMAX Analysis
- "Show Performance Max asset group performance"
- "Which asset groups should I pause?"

---

## Security Notes

- Each team member authenticates with **their own Google account**
- Sessions are isolated per user
- All data is encrypted in transit (HTTPS)
- Sessions expire after 24 hours
