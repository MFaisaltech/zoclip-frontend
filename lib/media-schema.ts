// Generated from backend/docs/openapi.json. Do not edit.
// Source SHA-256: 533c20db9917b055599add95c334a04a901953ba6f7b2ae8815cf452ade626fe
export interface MediaSchemas {
  "UploadInput": { "size_bytes": number; "sha256": string; "rights_attested": true }
  "UploadView": { "id": string; "video_id": string; "state": string; "expected_bytes": number; "part_bytes": number; "expires_at": string; "received_parts"?: Array<number> }
  "PartView": { "number": number; "size_bytes": number; "sha256": string }
  "JobView": { "id": string; "video_id": string; "kind": string; "state": string; "error_code": string | null; "attempts": number; "created_at": string; "updated_at": string; "stage": string; "progress_percent": number | null; "estimated_credits": number | null; "heartbeat_at": string | null; "queue_position"?: null; "reservation_id": string | null }
  "ImportInput": { "url": string; "max_bytes": number; "rights_attested": true }
  "QuoteInput": { "source_seconds": number; "output_count": number; "edit_count"?: number; "captions"?: boolean; "reframe"?: boolean }
  "QuoteView": { "id": string; "price_version_id": string; "credits": number; "request": MediaSchemas["QuoteInput"]; "expires_at": string }
  "GenerateInput": { "quote_id": string }
  "VideoView": { "id": string; "project_id": string; "state": string; "metadata_json": Record<string, unknown>; "created_at": string; "expires_at": string }
  "EventView": { "state": string; "code": string | null; "created_at": string }
}
export interface MediaOperations {
  initiate: { request: MediaSchemas["UploadInput"]; response: MediaSchemas["UploadView"] }
  upload: { request: null; response: MediaSchemas["UploadView"] }
  part: { request: null; response: MediaSchemas["PartView"] }
  complete: { request: null; response: MediaSchemas["JobView"] }
  deleteUpload: { request: null; response: null }
  importUrl: { request: MediaSchemas["ImportInput"]; response: MediaSchemas["JobView"] }
  quote: { request: MediaSchemas["QuoteInput"]; response: MediaSchemas["QuoteView"] }
  generate: { request: MediaSchemas["GenerateInput"]; response: MediaSchemas["JobView"] }
  video: { request: null; response: MediaSchemas["VideoView"] }
  job: { request: null; response: MediaSchemas["JobView"] }
  events: { request: null; response: Array<MediaSchemas["EventView"]> }
  cancel: { request: null; response: MediaSchemas["JobView"] }
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
    "idempotent": true,
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
    "idempotent": false,
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
  "GenerateInput": {
    "properties": {
      "quote_id": {
        "type": "string",
        "format": "uuid",
        "title": "Quote Id"
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
  }
} as const
