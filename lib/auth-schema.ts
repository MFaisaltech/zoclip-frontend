// Generated from backend/docs/openapi.json. Do not edit.
// Source SHA-256: b5031ab0bc1ebcfb1f61056d946a3275424351335f9d1b8941975ffabe2837a7
export interface AuthSchemas {
  "Problem": { "type": string; "title": string; "status": number; "code": string; "detail": string; "instance": string; "request_id": string }
  "CsrfResponse": { "csrf_token": string }
  "Me": { "id": string; "email": string; "verified": boolean; "role": "customer" | "admin"; "created_at": string }
  "Credentials": { "email": string; "password": string }
  "Message": { "message": string }
  "TokenInput": { "token": string }
  "LoginResponse": { "user": AuthSchemas["Me"]; "csrf_token": string }
  "EmailInput": { "email": string }
  "ResetInput": { "token": string; "password": string }
  "InviteInput": { "token": string; "password": string }
}

export interface AuthOperations {
  "GET /api/v1/auth/csrf": { request: never; response: AuthSchemas["CsrfResponse"] }
  "GET /api/v1/me": { request: never; response: AuthSchemas["Me"] }
  "POST /api/v1/auth/register": { request: AuthSchemas["Credentials"]; response: AuthSchemas["Message"] }
  "POST /api/v1/auth/verify-email": { request: AuthSchemas["TokenInput"]; response: AuthSchemas["Message"] }
  "POST /api/v1/auth/login": { request: AuthSchemas["Credentials"]; response: AuthSchemas["LoginResponse"] }
  "POST /api/v1/auth/logout": { request: never; response: AuthSchemas["Message"] }
  "POST /api/v1/auth/session/rotate": { request: never; response: AuthSchemas["CsrfResponse"] }
  "POST /api/v1/auth/password/forgot": { request: AuthSchemas["EmailInput"]; response: AuthSchemas["Message"] }
  "POST /api/v1/auth/password/reset": { request: AuthSchemas["ResetInput"]; response: AuthSchemas["Message"] }
  "POST /api/v1/auth/invite/accept": { request: AuthSchemas["InviteInput"]; response: AuthSchemas["Message"] }
}

export const authFieldLimits = {
  "email": {
    "maxLength": 320
  },
  "password": {
    "minLength": 12,
    "maxLength": 128
  },
  "token": {
    "minLength": 32,
    "maxLength": 128
  }
} as const
