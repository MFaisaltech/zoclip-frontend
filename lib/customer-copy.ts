export function videoStatus(state: string) {
  return ({READY: 'Ready to clip', VALIDATING: 'Checking your video', UPLOADING: 'Uploading', IMPORTING: 'Importing', FAILED: 'Upload needs attention', DELETED: 'Removed'} as Record<string, string>)[state] ?? 'Preparing your video'
}
export function jobStatus(state: string, kind: string) {
  const ingest = ['VALIDATE', 'IMPORT'].includes(kind)
  return ({COMPLETED: ingest ? 'Your video is ready.' : 'Your clips are ready.', FAILED: 'Something went wrong', CANCELED: 'Canceled', CANCEL_REQUESTED: 'Canceling…', WAITING_ENGINE: 'Clip generation is temporarily unavailable', SUGGESTIONS_READY: 'Your moments are ready to turn into clips', RUNNING: ingest ? 'Checking your video…' : 'Creating your clips…', QUEUED: ingest ? 'Preparing your video…' : 'Your video is in line'} as Record<string, string>)[state] ?? 'Creating your clips…'
}
export function durationLabel(seconds: number) {
  return seconds < 60 ? `${Math.round(seconds)} sec` : `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')} min`
}
