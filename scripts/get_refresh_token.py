#!/usr/bin/env python3
"""OAuth flow to get refresh token for Google Ads API (no external deps)."""

import json
import os
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, parse_qs, urlparse
from urllib.request import urlopen, Request
from pathlib import Path

# Load .env file manually (no external deps)
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

CLIENT_ID = os.environ["GOOGLE_ADS_CLIENT_ID"]
CLIENT_SECRET = os.environ["GOOGLE_ADS_CLIENT_SECRET"]
REDIRECT_URI = "http://localhost:8080"
SCOPES = "https://www.googleapis.com/auth/adwords"

authorization_code = None

class OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global authorization_code
        query = parse_qs(urlparse(self.path).query)

        if 'code' in query:
            authorization_code = query['code'][0]
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'''
                <html><body style="font-family: system-ui; text-align: center; padding: 50px;">
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                </body></html>
            ''')
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            error = query.get('error', ['Unknown error'])[0]
            self.wfile.write(f'<html><body><h1>Error: {error}</h1></body></html>'.encode())

    def log_message(self, format, *args):
        pass  # Suppress logging

def main():
    # Build authorization URL
    auth_params = {
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': SCOPES,
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent',
    }
    auth_url = f"https://accounts.google.com/o/oauth2/auth?{urlencode(auth_params)}"

    print("\n" + "="*60)
    print("Google Ads API OAuth Flow")
    print("="*60)
    print("\nOpening browser for authorization...")
    print("\nIf browser doesn't open, visit:\n")
    print(auth_url)
    print()

    # Open browser
    webbrowser.open(auth_url)

    # Start local server to catch redirect
    server = HTTPServer(('localhost', 8080), OAuthHandler)
    print("Waiting for authorization...")

    while authorization_code is None:
        server.handle_request()

    server.server_close()

    # Exchange code for tokens
    print("\nExchanging authorization code for tokens...")

    token_data = urlencode({
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': authorization_code,
        'grant_type': 'authorization_code',
        'redirect_uri': REDIRECT_URI
    }).encode()

    req = Request('https://oauth2.googleapis.com/token', data=token_data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')

    try:
        with urlopen(req) as response:
            tokens = json.loads(response.read().decode())
            refresh_token = tokens.get('refresh_token')

            print("\n" + "="*60)
            print("SUCCESS! Here's your refresh token:")
            print("="*60)
            print(f"\n{refresh_token}\n")
            print("Add this to your .env file as GOOGLE_ADS_REFRESH_TOKEN")

            return refresh_token
    except Exception as e:
        print(f"\nError getting tokens: {e}")
        return None

if __name__ == '__main__':
    main()
