# Paragon Life Instagram Bot

Automated Instagram publishing and comment replies for **@paragon.life**.

## What it does

- Posts one AI-planned 4:5 feed image each day at 9:17 AM Pacific
- Uses recent owned-post performance to vary topics and avoid repetition
- Generates the image and caption with OpenAI
- Publishes directly through Meta's Instagram API with Instagram Login
- Checks recent owned posts for new comments six times per day and replies naturally
- Refreshes the long-lived Instagram token weekly
- Stores the refreshed Instagram token only as encrypted ciphertext
- Includes manual `check`, `post`, `comments`, and `refresh` jobs

## Required GitHub Actions secrets

Only two secrets are required:

- `OPENAI_API_KEY`
- `IG_ACCESS_TOKEN`

The Instagram account ID is discovered automatically from the token. The encrypted token-store key is derived locally from the OpenAI API key, so there is no third secret to maintain.

## Security

No plaintext Instagram token or OpenAI key is committed to the repository. Generated Instagram assets are intentionally public because Meta must fetch image URLs from the internet when publishing.
