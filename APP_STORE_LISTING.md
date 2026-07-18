# App Store Connect listing copy

Reference copy for the App Store Connect submission form. Update the "Last updated" date
whenever this changes for a new version.

## App name
Ninja Wall Runner

## Subtitle (max 30 chars)
Wall-Jump Ninja Platformer

_(26/30 chars)_

## Promotional text (max 170 chars, editable without a new build)
Chain wall jumps into huge combos across 20 hand-built levels in 4 worlds. Climb the global
leaderboard. Free, no ads, no in-app purchases.

_(153/170 chars)_

## Description
Master the wall jump. Chain kicks off opposing walls to climb higher, dodge hazards, and rack up
combo multipliers on your way to the goal.

Ninja Wall Runner is a physics-driven platformer built around one core skill: the wall jump. Every
one of its 20 levels is hand-designed to test and reward it, from gentle introductions to tight,
technical chains that demand pixel-perfect timing.

FOUR WORLDS, 20 HAND-BUILT LEVELS
Journey through a moonlit forest, a neon-lit city, a windswept mountain, and an ancient temple —
five levels each, every one designed by hand, not generated.

CHAIN JUMPS, CHASE COMBOS
Score isn't just about reaching the goal — it's about how you get there. Chain wall jumps without
touching the ground to build an escalating multiplier, then bank it by landing safely. Beat your
own high score, saved right on your device.

CLIMB THE GLOBAL LEADERBOARD
Submit your best runs to a live global leaderboard and see how you stack up against other players
— completely optional, no account required.

BUILT FOR TOUCH
Simple on-screen controls made for one-handed portrait play, with full support for every phone
screen size.

FREE. NO ADS. NO IN-APP PURCHASES.
The full game, all 20 levels, is free to play from the first launch — no timers, no paywalls, no
ads.

## Keywords (max 100 chars, comma-separated, no spaces)
parkour,arcade,climb,combo,leaderboard,retro,skill,dash,double jump,speedrun,precision,acrobat

_(94/100 chars — "ninja", "wall", "jump", "run", "platform" are already covered by the app
name/subtitle and don't need to be repeated here.)_

## Category
- **Primary:** Games
- **Genre / Subcategory:** Arcade (Action is a reasonable second choice if App Store Connect asks
  for a secondary genre)

## Age rating
Apple's questionnaire (App Store Connect → App Information → Age Rating) will ask about
user-generated content because of the leaderboard nicknames. **See the note below before
submitting — this needs a small code change first.**

## Support URL
https://taniel-p.github.io/ninja_wall_runner/privacy-policy.html
(or a dedicated support page, if you'd rather build one later — the privacy policy page works as a
placeholder since it has a contact email on it)

## Marketing URL (optional)
Leave blank, or use the GitHub repo: https://github.com/Taniel-P/ninja_wall_runner

## Privacy Policy URL
https://taniel-p.github.io/ninja_wall_runner/privacy-policy.html

## Support / privacy contact email
knockout100@yahoo.com

---

## ⚠️ Before submitting: leaderboard nickname moderation

The leaderboard lets players type any nickname, shown publicly to everyone, with **no profanity
filter today**. Apple's Guideline 1.2 (User-Generated Content) expects apps with public UGC to
have *some* form of filtering for objectionable content, plus a way to report it. Right now this
app only has the reporting half (the privacy policy's "report a nickname" email).

Recommended fix before submission: add a lightweight client-side blocklist that rejects or
sanitizes obvious profanity/slurs in `setNickname()`, in `src/leaderboard.ts`. This doesn't need to
be exhaustive — a reasonable blocklist plus the existing email-based reporting is normally enough
to satisfy review. Let me know if you'd like me to implement this next.
