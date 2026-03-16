/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * Handles client registration for MCP OAuth flow.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/index.js';
import { generateAccessToken } from '../auth/device-code.js';

const router: Router = Router();

function getBaseUrl(req: Request): string {
  if (env.NODE_ENV === 'production') {
    const callbackUrl = new URL(env.GOOGLE_OAUTH_CALLBACK_URL!);
    return `${callbackUrl.protocol}//${callbackUrl.host}`;
  }
  return `${req.protocol}://${req.get('host')}`;
}

// Store for authorization codes
interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
  userId?: string;
  email?: string;
  name?: string;
}

export const authorizationCodes = new Map<string, AuthorizationCode>();

/**
 * GET /.well-known/oauth-authorization-server
 */
router.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    grant_types_supported: ['authorization_code'],
    response_types_supported: ['code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256', 'plain'],
    service_documentation: `${baseUrl}/health`,
  });
});

/**
 * GET /authorize
 * OAuth 2.0 Authorization Code flow with PKCE
 */
router.get('/authorize', (req: Request, res: Response) => {
  const { response_type, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.query;

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'unsupported_response_type' });
  }

  if (!client_id || !redirect_uri) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing client_id or redirect_uri' });
  }

  req.session.authRequest = {
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    state: state as string,
    codeChallenge: code_challenge as string,
    codeChallengeMethod: (code_challenge_method as string) || 'plain',
  };

  // Redirect to Google OAuth
  const googleState = `oauth:${state || ''}`;
  res.redirect(`/auth/google?state=${encodeURIComponent(googleState)}`);
});

/**
 * POST /token
 * Exchange authorization code for access token
 */
router.post('/token', async (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  if (!code || !redirect_uri || !client_id) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const authCode = authorizationCodes.get(code);
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
  }

  if (authCode.expiresAt < new Date()) {
    authorizationCodes.delete(code);
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code has expired' });
  }

  if (authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Client ID or redirect URI mismatch' });
  }

  // Validate PKCE
  if (authCode.codeChallenge) {
    if (!code_verifier) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier required' });
    }

    const method = authCode.codeChallengeMethod || 'plain';
    const computed = method === 'S256'
      ? crypto.createHash('sha256').update(code_verifier).digest('base64url')
      : code_verifier;

    if (computed !== authCode.codeChallenge) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid code_verifier' });
    }
  }

  authorizationCodes.delete(code);

  const accessToken = generateAccessToken();

  global.accessTokenStore.set(accessToken, {
    userId: authCode.userId!,
    email: authCode.email!,
    name: authCode.name!,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 24 * 60 * 60,
  });
});

/**
 * POST /register
 * Dynamic Client Registration
 */
router.post('/register', (req: Request, res: Response) => {
  const clientMetadata = req.body;
  const clientId = `mcp_client_${crypto.randomBytes(16).toString('hex')}`;
  const clientSecret = crypto.randomBytes(32).toString('hex');
  const baseUrl = getBaseUrl(req);

  res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    client_name: clientMetadata?.client_name || 'MCP Client',
    redirect_uris: clientMetadata?.redirect_uris || [],
    grant_types: ['authorization_code'],
    token_endpoint_auth_method: 'none',
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    oauth_authorization_server: `${baseUrl}/.well-known/oauth-authorization-server`,
  });
});

export default router;
