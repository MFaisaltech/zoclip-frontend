import { mediaDefinitions, type MediaSchemas } from './media-schema'
import { matches } from './workspace-api'
export type Preferences = MediaSchemas['Preferences']
export const clipOptions = {
  preset: mediaDefinitions.Preferences.properties.preset.enum,
  font: mediaDefinitions.Preferences.properties.font.enum,
  placement: mediaDefinitions.Preferences.properties.placement.enum,
  frame: mediaDefinitions.Preferences.properties.frame.enum,
}
export function timestamp(seconds: number): string {
  const ms = Math.round(seconds * 1000)
  return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000) % 60).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}.${String(ms % 1000).padStart(3,'0')}`
}
export function validPreferences(prefs: Preferences, durationMs: number): boolean {
  if (!matches({$ref: '#/components/schemas/Preferences'}, prefs, mediaDefinitions) ||
    prefs.end_ms > durationMs || prefs.end_ms - prefs.start_ms < 250 || prefs.end_ms - prefs.start_ms > 90000) return false
  let previous = prefs.start_ms
  for (const word of prefs.words ?? []) {
    if (word.start_ms < previous || word.end_ms <= word.start_ms || word.end_ms > prefs.end_ms) return false
    previous = word.end_ms
  }
  return true
}
export function captionWords(transcript: MediaSchemas['TranscriptView'], prefs: Preferences) {
  return transcript.data.words.filter(word => word.end * 1000 > prefs.start_ms && word.start * 1000 < prefs.end_ms)
    .map(word => ({text: word.punctuated_word, start_ms: Math.max(prefs.start_ms, Math.round(word.start * 1000)), end_ms: Math.min(prefs.end_ms, Math.round(word.end * 1000))}))
}
