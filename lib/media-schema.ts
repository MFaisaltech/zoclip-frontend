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
  "TranscriptView": { "id": string; "video_id": string; "job_id": string; "model": string; "language": string; "created_at": string; "data": MediaSchemas["TranscriptData"] }
  "SuggestionsView": { "job_id": string; "state": string; "stage": string; "error_code": string | null; "items": Array<MediaSchemas["SuggestionView"]>; "rendered"?: boolean }
  "CreateClip": { "suggestion_id": string }
  "ClipView": { "id": string; "video_id": string; "job_id": string; "revision": number; "preferences": MediaSchemas["Preferences"]; "created_at": string }
  "Preferences": { "start_ms": number; "end_ms": number; "title"?: string; "hashtags"?: Array<string>; "captions"?: boolean; "preset"?: "classic" | "bold" | "karaoke"; "font"?: "DejaVu Sans" | "Noto Sans" | "Noto Naskh Arabic"; "placement"?: "bottom" | "middle" | "top"; "frame"?: "track" | "center" | "pad" | "manual"; "focal_x"?: number; "focal_y"?: number; "words"?: Array<MediaSchemas["CaptionWord"]> | null }
  "Selection": { "clip_ids": Array<string> }
  "RenderInput": { "quote_id"?: string | null; "revision": number }
  "OutputView": { "id": string; "clip_id": string; "revision": number; "job_id": string; "state": string; "metadata": Record<string, unknown>; "created_at": string }
  "TranscriptData": { "text": string; "words": Array<MediaSchemas["Word"]>; "confidence": number; "duration_seconds": number; "utterances"?: Array<Record<string, unknown>> }
  "SuggestionView": { "start_sec": number; "end_sec": number; "title": string; "hook": string; "reason": string; "score": number; "keywords": Array<string>; "hashtags": Array<string>; "id": string; "rank": number; "job_id": string; "transcript_id": string }
  "CaptionWord": { "text": string; "start_ms": number; "end_ms": number }
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
