# Fix Strava activity type in bulk

Converts runs to either walks or rides depending on the average speed.

**Use with caution on your own risk!**

How to use:

1. Install `node` and run `npm install`.
2. Create a `config.js` file and populate it:
   ```javascript
    export const STRAVA_API_TOKEN = "...";
    export const MIN_RUNNING_SPEED_KMH = 7; // Slower runs will be converted to Walk
    export const MAX_RUNNING_SPEED_KMH = 15; // Faster runs will be converted to Ride
   ```
   If you are using `dlenski/stravacli`, you can find your access token in `~/.stravacli`.
3. Start the script with `npm run start`.
