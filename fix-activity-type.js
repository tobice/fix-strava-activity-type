import log from "@apify/log";
import { MAX_RUNNING_SPEED_KMH, MIN_RUNNING_SPEED_KMH, STRAVA_API_TOKEN } from "./config.js";

log.setLevel(log.LEVELS.DEBUG);

const allActivities = await fetchAllActivities();

log.info("Fetched activities from Strava", { count: allActivities.length });

for (const activity of allActivities) {
    if (activity.type !== "Run") {
        log.debug("Skipping activity as it is not a run", { type: activity.type, url: getStravaUrl(activity) })
        continue;
    }

    const averageSpeedKmph = getAverageSpeedKmph(activity);

    if (averageSpeedKmph > MAX_RUNNING_SPEED_KMH) {
        const update = {
            id: activity.id,
            type: "Ride",
            name: `${getDistanceKmStr(activity)} Ride`,
        };
        log.info("Activity is too fast, changing to ride", { averageSpeedKmph, url: getStravaUrl(activity), update });
        await updateActivity(update);
        continue;
    }

    if (averageSpeedKmph < MIN_RUNNING_SPEED_KMH) {
        const update = {
            id: activity.id,
            type: "Walk",
            name: `${getDistanceKmStr(activity)} Walk`,
        };
        log.info("Activity is too slow, changing to walk", { averageSpeedKmph, url: getStravaUrl(activity), update });
        await updateActivity(update);
        continue;
    }

    log.debug("Run looks legit", { averageSpeedKmph, url: getStravaUrl(activity) });
}

function getStravaUrl(activity) {
    return `https://www.strava.com/activities/${activity.id}`;
}

function getDistanceKmStr(activity) {
    return `${Math.round(activity.distance / 10) / 100}km`;
}

function getAverageSpeedKmph(activity) {
    return Math.round((activity.average_speed * 3.6) * 100) / 100;
}

async function updateActivity(activity) {
    const response = await fetch(
        `https://www.strava.com/api/v3/activities/${activity.id}`,
        {
            ...getStravaRequestOptions(),
            method: "PUT",
            body: JSON.stringify(activity),
        });

    if (!response.ok) {
        await logNotOk(response);
        throw new Error("Updating activity failed");
    }
}

async function fetchAllActivities() {
    const perPage = 200; // Max allowed by Strava API
    const beforeSeconds = Math.floor(Date.now() / 1000);

    let allActivities = [];
    let page = 1;
    let activities = [];

    do {
        const response = await fetch(
            `https://www.strava.com/api/v3/athlete/activities?before=${beforeSeconds}&after=0&page=${page}&per_page=${perPage}`,
            getStravaRequestOptions());

        if (!response.ok) {
            await logNotOk(response);
            throw new Error("Fetching failed");
        }

        activities = await response.json();
        allActivities = allActivities.concat(activities);

        log.debug("Fetched a page of activities", { page, count: activities.length });

        page++;
    } while (activities.length > 0);

    return allActivities;
}

function getStravaRequestOptions() {
    return {
        credentials: "include",
        headers: {
            "Authorization": `Bearer ${STRAVA_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        method: "GET",
        mode: "cors"
    }
}

async function logNotOk(response) {
    let errorDetails;
    try {
        errorDetails = await response.json();
    } catch (jsonError) {
        // If response is not JSON, fallback to text
        try {
            errorDetails = await response.text();
        } catch (error) {
            errorDetails = "<Failed to parse response body; perhaps there is none>";
        }
    }

    log.error("Request failed", {
        status: response.status,
        statusText: response.statusText,
        errorDetails,
    });
}
