// Generated from backend/docs/openapi.json. Do not edit.
// Source SHA-256: 533c20db9917b055599add95c334a04a901953ba6f7b2ae8815cf452ade626fe
export interface WorkspaceSchemas {
  "VideoView": { "id": string; "project_id": string; "state": string; "metadata_json": Record<string, unknown>; "created_at": string; "expires_at": string }
  "JobView": { "id": string; "video_id": string; "kind": string; "state": string; "error_code": string | null; "attempts": number; "created_at": string; "updated_at": string; "stage": string; "progress_percent": number | null; "estimated_credits": number | null; "heartbeat_at": string | null; "queue_position"?: null; "reservation_id": string | null }
  "ClipView": { "id": string; "video_id": string; "job_id": string; "revision": number; "preferences": WorkspaceSchemas["Preferences"]; "created_at": string }
  "WalletView": { "available_credits": number; "reserved_credits": number; "credit_expiry"?: "disabled" }
  "TransactionPage": { "items": Array<WorkspaceSchemas["TransactionView"]>; "next_cursor": string | null }
  "EntitlementView": { "id": string; "price_version_id": string; "starts_at": string; "ends_at": string | null; "active": boolean }
  "PlanView": { "id": string; "slug": string; "kind": string; "enabled": boolean; "currency"?: "PKR"; "auto_renews"?: false; "credit_expiry"?: "disabled"; "price": WorkspaceSchemas["PriceView"] | null }
  "Preferences": { "start_ms": number; "end_ms": number; "title"?: string; "hashtags"?: Array<string>; "captions"?: boolean; "preset"?: "classic" | "bold" | "karaoke"; "font"?: "DejaVu Sans" | "Noto Sans" | "Noto Naskh Arabic"; "placement"?: "bottom" | "middle" | "top"; "frame"?: "track" | "center" | "pad" | "manual"; "focal_x"?: number; "focal_y"?: number; "words"?: Array<WorkspaceSchemas["CaptionWord"]> | null }
  "TransactionView": { "id": string; "operation": string; "available_delta": number; "reserved_delta": number; "available_after": number; "reserved_after": number; "reservation_id": string | null; "created_at": string }
  "PriceView": { "id": string; "price_paisa": number; "included_credits": number; "valid_days": number; "approved": boolean; "rules": WorkspaceSchemas["ConsumptionRules"] }
  "CaptionWord": { "text": string; "start_ms": number; "end_ms": number }
  "ConsumptionRules": { "credits_per_minute": number; "credits_per_output": number; "credits_per_edit": number; "captions_credits": number; "reframe_credits": number; "max_source_seconds": number; "max_outputs": number; "max_edits": number; "max_concurrent_jobs": number; "daily_credits": number; "monthly_credits": number }
}
export interface WorkspaceResponses {
  videos: Array<WorkspaceSchemas["VideoView"]>
  jobs: Array<WorkspaceSchemas["JobView"]>
  clips: Array<WorkspaceSchemas["ClipView"]>
  wallet: WorkspaceSchemas["WalletView"]
  transactions: WorkspaceSchemas["TransactionPage"]
  entitlements: Array<WorkspaceSchemas["EntitlementView"]>
  plans: Array<WorkspaceSchemas["PlanView"]>
}
export const workspaceDescriptors = {
  "videos": {
    "path": "/api/v1/videos",
    "cursor": "before",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/VideoView"
      },
      "title": "Response Videos Api V1 Videos Get"
    }
  },
  "jobs": {
    "path": "/api/v1/jobs",
    "cursor": "before",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/JobView"
      },
      "title": "Response Jobs Api V1 Jobs Get"
    }
  },
  "clips": {
    "path": "/api/v1/clips",
    "cursor": "before",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ClipView"
      },
      "title": "Response Listing Api V1 Clips Get"
    }
  },
  "wallet": {
    "path": "/api/v1/me/credits",
    "cursor": null,
    "response": {
      "$ref": "#/components/schemas/WalletView"
    }
  },
  "transactions": {
    "path": "/api/v1/me/credit-transactions",
    "cursor": "cursor",
    "response": {
      "$ref": "#/components/schemas/TransactionPage"
    }
  },
  "entitlements": {
    "path": "/api/v1/me/entitlements",
    "cursor": "cursor",
    "response": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/EntitlementView"
      },
      "title": "Response Entitlements Api V1 Me Entitlements Get"
    }
  },
  "plans": {
    "path": "/api/v1/plans",
    "cursor": null,
    "response": {
      "items": {
        "$ref": "#/components/schemas/PlanView"
      },
      "type": "array",
      "title": "Response Plans Api V1 Plans Get"
    }
  }
} as const
export const workspaceDefinitions = {
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
  "WalletView": {
    "properties": {
      "available_credits": {
        "type": "integer",
        "title": "Available Credits"
      },
      "reserved_credits": {
        "type": "integer",
        "title": "Reserved Credits"
      },
      "credit_expiry": {
        "type": "string",
        "const": "disabled",
        "title": "Credit Expiry",
        "default": "disabled"
      }
    },
    "additionalProperties": false,
    "type": "object",
    "required": [
      "available_credits",
      "reserved_credits"
    ],
    "title": "WalletView"
  },
  "TransactionPage": {
    "properties": {
      "items": {
        "items": {
          "$ref": "#/components/schemas/TransactionView"
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
    "title": "TransactionPage"
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
  "ConsumptionRules": {
    "properties": {
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
  }
} as const
