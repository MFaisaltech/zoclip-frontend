// Generated from backend/deploy/staging-catalog.json; run pnpm pricing:generate.
export const pricingPackages = [
  {
    "slug": "free",
    "name": "FREE",
    "pricePaisa": 0,
    "credits": 60,
    "bonusCredits": 0,
    "targetClips": 1,
    "trialMaxMinutes": 5
  },
  {
    "slug": "starter",
    "name": "STARTER",
    "pricePaisa": 29900,
    "credits": 500,
    "bonusCredits": 0,
    "targetClips": 7,
    "trialMaxMinutes": null
  },
  {
    "slug": "creator",
    "name": "CREATOR",
    "pricePaisa": 69900,
    "credits": 1300,
    "bonusCredits": 100,
    "targetClips": 20,
    "trialMaxMinutes": null
  },
  {
    "slug": "pro",
    "name": "PRO",
    "pricePaisa": 129900,
    "credits": 2400,
    "bonusCredits": 150,
    "targetClips": 38,
    "trialMaxMinutes": null
  }
] as const
