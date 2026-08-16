# ADR-0005: Skill work precedes lifting and is never prescribed to failure

**Status:** accepted · 2026-07-28

## Context
Six of the twelve goals are skill-dependent: HSPU, bar muscle-up, ring muscle-up,
handstand walk, and both Olympic lifts. Skill acquisition is a nervous system
adaptation and behaves differently from strength. It responds to frequent short
exposures and it degrades badly under fatigue, where a rep performed with a broken
pattern rehearses the broken pattern.

## Decision
Skill work is 12 minutes, before the lifting, four days a week, never to failure.
Enforced by the `skill-placement` invariant, which fails the build if a skill group
appears after a strength group in the same session.

## Note on Block 2
The Olympic lifts are tagged `olympic`, not `strength`, so they can precede the skill
group. This is deliberate: on snatch and clean-and-jerk days the barbell work **is** the
priority speed and skill work, and it belongs first while fresh. The invariant catches
skill work displaced behind a *squat*, which is the actual failure mode.

The first run of this check caught exactly that in Block 2, Tuesday. It was a real bug.
