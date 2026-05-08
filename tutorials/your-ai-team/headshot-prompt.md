# Headshot Prompt — LinkedIn-style portraits for your AI team

The persona master prompt already produces a tailored headshot prompt inside each persona file (under the `## Headshot prompt` section). Use this standalone template only if you want to generate the five portraits as a separate, consistent set in one place: a single image generator (ChatGPT image, Gemini Nano Banana, Midjourney, Ideogram, Flux, Canva) with the five prompts pasted in sequence.

Goal: five portraits that look like a real, varied team, not five versions of the same face.

---

```
A professional LinkedIn-style headshot of {NAME}, a {ARCHETYPE} on a small expert team.

Subject: {one short physical sketch: apparent age range, build, hair, one distinctive feature (glasses, jewellery, signature colour). Do not specify ethnicity unless the user supplies one. Default to natural variety across the five portraits.}

Expression: {pick one that fits the archetype: focused and curious for Scientist, calm and observant for Designer, confident and ready-for-action for Maker, warm and engaging for Communicator, composed and trustworthy for Manager}.

Attire: smart professional, contemporary, in {ONE SIGNATURE COLOUR per persona — assign a different colour to each of the five so they are distinguishable as a team}.

Framing: head and upper shoulders, eye-level, slight three-quarter angle, looking at camera.

Lighting: soft natural daylight, slight rim light, no harsh shadows.

Background: gentle out-of-focus interior in a warm neutral tone (not grey corporate). Slightly different background per persona so the five do not look like one shoot.

Style: photorealistic, 50mm lens look, shallow depth of field, no stylisation, no illustration, no anime, no painterly effect. Image should be safe for use as a profile picture.

Aspect ratio: square, 1024x1024.
```

---

## How to use

1. Open your persona files. Copy the `Subject:` content from each persona file's headshot section into the placeholders above, one at a time.
2. Vary the signature colour across the five so they read as a team. Suggested: deep blue (Scientist), warm orange (Designer), forest green (Maker), burgundy (Communicator), charcoal grey (Manager). Adjust to your taste.
3. Generate one portrait per persona. Save each as `{firstname}.png` next to the matching `{firstname}.md` file.
4. Optional: paste all five generated portraits back into the chat and ask the model to "spot-check that these five read as a coherent, varied team and flag any that feel off." Regenerate any outliers.

## Guardrails

- Do not specify ethnicity, religion, or any protected attribute unless you (the human) supplied it.
- Do not generate photos of real people you know without their consent.
- Treat the portraits as illustrative team avatars, not as identification photos.
