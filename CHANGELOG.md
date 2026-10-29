# Changelog

## 0.5.0 — 2026-10-29

- **Energy signature: the reference can follow a sensor.** `reference` takes an entity id as well as a number, for example the outdoor temperature. The dashed line then sits at today's temperature (rounded to half a degree), is marked "ute nu", and the finding compares the periods at today's weather. When the sensor has no value, `reference_fallback` (default 5 °C) is used.
- **Drag the reference line.** Press or drag anywhere in the chart, or use the left and right arrow keys, to read the curves at another temperature. A button, "Tillbaka till …", puts it back to the configured reference. The temperature is shown above the line.

## 0.4.3 — 2026-10-25

- The explanation line no longer repeats the chip ("Inget behov" / "Inget behov just nu", "Värme" / "Värme · ingen begränsning"). It now says since when the compressor has been running or stopped, from the compressor signal's last change: "Går sedan 16:33", "Står still sedan igår 22:05", "… sedan 21 okt 09:00". Limits, notices, the restart delay, heating stop and alarms follow as before.

## 0.4.2 — 2026-10-25

- "Inget behov just nu" no longer adds "· gradminuter …". That value is the heating season integral (it decides heating stop against the limit, and sat at its floor for days), not the degree minutes that start the compressor; the register map has none of those.
- The integral is shown where it belongs: as "Värmesäsongsintegral" in the refrigerant-circuit details next to the heating stop limit, and as the tooltip of the heating stop pill.

## 0.4.1 — 2026-10-25

- The "temporarily blocked" notice is now what it is: the restart delay the pump starts each time the compressor stops (about 5 minutes). The explanation line reads "Omstartsspärr efter stopp · 3 min kvar" ("Restart delay after a stop · 3 min left"), and the refrigerant-circuit details show the minutes left instead of "Ja".

## 0.4.0 — 2026-10-24

- New card in the same file: `custom:calibra-signature-card`. It plots the energy signature, daily kWh against daily mean outdoor temperature from long-term statistics, with one coloured series and fitted curve per period, so an old and a new heat pump can be compared at the same temperature.

## 0.3.1 — 2026-10-24

- Empty gear and immersion segments, idle pipes and the borehole use theme-neutral translucent greys, so they stay visible on Home Assistant's default light and dark backgrounds (they almost vanished on the default light theme).

## 0.3.0 — 2026-10-24

- Brine and condenser pumps are drawn on their pipes as pump symbols: a ring filled to the speed, the percentage below, and an impeller that spins faster at higher speed (still with reduced motion). The pump rows in the compressor box are gone.
- The compressor box is shorter; the tank return enters it from below.

## 0.2.2 — 2026-10-24

- The immersion heater row drops its "steg X av Y" text too; the bar shows the step. With `immersion_step_kw` the row shows the current power instead. The whole row opens the sensor's more-info.

## 0.2.1 — 2026-10-24

- Removed the "Växel X av Y (tillåtna)" text from the compressor box and the explanation line; the gear bar already shows used and allowed gears. The compressor speed takes its place, and the box is tighter.

## 0.2.0 — 2026-10-24

- The internal immersion heater gets a step bar like the compressor's gears, in both layouts: "steg 1 av 3".
- New options: `immersion_steps` (default 3) and `immersion_step_kw`.

## 0.1.1 — 2026-10-24

- The compact layout (below 560 px) also shows the immersion heater row in the compressor box: "Elpatron av", or highlighted with the active step.

## 0.1.0 — 2026-10-24

First version:
- borehole, compressor with gear limits, diverting valve, radiators, TWC tank and an optional separate water heater;
- flow arrows, and an explanation line ("why") with notices;
- the refrigerant circuit view;
- compact layout below 560 px;
- Swedish and English.
