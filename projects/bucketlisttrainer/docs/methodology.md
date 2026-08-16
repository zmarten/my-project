# Methodology

The full narrative version is in `methodology.html`. This is the index the coach agent
reads, mapping each programming decision to the concept behind it.

| Concept | Source | Where it shows up |
|---|---|---|
| Interference effect, dose- and modality-dependent | Hickson 1980; Wilson et al. 2012 | Aerobic floors, and why maintenance cardio is on the bike |
| Block periodization, residual training effects | Issurin 2008/2010 | Block order. Slow-decaying qualities early, fast-decaying near their event |
| Fitness-fatigue model | Banister impulse-response | Deload weeks, taper |
| Maintenance needs intensity, not volume | Bickel et al. 2011 | `maintenanceFloorPct` in Blocks 4 and 5 |
| Protein plateau ~1.6 g/kg, higher in a deficit | Morton et al. 2018; Mettler et al. 2010 | 210 g target held constant as bodyweight falls |
| Intensity preserves lean mass under restriction | resistance-training-in-deficit literature | Block 1 at 80-88%, no metcon |
| Motor learning: frequent, fresh, distributed | skill acquisition literature | 12 min skill work before lifting, never to failure |
| Force-velocity curve | Hill | Block 2 spans heavy front squats to unloaded sprints |
| Short sets for skill lifts | Prilepin's chart, classical weightlifting | Olympic work at 5-6 x 1-2 |
| Stretch-shortening cycle, shock method | Verkhoshansky | Extensive then intensive plyos, contact caps |
| Zatsiorsky's three methods | Science and Practice of Strength Training | Block 3: maximal, repeated, dynamic effort all present |
| Intent drives velocity-specific adaptation | Behm & Sale 1993 | Speed pulls at 70%, paused bench at 65% |
| Frequency permits volume | Grgic et al. | Bench three exposures, deadlift one heavy plus one speed |
| Middle distance ~85% aerobic | Duffield et al. and similar | Why the mile needs a protected year of zone 2 |
| Repeated bout effect | Nosaka, Clarkson | Running every descent in Block 5 |
| Strength training aids endurance performance | Rønnestad & Mujika 2014 | Strength retained through Blocks 4 and 5 |
| Taper: cut volume 40-60%, hold intensity | Bosquet et al. 2007 | Block 5 weeks 9-10 |

## What is judgement rather than evidence

- Every confidence percentage. See ADR-0001.
- Inches of vertical attributed to bodyweight loss. Directionally sound, magnitude estimated.
- The specific percentage waves. Conventional and defensible; a different competent coach
  would write different numbers and get similar results.
- Deferring C&J 315. A judgement about what fits in a year, not a physiological limit.
- The block order itself, which is built around hunting season, an infant, and a new job
  as much as around physiology.

## The thing that actually decides the year

Sleep, consistency through hunting season, and whether two lower-body sessions per week
survive the cut. Plans fail on adherence far more often than on design. `v_block_adherence`
and `v_deviation_reasons` in the Supabase schema exist for exactly this reason.
