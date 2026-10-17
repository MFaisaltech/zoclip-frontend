// Generated from backend/docs/openapi.json. Do not edit.
// Source SHA-256: b7deca3dfd32dce14ad9c43d69d26cc9a72147d9a452dccc2227102834196c64
export interface MediaSchemas {
  "UploadInput": { "size_bytes": number; "sha256": string; "rights_attested": true }
  "UploadView": { "id": string; "video_id": string; "state": string; "expected_bytes": number; "part_bytes": number; "expires_at": string; "received_parts"?: Array<number> }
  "PartView": { "number": number; "size_bytes": number; "sha256": string }
  "JobView": { "id": string; "video_id": string; "kind": string; "state": string; "error_code": string | null; "attempts": number; "created_at": string; "updated_at": string; "stage": string; "progress_percent": number | null; "estimated_credits": number | null; "heartbeat_at": string | null; "queue_position"?: null; "reservation_id": string | null }
  "ImportInput": { "url": string; "max_bytes": number; "rights_attested": true }
  "QuoteInput": { "source_seconds": number; "output_count": number; "edit_count"?: number; "captions"?: boolean; "reframe"?: boolean }
  "QuoteView": { "id": string; "price_version_id": string; "credits": number; "request": MediaSchemas["QuoteInput"]; "expires_at": string }
  "QuotePreviewView": { "preview_only"?: true; "processing_enabled"?: false; "pricing_status": "unconfigured" | "unapproved" | "configured"; "price_version_id": string | null; "credits": number | null; "request": MediaSchemas["QuoteInput"] }
  "GenerateInput": { "quote_id": string; "auto_render"?: boolean }
  "VideoView": { "id": string; "project_id": string; "state": string; "metadata_json": Record<string, unknown>; "created_at": string; "expires_at": string }
  "EventView": { "state": string; "code": string | null; "created_at": string }
  "TranscriptView": { "id": string; "video_id": string; "job_id": string; "model": string; "language": string; "created_at": string; "data": MediaSchemas["TranscriptData"] }
  "SuggestionsView": { "job_id": string; "state": string; "stage": string; "error_code": string | null; "items": Array<MediaSchemas["SuggestionView"]>; "rendered"?: boolean }
  "CreateClip": { "suggestion_id": string }
  "ClipView": { "id": string; "video_id": string; "job_id": string; "revision": number; "preferences": MediaSchemas["Preferences"]; "created_at": string }
  "Preferences": { "start_ms": number; "end_ms": number; "title"?: string; "hashtags"?: Array<string>; "captions"?: boolean; "preset"?: "classic" | "bold" | "karaoke"; "font"?: "DejaVu Sans" | "Noto Sans" | "Noto Naskh Arabic"; "placement"?: "bottom" | "middle" | "top"; "frame"?: "track" | "center" | "pad" | "manual"; "focal_x"?: number; "focal_y"?: number; "words"?: Array<MediaSchemas["CaptionWord"]> | null }
  "Selection": { "clip_ids": Array<string> }
  "RenderInput": { "quote_id"?: string | null; "revision": number }
  "OutputView": { "id": string; "clip_id": string; "revision": number; "job_id": string; "state": string; "metadata": Record<string, unknown>; "created_at": string }
  "BillingOverview": { "plan": MediaSchemas["PlanView"] | null; "access_source": "entitlement" | "free_default" | "unconfigured"; "access_ends_at": string | null; "day_starts_at": string; "month_starts_at": string; "daily_used_credits": number; "monthly_used_credits": number; "held_credits": number; "held_reservations": number; "settled_credits": number; "released_credits": number; "checkout_available"?: false; "checkout_reason"?: "Merchant checkout is not available. No purchase will be created."; "auto_renews"?: false }
  "ReservationPage": { "items": Array<MediaSchemas["ReservationView"]>; "next_cursor": string | null }
  "OrderPage": { "items": Array<MediaSchemas["OrderView"]>; "next_cursor": string | null }
  "AdminOverview": { "customers": number; "verified_customers": number; "available_credits": number; "reserved_credits": number; "active_prepaid_access": number; "job_states": Record<string, number>; "spending_blocked": boolean; "checkout_available"?: false }
  "CustomerPage": { "items": Array<MediaSchemas["CustomerView"]>; "next_cursor": string | null }
  "StaffJobPage": { "items": Array<MediaSchemas["StaffJob"]>; "next_cursor": string | null }
  "UsageView": { "estimated_usd": string; "actual_usd": string; "held_or_unknown_usd": string; "attempts": number }
  "PolicyView": { "id": string; "limits": MediaSchemas["BudgetLimits-Output"]; "breaker": boolean }
  "AuditPage": { "items": Array<MediaSchemas["AuditView"]>; "next_cursor"?: string | null }
  "StaffOrderView": { "order": MediaSchemas["OrderView"]; "user_id": string; "reference": string; "refund": MediaSchemas["RefundView"] | null }
  "AdjustmentInput": { "amount": number; "reason": string }
  "TransactionView": { "id": string; "operation": string; "available_delta": number; "reserved_delta": number; "available_after": number; "reserved_after": number; "reservation_id": string | null; "created_at": string }
  "PlanVersionInput": { "price_paisa": number; "included_credits": number; "valid_days": 0 | 30; "approved"?: boolean; "rules": MediaSchemas["ConsumptionRules"]; "reason": string }
  "PriceView": { "id": string; "price_paisa": number; "included_credits": number; "valid_days": number; "approved": boolean; "rules": MediaSchemas["ConsumptionRules"] }
  "EntitlementInput": { "price_version_id": string; "reason": string }
  "EntitlementView": { "id": string; "price_version_id": string; "starts_at": string; "ends_at": string | null; "active": boolean }
  "TranscriptData": { "text": string; "words": Array<MediaSchemas["Word"]>; "confidence": number; "duration_seconds": number; "utterances"?: Array<Record<string, unknown>> }
  "SuggestionView": { "start_sec": number; "end_sec": number; "title": string; "hook": string; "reason": string; "score": number; "keywords": Array<string>; "hashtags": Array<string>; "id": string; "rank": number; "job_id": string; "transcript_id": string }
  "CaptionWord": { "text": string; "start_ms": number; "end_ms": number }
  "PlanView": { "id": string; "slug": string; "kind": string; "enabled": boolean; "currency"?: "PKR"; "auto_renews"?: false; "credit_expiry"?: "disabled"; "price": MediaSchemas["PriceView"] | null }
  "ReservationView": { "id": string; "job_id": string; "credits": number; "state": string; "created_at": string; "updated_at": string }
  "OrderView": { "id": string; "price_version_id": string; "provider": string; "amount_paisa": number; "currency": "PKR"; "credits": number; "valid_days": number; "state": string; "expires_at": string; "paid_at": string | null; "created_at": string; "sandbox"?: true; "auto_renews"?: false }
  "CustomerView": { "id": string; "email": string; "status": string; "verified": boolean; "created_at": string; "available_credits": number; "reserved_credits": number }
  "StaffJob": { "user_id": string; "job": MediaSchemas["JobView"] }
  "BudgetLimits-Output": { "per_job_usd": string; "user_daily_usd": string; "user_monthly_usd": string; "global_daily_usd": string; "global_monthly_usd": string; "max_open_reservations": number; "rate_ids": Array<string>; "input_tokens_per_second": number; "max_output_tokens": number; "render_cpu_seconds_per_output": number; "storage_gb_days_per_output": number; "max_attempts_per_job": number }
  "AuditView": { "id": string; "actor_id": string | null; "action": string; "target_id": string | null; "request_id": string; "created_at": string }
  "RefundView": { "id": string; "order_id": string; "kind": string; "amount_paisa": number; "recovered_credits": number; "unrecovered_credits": number }
  "ConsumptionRules": { "minimum_job_credits"?: number; "credits_per_minute": number; "credits_per_output": number; "credits_per_edit": number; "captions_credits": number; "reframe_credits": number; "max_source_seconds": number; "max_outputs": number; "max_edits": number; "max_concurrent_jobs": number; "daily_credits": number; "monthly_credits": number }
  "Word": { "word": string; "punctuated_word": string; "start": number; "end": number; "confidence": number; "speaker"?: number | null }
}
export interface MediaOperations {
  initiate: { request: MediaSchemas["UploadInput"]; response: MediaSchemas["UploadView"] }
  upload: { request: null; response: MediaSchemas["UploadView"] }
  part: { request: null; response: MediaSchemas["PartView"] }
  complete: { request: null; response: MediaSchemas["JobView"] }
  deleteUpload: { request: null; response: null }
  importUrl: { request: MediaSchemas["ImportInput"]; response: MediaSchemas["JobView"] }
  quote: { request: MediaSchemas["QuoteInput"]; response: MediaSchemas["QuoteView"] }
  quotePreview: { request: MediaSchemas["QuoteInput"]; response: MediaSchemas["QuotePreviewView"] }
  generate: { request: MediaSchemas["GenerateInput"]; response: MediaSchemas["JobView"] }
  video: { request: null; response: MediaSchemas["VideoView"] }
  job: { request: null; response: MediaSchemas["JobView"] }
  events: { request: null; response: Array<MediaSchemas["EventView"]> }
  cancel: { request: null; response: MediaSchemas["JobView"] }
  transcript: { request: null; response: MediaSchemas["TranscriptView"] }
  suggestions: { request: null; response: MediaSchemas["SuggestionsView"] }
  createClip: { request: MediaSchemas["CreateClip"]; response: MediaSchemas["ClipView"] }
  clip: { request: null; response: MediaSchemas["ClipView"] }
  editClip: { request: MediaSchemas["Preferences"]; response: MediaSchemas["ClipView"] }
  selectClips: { request: MediaSchemas["Selection"]; response: MediaSchemas["JobView"] }
  renderClip: { request: MediaSchemas["RenderInput"]; response: MediaSchemas["JobView"] }
  outputs: { request: null; response: Array<MediaSchemas["OutputView"]> }
  download: { request: null; response: Blob }
  billingOverview: { request: null; response: MediaSchemas["BillingOverview"] }
  reservations: { request: null; response: MediaSchemas["ReservationPage"] }
  billingHistory: { request: null; response: MediaSchemas["OrderPage"] }
  adminOverview: { request: null; response: MediaSchemas["AdminOverview"] }
  customers: { request: null; response: MediaSchemas["CustomerPage"] }
  customerBilling: { request: null; response: MediaSchemas["BillingOverview"] }
  staffJobs: { request: null; response: MediaSchemas["StaffJobPage"] }
  usageCosts: { request: null; response: MediaSchemas["UsageView"] }
  limits: { request: null; response: MediaSchemas["PolicyView"] | null }
  audits: { request: null; response: MediaSchemas["AuditPage"] }
  payments: { request: null; response: Array<MediaSchemas["StaffOrderView"]> }
  adjustCredits: { request: MediaSchemas["AdjustmentInput"]; response: MediaSchemas["TransactionView"] }
  configurePlan: { request: MediaSchemas["PlanVersionInput"]; response: MediaSchemas["PriceView"] }
  grantAccess: { request: MediaSchemas["EntitlementInput"]; response: MediaSchemas["EntitlementView"] }
}
export const mediaDescriptors = {
  "initiate": {
    "path": "/api/v1/uploads",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/UploadView"
    },
    "request": {
      "$ref": "#/components/schemas/UploadInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "upload": {
    "path": "/api/v1/uploads/{upload_id}",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/UploadView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "part": {
    "path": "/api/v1/uploads/{upload_id}/parts/{part_number}",
    "method": "PUT",
    "response": {
      "$ref": "#/components/schemas/PartView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": true
  },
  "complete": {
    "path": "/api/v1/uploads/{upload_id}/complete",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "deleteUpload": {
    "path": "/api/v1/uploads/{upload_id}",
    "method": "DELETE",
    "response": {
      "type": "null"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "importUrl": {
    "path": "/api/v1/videos/import-url",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "$ref": "#/components/schemas/ImportInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "quote": {
    "path": "/api/v1/jobs/quote",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/QuoteView"
    },
    "request": {
      "$ref": "#/components/schemas/QuoteInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "quotePreview": {
    "path": "/api/v1/jobs/quote-preview",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/QuotePreviewView"
    },
    "request": {
      "$ref": "#/components/schemas/QuoteInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "generate": {
    "path": "/api/v1/videos/{video_id}/generate",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "$ref": "#/components/schemas/GenerateInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "video": {
    "path": "/api/v1/videos/{video_id}",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/VideoView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "job": {
    "path": "/api/v1/jobs/{job_id}",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "events": {
    "path": "/api/v1/jobs/{job_id}/events",
    "method": "GET",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/EventView"
      },
      "title": "Response Events Api V1 Jobs  Job Id  Events Get"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "before"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "cancel": {
    "path": "/api/v1/jobs/{job_id}/cancel",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "transcript": {
    "path": "/api/v1/videos/{video_id}/transcript",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/TranscriptView"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "job_id"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "suggestions": {
    "path": "/api/v1/videos/{video_id}/suggestions",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/SuggestionsView"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "job_id",
      "limit"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "createClip": {
    "path": "/api/v1/clips",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/ClipView"
    },
    "request": {
      "$ref": "#/components/schemas/CreateClip"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "clip": {
    "path": "/api/v1/clips/{clip_id}",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/ClipView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "editClip": {
    "path": "/api/v1/clips/{clip_id}",
    "method": "PATCH",
    "response": {
      "$ref": "#/components/schemas/ClipView"
    },
    "request": {
      "$ref": "#/components/schemas/Preferences"
    },
    "queries": [],
    "revisionHeader": true,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "selectClips": {
    "path": "/api/v1/jobs/{job_id}/renders",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "$ref": "#/components/schemas/Selection"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "renderClip": {
    "path": "/api/v1/clips/{clip_id}/render",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/JobView"
    },
    "request": {
      "$ref": "#/components/schemas/RenderInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "outputs": {
    "path": "/api/v1/clips/{clip_id}/renders",
    "method": "GET",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/OutputView"
      },
      "title": "Response Outputs Api V1 Clips  Clip Id  Renders Get"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "download": {
    "path": "/api/v1/clips/{clip_id}/download",
    "method": "GET",
    "response": {
      "type": "null"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "revision"
    ],
    "revisionHeader": false,
    "download": true,
    "idempotent": false,
    "binary": false
  },
  "billingOverview": {
    "path": "/api/v1/me/billing",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/BillingOverview"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "reservations": {
    "path": "/api/v1/me/credit-reservations",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/ReservationPage"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "cursor"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "billingHistory": {
    "path": "/api/v1/billing/history",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/OrderPage"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "cursor"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "adminOverview": {
    "path": "/api/v1/admin/dashboard",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/AdminOverview"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "customers": {
    "path": "/api/v1/admin/customers",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/CustomerPage"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "cursor",
      "search"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "customerBilling": {
    "path": "/api/v1/admin/customers/{user_id}/billing",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/BillingOverview"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "staffJobs": {
    "path": "/api/v1/admin/jobs",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/StaffJobPage"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "cursor"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "usageCosts": {
    "path": "/api/v1/admin/usage-costs",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/UsageView"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "limits": {
    "path": "/api/v1/admin/limits",
    "method": "GET",
    "response": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/PolicyView"
        },
        {
          "type": "null"
        }
      ],
      "title": "Response Current Limits Api V1 Admin Limits Get"
    },
    "request": {
      "type": "null"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "audits": {
    "path": "/api/v1/admin/audit-logs",
    "method": "GET",
    "response": {
      "$ref": "#/components/schemas/AuditPage"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "cursor"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "payments": {
    "path": "/api/v1/admin/payments",
    "method": "GET",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/StaffOrderView"
      },
      "title": "Response Staff Payments Api V1 Admin Payments Get"
    },
    "request": {
      "type": "null"
    },
    "queries": [
      "limit",
      "cursor"
    ],
    "revisionHeader": false,
    "download": false,
    "idempotent": false,
    "binary": false
  },
  "adjustCredits": {
    "path": "/api/v1/admin/users/{user_id}/credit-adjustments",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/TransactionView"
    },
    "request": {
      "$ref": "#/components/schemas/AdjustmentInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "configurePlan": {
    "path": "/api/v1/admin/plans/{plan_id}/versions",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/PriceView"
    },
    "request": {
      "$ref": "#/components/schemas/PlanVersionInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  },
  "grantAccess": {
    "path": "/api/v1/admin/users/{user_id}/entitlements",
    "method": "POST",
    "response": {
      "$ref": "#/components/schemas/EntitlementView"
    },
    "request": {
      "$ref": "#/components/schemas/EntitlementInput"
    },
    "queries": [],
    "revisionHeader": false,
    "download": false,
    "idempotent": true,
    "binary": false
  }
} as const
export const mediaDefinitions = {
  "UploadInput": {
    "properties": {
      "size_bytes": {
        "type": "integer",
        "maximum": 4294967296,
        "exclusiveMinimum": 0,
        "title": "Size Bytes"
      },
      "sha256": {
        "type": "string",
        "pattern": "^[a-f0-9]{64}$",
        "title": "Sha256"
      },
      "rights_attested": {
        "type": "boolean",
        "const": true,
        "title": "Rights Attested"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "size_bytes",
      "sha256",
      "rights_attested"
    ],
    "title": "UploadInput"
  },
  "UploadView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "video_id": {
        "type": "string",
        "format": "uuid",
        "title": "Video Id"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "expected_bytes": {
        "type": "integer",
        "title": "Expected Bytes"
      },
      "part_bytes": {
        "type": "integer",
        "title": "Part Bytes"
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At"
      },
      "received_parts": {
        "items": {
          "type": "integer"
        },
        "type": "array",
        "title": "Received Parts",
        "default": []
      }
    },
    "type": "object",
    "required": [
      "id",
      "video_id",
      "state",
      "expected_bytes",
      "part_bytes",
      "expires_at"
    ],
    "title": "UploadView"
  },
  "PartView": {
    "properties": {
      "number": {
        "type": "integer",
        "title": "Number"
      },
      "size_bytes": {
        "type": "integer",
        "title": "Size Bytes"
      },
      "sha256": {
        "type": "string",
        "pattern": "^[a-f0-9]{64}$",
        "title": "Sha256"
      }
    },
    "type": "object",
    "required": [
      "number",
      "size_bytes",
      "sha256"
    ],
    "title": "PartView"
  },
  "JobView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "video_id": {
        "type": "string",
        "format": "uuid",
        "title": "Video Id"
      },
      "kind": {
        "type": "string",
        "title": "Kind"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "error_code": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Error Code"
      },
      "attempts": {
        "type": "integer",
        "title": "Attempts"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time",
        "title": "Updated At"
      },
      "stage": {
        "type": "string",
        "title": "Stage"
      },
      "progress_percent": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Progress Percent"
      },
      "estimated_credits": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Estimated Credits"
      },
      "heartbeat_at": {
        "anyOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "null"
          }
        ],
        "title": "Heartbeat At"
      },
      "queue_position": {
        "type": "null",
        "title": "Queue Position"
      },
      "reservation_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Reservation Id"
      }
    },
    "type": "object",
    "required": [
      "id",
      "video_id",
      "kind",
      "state",
      "error_code",
      "attempts",
      "created_at",
      "updated_at",
      "stage",
      "progress_percent",
      "estimated_credits",
      "heartbeat_at",
      "reservation_id"
    ],
    "title": "JobView"
  },
  "ImportInput": {
    "properties": {
      "url": {
        "type": "string",
        "maxLength": 2048,
        "minLength": 1,
        "format": "password",
        "title": "Url",
        "writeOnly": true
      },
      "max_bytes": {
        "type": "integer",
        "maximum": 4294967296,
        "exclusiveMinimum": 0,
        "title": "Max Bytes"
      },
      "rights_attested": {
        "type": "boolean",
        "const": true,
        "title": "Rights Attested"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "url",
      "max_bytes",
      "rights_attested"
    ],
    "title": "ImportInput"
  },
  "QuoteInput": {
    "properties": {
      "source_seconds": {
        "type": "integer",
        "maximum": 7200,
        "minimum": 1,
        "title": "Source Seconds"
      },
      "output_count": {
        "type": "integer",
        "maximum": 100,
        "minimum": 1,
        "title": "Output Count"
      },
      "edit_count": {
        "type": "integer",
        "maximum": 100,
        "minimum": 0,
        "title": "Edit Count",
        "default": 0
      },
      "captions": {
        "type": "boolean",
        "title": "Captions",
        "default": true
      },
      "reframe": {
        "type": "boolean",
        "title": "Reframe",
        "default": true
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "source_seconds",
      "output_count"
    ],
    "title": "QuoteInput"
  },
  "QuoteView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "price_version_id": {
        "type": "string",
        "format": "uuid",
        "title": "Price Version Id"
      },
      "credits": {
        "type": "integer",
        "title": "Credits"
      },
      "request": {
        "$ref": "#/components/schemas/QuoteInput"
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "price_version_id",
      "credits",
      "request",
      "expires_at"
    ],
    "title": "QuoteView"
  },
  "QuotePreviewView": {
    "properties": {
      "preview_only": {
        "type": "boolean",
        "const": true,
        "title": "Preview Only",
        "default": true
      },
      "processing_enabled": {
        "type": "boolean",
        "const": false,
        "title": "Processing Enabled",
        "default": false
      },
      "pricing_status": {
        "type": "string",
        "enum": [
          "unconfigured",
          "unapproved",
          "configured"
        ],
        "title": "Pricing Status"
      },
      "price_version_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Price Version Id"
      },
      "credits": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "null"
          }
        ],
        "title": "Credits"
      },
      "request": {
        "$ref": "#/components/schemas/QuoteInput"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "pricing_status",
      "price_version_id",
      "credits",
      "request"
    ],
    "title": "QuotePreviewView",
    "description": "Non-redeemable preview: no quote ID, allowance, or reservation."
  },
  "GenerateInput": {
    "properties": {
      "quote_id": {
        "type": "string",
        "format": "uuid",
        "title": "Quote Id"
      },
      "auto_render": {
        "type": "boolean",
        "title": "Auto Render",
        "default": false
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "quote_id"
    ],
    "title": "GenerateInput"
  },
  "VideoView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "project_id": {
        "type": "string",
        "format": "uuid",
        "title": "Project Id"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "metadata_json": {
        "additionalProperties": true,
        "type": "object",
        "title": "Metadata Json"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At"
      }
    },
    "type": "object",
    "required": [
      "id",
      "project_id",
      "state",
      "metadata_json",
      "created_at",
      "expires_at"
    ],
    "title": "VideoView"
  },
  "EventView": {
    "properties": {
      "state": {
        "type": "string",
        "title": "State"
      },
      "code": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Code"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "type": "object",
    "required": [
      "state",
      "code",
      "created_at"
    ],
    "title": "EventView"
  },
  "TranscriptView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "video_id": {
        "type": "string",
        "format": "uuid",
        "title": "Video Id"
      },
      "job_id": {
        "type": "string",
        "format": "uuid",
        "title": "Job Id"
      },
      "model": {
        "type": "string",
        "title": "Model"
      },
      "language": {
        "type": "string",
        "title": "Language"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "data": {
        "$ref": "#/components/schemas/TranscriptData"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "video_id",
      "job_id",
      "model",
      "language",
      "created_at",
      "data"
    ],
    "title": "TranscriptView"
  },
  "SuggestionsView": {
    "properties": {
      "job_id": {
        "type": "string",
        "format": "uuid",
        "title": "Job Id"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "stage": {
        "type": "string",
        "title": "Stage"
      },
      "error_code": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "null"
          }
        ],
        "title": "Error Code"
      },
      "items": {
        "items": {
          "$ref": "#/components/schemas/SuggestionView"
        },
        "type": "array",
        "title": "Items"
      },
      "rendered": {
        "type": "boolean",
        "title": "Rendered",
        "default": false
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "job_id",
      "state",
      "stage",
      "error_code",
      "items"
    ],
    "title": "SuggestionsView"
  },
  "CreateClip": {
    "properties": {
      "suggestion_id": {
        "type": "string",
        "format": "uuid",
        "title": "Suggestion Id"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "suggestion_id"
    ],
    "title": "CreateClip"
  },
  "ClipView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "video_id": {
        "type": "string",
        "format": "uuid",
        "title": "Video Id"
      },
      "job_id": {
        "type": "string",
        "format": "uuid",
        "title": "Job Id"
      },
      "revision": {
        "type": "integer",
        "title": "Revision"
      },
      "preferences": {
        "$ref": "#/components/schemas/Preferences"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "video_id",
      "job_id",
      "revision",
      "preferences",
      "created_at"
    ],
    "title": "ClipView"
  },
  "Preferences": {
    "properties": {
      "start_ms": {
        "type": "integer",
        "maximum": 7200000,
        "minimum": 0,
        "title": "Start Ms"
      },
      "end_ms": {
        "type": "integer",
        "maximum": 7200000,
        "minimum": 0,
        "title": "End Ms"
      },
      "title": {
        "type": "string",
        "maxLength": 160,
        "title": "Title",
        "default": ""
      },
      "hashtags": {
        "items": {
          "type": "string",
          "maxLength": 60
        },
        "type": "array",
        "maxItems": 10,
        "title": "Hashtags"
      },
      "captions": {
        "type": "boolean",
        "title": "Captions",
        "default": true
      },
      "preset": {
        "type": "string",
        "enum": [
          "classic",
          "bold",
          "karaoke"
        ],
        "title": "Preset",
        "default": "karaoke"
      },
      "font": {
        "type": "string",
        "enum": [
          "DejaVu Sans",
          "Noto Sans",
          "Noto Naskh Arabic"
        ],
        "title": "Font",
        "default": "DejaVu Sans"
      },
      "placement": {
        "type": "string",
        "enum": [
          "bottom",
          "middle",
          "top"
        ],
        "title": "Placement",
        "default": "bottom"
      },
      "frame": {
        "type": "string",
        "enum": [
          "track",
          "center",
          "pad",
          "manual"
        ],
        "title": "Frame",
        "default": "track"
      },
      "focal_x": {
        "type": "integer",
        "maximum": 1000,
        "minimum": 0,
        "title": "Focal X",
        "default": 500
      },
      "focal_y": {
        "type": "integer",
        "maximum": 1000,
        "minimum": 0,
        "title": "Focal Y",
        "default": 500
      },
      "words": {
        "anyOf": [
          {
            "items": {
              "$ref": "#/components/schemas/CaptionWord"
            },
            "type": "array",
            "maxItems": 1000
          },
          {
            "type": "null"
          }
        ],
        "title": "Words"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "start_ms",
      "end_ms"
    ],
    "title": "Preferences"
  },
  "Selection": {
    "properties": {
      "clip_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 20,
        "minItems": 1,
        "title": "Clip Ids"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "clip_ids"
    ],
    "title": "Selection"
  },
  "RenderInput": {
    "properties": {
      "quote_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Quote Id"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "title": "Revision"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "revision"
    ],
    "title": "RenderInput"
  },
  "OutputView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "clip_id": {
        "type": "string",
        "format": "uuid",
        "title": "Clip Id"
      },
      "revision": {
        "type": "integer",
        "title": "Revision"
      },
      "job_id": {
        "type": "string",
        "format": "uuid",
        "title": "Job Id"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "metadata": {
        "additionalProperties": true,
        "type": "object",
        "title": "Metadata"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "clip_id",
      "revision",
      "job_id",
      "state",
      "metadata",
      "created_at"
    ],
    "title": "OutputView"
  },
  "BillingOverview": {
    "properties": {
      "plan": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PlanView"
          },
          {
            "type": "null"
          }
        ]
      },
      "access_source": {
        "type": "string",
        "enum": [
          "entitlement",
          "free_default",
          "unconfigured"
        ],
        "title": "Access Source"
      },
      "access_ends_at": {
        "anyOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "null"
          }
        ],
        "title": "Access Ends At"
      },
      "day_starts_at": {
        "type": "string",
        "format": "date-time",
        "title": "Day Starts At"
      },
      "month_starts_at": {
        "type": "string",
        "format": "date-time",
        "title": "Month Starts At"
      },
      "daily_used_credits": {
        "type": "integer",
        "title": "Daily Used Credits"
      },
      "monthly_used_credits": {
        "type": "integer",
        "title": "Monthly Used Credits"
      },
      "held_credits": {
        "type": "integer",
        "title": "Held Credits"
      },
      "held_reservations": {
        "type": "integer",
        "title": "Held Reservations"
      },
      "settled_credits": {
        "type": "integer",
        "title": "Settled Credits"
      },
      "released_credits": {
        "type": "integer",
        "title": "Released Credits"
      },
      "checkout_available": {
        "type": "boolean",
        "const": false,
        "title": "Checkout Available",
        "default": false
      },
      "checkout_reason": {
        "type": "string",
        "const": "Merchant checkout is not available. No purchase will be created.",
        "title": "Checkout Reason",
        "default": "Merchant checkout is not available. No purchase will be created."
      },
      "auto_renews": {
        "type": "boolean",
        "const": false,
        "title": "Auto Renews",
        "default": false
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "plan",
      "access_source",
      "access_ends_at",
      "day_starts_at",
      "month_starts_at",
      "daily_used_credits",
      "monthly_used_credits",
      "held_credits",
      "held_reservations",
      "settled_credits",
      "released_credits"
    ],
    "title": "BillingOverview"
  },
  "ReservationPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/components/schemas/ReservationView"
        },
        "type": "array",
        "title": "Items"
      },
      "next_cursor": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Next Cursor"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "items",
      "next_cursor"
    ],
    "title": "ReservationPage"
  },
  "OrderPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/components/schemas/OrderView"
        },
        "type": "array",
        "title": "Items"
      },
      "next_cursor": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Next Cursor"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "items",
      "next_cursor"
    ],
    "title": "OrderPage"
  },
  "AdminOverview": {
    "properties": {
      "customers": {
        "type": "integer",
        "title": "Customers"
      },
      "verified_customers": {
        "type": "integer",
        "title": "Verified Customers"
      },
      "available_credits": {
        "type": "integer",
        "title": "Available Credits"
      },
      "reserved_credits": {
        "type": "integer",
        "title": "Reserved Credits"
      },
      "active_prepaid_access": {
        "type": "integer",
        "title": "Active Prepaid Access"
      },
      "job_states": {
        "additionalProperties": {
          "type": "integer"
        },
        "type": "object",
        "title": "Job States"
      },
      "spending_blocked": {
        "type": "boolean",
        "title": "Spending Blocked"
      },
      "checkout_available": {
        "type": "boolean",
        "const": false,
        "title": "Checkout Available",
        "default": false
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "customers",
      "verified_customers",
      "available_credits",
      "reserved_credits",
      "active_prepaid_access",
      "job_states",
      "spending_blocked"
    ],
    "title": "AdminOverview"
  },
  "CustomerPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/components/schemas/CustomerView"
        },
        "type": "array",
        "title": "Items"
      },
      "next_cursor": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Next Cursor"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "items",
      "next_cursor"
    ],
    "title": "CustomerPage"
  },
  "StaffJobPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/components/schemas/StaffJob"
        },
        "type": "array",
        "title": "Items"
      },
      "next_cursor": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Next Cursor"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "items",
      "next_cursor"
    ],
    "title": "StaffJobPage"
  },
  "UsageView": {
    "properties": {
      "estimated_usd": {
        "type": "string",
        "title": "Estimated Usd"
      },
      "actual_usd": {
        "type": "string",
        "title": "Actual Usd"
      },
      "held_or_unknown_usd": {
        "type": "string",
        "title": "Held Or Unknown Usd"
      },
      "attempts": {
        "type": "integer",
        "title": "Attempts"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "estimated_usd",
      "actual_usd",
      "held_or_unknown_usd",
      "attempts"
    ],
    "title": "UsageView"
  },
  "PolicyView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "limits": {
        "$ref": "#/components/schemas/BudgetLimits-Output"
      },
      "breaker": {
        "type": "boolean",
        "title": "Breaker"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "limits",
      "breaker"
    ],
    "title": "PolicyView"
  },
  "AuditPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/components/schemas/AuditView"
        },
        "type": "array",
        "title": "Items"
      },
      "next_cursor": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Next Cursor"
      }
    },
    "type": "object",
    "required": [
      "items"
    ],
    "title": "AuditPage"
  },
  "StaffOrderView": {
    "properties": {
      "order": {
        "$ref": "#/components/schemas/OrderView"
      },
      "user_id": {
        "type": "string",
        "format": "uuid",
        "title": "User Id"
      },
      "reference": {
        "type": "string",
        "title": "Reference"
      },
      "refund": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/RefundView"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "order",
      "user_id",
      "reference",
      "refund"
    ],
    "title": "StaffOrderView"
  },
  "AdjustmentInput": {
    "properties": {
      "amount": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": -1000000000000,
        "title": "Amount"
      },
      "reason": {
        "type": "string",
        "maxLength": 500,
        "minLength": 5,
        "title": "Reason"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "amount",
      "reason"
    ],
    "title": "AdjustmentInput"
  },
  "TransactionView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "operation": {
        "type": "string",
        "title": "Operation"
      },
      "available_delta": {
        "type": "integer",
        "title": "Available Delta"
      },
      "reserved_delta": {
        "type": "integer",
        "title": "Reserved Delta"
      },
      "available_after": {
        "type": "integer",
        "title": "Available After"
      },
      "reserved_after": {
        "type": "integer",
        "title": "Reserved After"
      },
      "reservation_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Reservation Id"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "operation",
      "available_delta",
      "reserved_delta",
      "available_after",
      "reserved_after",
      "reservation_id",
      "created_at"
    ],
    "title": "TransactionView"
  },
  "PlanVersionInput": {
    "properties": {
      "price_paisa": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Price Paisa"
      },
      "included_credits": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Included Credits"
      },
      "valid_days": {
        "type": "integer",
        "enum": [
          0,
          30
        ],
        "title": "Valid Days"
      },
      "approved": {
        "type": "boolean",
        "title": "Approved",
        "default": false
      },
      "rules": {
        "$ref": "#/components/schemas/ConsumptionRules"
      },
      "reason": {
        "type": "string",
        "maxLength": 500,
        "minLength": 5,
        "title": "Reason"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "price_paisa",
      "included_credits",
      "valid_days",
      "rules",
      "reason"
    ],
    "title": "PlanVersionInput"
  },
  "PriceView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "price_paisa": {
        "type": "integer",
        "title": "Price Paisa"
      },
      "included_credits": {
        "type": "integer",
        "title": "Included Credits"
      },
      "valid_days": {
        "type": "integer",
        "title": "Valid Days"
      },
      "approved": {
        "type": "boolean",
        "title": "Approved"
      },
      "rules": {
        "$ref": "#/components/schemas/ConsumptionRules"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "price_paisa",
      "included_credits",
      "valid_days",
      "approved",
      "rules"
    ],
    "title": "PriceView"
  },
  "EntitlementInput": {
    "properties": {
      "price_version_id": {
        "type": "string",
        "format": "uuid",
        "title": "Price Version Id"
      },
      "reason": {
        "type": "string",
        "maxLength": 500,
        "minLength": 5,
        "title": "Reason"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "price_version_id",
      "reason"
    ],
    "title": "EntitlementInput"
  },
  "EntitlementView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "price_version_id": {
        "type": "string",
        "format": "uuid",
        "title": "Price Version Id"
      },
      "starts_at": {
        "type": "string",
        "format": "date-time",
        "title": "Starts At"
      },
      "ends_at": {
        "anyOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "null"
          }
        ],
        "title": "Ends At"
      },
      "active": {
        "type": "boolean",
        "title": "Active"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "price_version_id",
      "starts_at",
      "ends_at",
      "active"
    ],
    "title": "EntitlementView"
  },
  "TranscriptData": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 1000000,
        "title": "Text"
      },
      "words": {
        "items": {
          "$ref": "#/components/schemas/Word"
        },
        "type": "array",
        "maxItems": 40000,
        "title": "Words"
      },
      "confidence": {
        "type": "number",
        "maximum": 1,
        "minimum": 0,
        "title": "Confidence"
      },
      "duration_seconds": {
        "type": "number",
        "maximum": 7201,
        "exclusiveMinimum": 0,
        "title": "Duration Seconds"
      },
      "utterances": {
        "items": {
          "additionalProperties": true,
          "type": "object"
        },
        "type": "array",
        "maxItems": 10000,
        "title": "Utterances"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text",
      "words",
      "confidence",
      "duration_seconds"
    ],
    "title": "TranscriptData"
  },
  "SuggestionView": {
    "properties": {
      "start_sec": {
        "type": "number",
        "title": "Start Sec"
      },
      "end_sec": {
        "type": "number",
        "title": "End Sec"
      },
      "title": {
        "type": "string",
        "maxLength": 160,
        "minLength": 1,
        "title": "Title"
      },
      "hook": {
        "type": "string",
        "maxLength": 300,
        "minLength": 1,
        "title": "Hook"
      },
      "reason": {
        "type": "string",
        "maxLength": 500,
        "minLength": 1,
        "title": "Reason"
      },
      "score": {
        "type": "number",
        "maximum": 100,
        "minimum": 0,
        "title": "Score"
      },
      "keywords": {
        "items": {
          "type": "string",
          "maxLength": 60,
          "minLength": 1
        },
        "type": "array",
        "maxItems": 10,
        "title": "Keywords"
      },
      "hashtags": {
        "items": {
          "type": "string",
          "maxLength": 60,
          "minLength": 1
        },
        "type": "array",
        "maxItems": 10,
        "title": "Hashtags"
      },
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "rank": {
        "type": "integer",
        "title": "Rank"
      },
      "job_id": {
        "type": "string",
        "format": "uuid",
        "title": "Job Id"
      },
      "transcript_id": {
        "type": "string",
        "format": "uuid",
        "title": "Transcript Id"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "start_sec",
      "end_sec",
      "title",
      "hook",
      "reason",
      "score",
      "keywords",
      "hashtags",
      "id",
      "rank",
      "job_id",
      "transcript_id"
    ],
    "title": "SuggestionView"
  },
  "CaptionWord": {
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 80,
        "minLength": 1,
        "title": "Text"
      },
      "start_ms": {
        "type": "integer",
        "maximum": 7200000,
        "minimum": 0,
        "title": "Start Ms"
      },
      "end_ms": {
        "type": "integer",
        "maximum": 7200000,
        "minimum": 0,
        "title": "End Ms"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "text",
      "start_ms",
      "end_ms"
    ],
    "title": "CaptionWord"
  },
  "PlanView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "slug": {
        "type": "string",
        "title": "Slug"
      },
      "kind": {
        "type": "string",
        "title": "Kind"
      },
      "enabled": {
        "type": "boolean",
        "title": "Enabled"
      },
      "currency": {
        "type": "string",
        "const": "PKR",
        "title": "Currency",
        "default": "PKR"
      },
      "auto_renews": {
        "type": "boolean",
        "const": false,
        "title": "Auto Renews",
        "default": false
      },
      "credit_expiry": {
        "type": "string",
        "const": "disabled",
        "title": "Credit Expiry",
        "default": "disabled"
      },
      "price": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PriceView"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "slug",
      "kind",
      "enabled",
      "price"
    ],
    "title": "PlanView"
  },
  "ReservationView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "job_id": {
        "type": "string",
        "format": "uuid",
        "title": "Job Id"
      },
      "credits": {
        "type": "integer",
        "title": "Credits"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "updated_at": {
        "type": "string",
        "format": "date-time",
        "title": "Updated At"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "job_id",
      "credits",
      "state",
      "created_at",
      "updated_at"
    ],
    "title": "ReservationView"
  },
  "OrderView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "price_version_id": {
        "type": "string",
        "format": "uuid",
        "title": "Price Version Id"
      },
      "provider": {
        "type": "string",
        "title": "Provider"
      },
      "amount_paisa": {
        "type": "integer",
        "title": "Amount Paisa"
      },
      "currency": {
        "type": "string",
        "const": "PKR",
        "title": "Currency"
      },
      "credits": {
        "type": "integer",
        "title": "Credits"
      },
      "valid_days": {
        "type": "integer",
        "title": "Valid Days"
      },
      "state": {
        "type": "string",
        "title": "State"
      },
      "expires_at": {
        "type": "string",
        "format": "date-time",
        "title": "Expires At"
      },
      "paid_at": {
        "anyOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "null"
          }
        ],
        "title": "Paid At"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "sandbox": {
        "type": "boolean",
        "const": true,
        "title": "Sandbox",
        "default": true
      },
      "auto_renews": {
        "type": "boolean",
        "const": false,
        "title": "Auto Renews",
        "default": false
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "price_version_id",
      "provider",
      "amount_paisa",
      "currency",
      "credits",
      "valid_days",
      "state",
      "expires_at",
      "paid_at",
      "created_at"
    ],
    "title": "OrderView"
  },
  "CustomerView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "email": {
        "type": "string",
        "title": "Email"
      },
      "status": {
        "type": "string",
        "title": "Status"
      },
      "verified": {
        "type": "boolean",
        "title": "Verified"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      },
      "available_credits": {
        "type": "integer",
        "title": "Available Credits"
      },
      "reserved_credits": {
        "type": "integer",
        "title": "Reserved Credits"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "email",
      "status",
      "verified",
      "created_at",
      "available_credits",
      "reserved_credits"
    ],
    "title": "CustomerView"
  },
  "StaffJob": {
    "properties": {
      "user_id": {
        "type": "string",
        "format": "uuid",
        "title": "User Id"
      },
      "job": {
        "$ref": "#/components/schemas/JobView"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "user_id",
      "job"
    ],
    "title": "StaffJob"
  },
  "BudgetLimits-Output": {
    "properties": {
      "per_job_usd": {
        "type": "string",
        "title": "Per Job Usd",
        "decimal_places": 10,
        "ge": 0,
        "le": "1000000",
        "max_digits": 20
      },
      "user_daily_usd": {
        "type": "string",
        "title": "User Daily Usd",
        "decimal_places": 10,
        "ge": 0,
        "le": "1000000",
        "max_digits": 20
      },
      "user_monthly_usd": {
        "type": "string",
        "title": "User Monthly Usd",
        "decimal_places": 10,
        "ge": 0,
        "le": "1000000",
        "max_digits": 20
      },
      "global_daily_usd": {
        "type": "string",
        "title": "Global Daily Usd",
        "decimal_places": 10,
        "ge": 0,
        "le": "1000000",
        "max_digits": 20
      },
      "global_monthly_usd": {
        "type": "string",
        "title": "Global Monthly Usd",
        "decimal_places": 10,
        "ge": 0,
        "le": "1000000",
        "max_digits": 20
      },
      "max_open_reservations": {
        "type": "integer",
        "maximum": 1000,
        "minimum": 1,
        "title": "Max Open Reservations"
      },
      "rate_ids": {
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "type": "array",
        "maxItems": 5,
        "minItems": 1,
        "title": "Rate Ids"
      },
      "input_tokens_per_second": {
        "type": "integer",
        "maximum": 1000,
        "minimum": 1,
        "title": "Input Tokens Per Second"
      },
      "max_output_tokens": {
        "type": "integer",
        "maximum": 100000,
        "minimum": 1,
        "title": "Max Output Tokens"
      },
      "render_cpu_seconds_per_output": {
        "type": "integer",
        "maximum": 100000,
        "minimum": 1,
        "title": "Render Cpu Seconds Per Output"
      },
      "storage_gb_days_per_output": {
        "type": "integer",
        "maximum": 10000,
        "minimum": 1,
        "title": "Storage Gb Days Per Output"
      },
      "max_attempts_per_job": {
        "type": "integer",
        "maximum": 100,
        "minimum": 1,
        "title": "Max Attempts Per Job"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "per_job_usd",
      "user_daily_usd",
      "user_monthly_usd",
      "global_daily_usd",
      "global_monthly_usd",
      "max_open_reservations",
      "rate_ids",
      "input_tokens_per_second",
      "max_output_tokens",
      "render_cpu_seconds_per_output",
      "storage_gb_days_per_output",
      "max_attempts_per_job"
    ],
    "title": "BudgetLimits"
  },
  "AuditView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "actor_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Actor Id"
      },
      "action": {
        "type": "string",
        "title": "Action"
      },
      "target_id": {
        "anyOf": [
          {
            "type": "string",
            "format": "uuid"
          },
          {
            "type": "null"
          }
        ],
        "title": "Target Id"
      },
      "request_id": {
        "type": "string",
        "title": "Request Id"
      },
      "created_at": {
        "type": "string",
        "format": "date-time",
        "title": "Created At"
      }
    },
    "type": "object",
    "required": [
      "id",
      "actor_id",
      "action",
      "target_id",
      "request_id",
      "created_at"
    ],
    "title": "AuditView"
  },
  "RefundView": {
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid",
        "title": "Id"
      },
      "order_id": {
        "type": "string",
        "format": "uuid",
        "title": "Order Id"
      },
      "kind": {
        "type": "string",
        "title": "Kind"
      },
      "amount_paisa": {
        "type": "integer",
        "title": "Amount Paisa"
      },
      "recovered_credits": {
        "type": "integer",
        "title": "Recovered Credits"
      },
      "unrecovered_credits": {
        "type": "integer",
        "title": "Unrecovered Credits"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "id",
      "order_id",
      "kind",
      "amount_paisa",
      "recovered_credits",
      "unrecovered_credits"
    ],
    "title": "RefundView"
  },
  "ConsumptionRules": {
    "properties": {
      "minimum_job_credits": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Minimum Job Credits",
        "default": 0
      },
      "credits_per_minute": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 1,
        "title": "Credits Per Minute"
      },
      "credits_per_output": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Credits Per Output"
      },
      "credits_per_edit": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Credits Per Edit"
      },
      "captions_credits": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Captions Credits"
      },
      "reframe_credits": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 0,
        "title": "Reframe Credits"
      },
      "max_source_seconds": {
        "type": "integer",
        "maximum": 7200,
        "minimum": 1,
        "title": "Max Source Seconds"
      },
      "max_outputs": {
        "type": "integer",
        "maximum": 100,
        "minimum": 1,
        "title": "Max Outputs"
      },
      "max_edits": {
        "type": "integer",
        "maximum": 100,
        "minimum": 0,
        "title": "Max Edits"
      },
      "max_concurrent_jobs": {
        "type": "integer",
        "maximum": 10,
        "minimum": 1,
        "title": "Max Concurrent Jobs"
      },
      "daily_credits": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 1,
        "title": "Daily Credits"
      },
      "monthly_credits": {
        "type": "integer",
        "maximum": 1000000000000,
        "minimum": 1,
        "title": "Monthly Credits"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "credits_per_minute",
      "credits_per_output",
      "credits_per_edit",
      "captions_credits",
      "reframe_credits",
      "max_source_seconds",
      "max_outputs",
      "max_edits",
      "max_concurrent_jobs",
      "daily_credits",
      "monthly_credits"
    ],
    "title": "ConsumptionRules"
  },
  "Word": {
    "properties": {
      "word": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Word"
      },
      "punctuated_word": {
        "type": "string",
        "maxLength": 200,
        "minLength": 1,
        "title": "Punctuated Word"
      },
      "start": {
        "type": "number",
        "minimum": 0,
        "title": "Start"
      },
      "end": {
        "type": "number",
        "exclusiveMinimum": 0,
        "title": "End"
      },
      "confidence": {
        "type": "number",
        "maximum": 1,
        "minimum": 0,
        "title": "Confidence"
      },
      "speaker": {
        "anyOf": [
          {
            "type": "integer",
            "maximum": 1000,
            "minimum": 0
          },
          {
            "type": "null"
          }
        ],
        "title": "Speaker"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "word",
      "punctuated_word",
      "start",
      "end",
      "confidence"
    ],
    "title": "Word"
  }
} as const
