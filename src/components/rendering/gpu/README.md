# Pipeline

occluders => visibility => main => postProcess


## Occluders

Occluders are drawn on a width x height texture in black and white. Each occluder is drawn in black.


INPUT: Occluders
OUTPUT: Occluder Texture

## Visibility

Static lights are calculated once on the CPU with a geometric algorithm and the results are stored into the visibilityTexture on the GPU


Player light and player visibility strips are calculated on GPU and stored to the visibility texture


visibility texture = 1024 x [(num static lights) + (1 player visiblity) + (1 player light)] texture

where each row is a visibility strip. They tell the distance to the nearest occluder at angle theta [-pi, pi] 


INPUT: Lights
OUTPUT: Visibility Texture

## Main renderer

Uses the occluder texture and visibility texture to basically give lights and texture to the white parts of the occluder texture

Lighting is calculated per fragment with the visibility texture for each light source

Texturing is generated on the fly with some kind of procedural noise algorithm

INPUT: Game State, Lights, Visiblity Texture, Occluders
OUTPUT: Lighting applied to the scene rendered on the screen