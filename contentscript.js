// Updates the last visited history and displays it in the extension badge and UI.
function updateLastVisited() {
  if (chrome.tabs) {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var activeTab = tabs[0];
      const currentUrl = activeTab.url;
      var today = new Date();

      // Get the last visits for the current URL
      chrome.history.getVisits({ url: currentUrl }).then(async (lastVisits) => {
        // Convert visitTime to Date objects
        lastVisits = lastVisits.map((v) => new Date(v.visitTime));

        // Get the latest times from the array of dates
        lastVisits = await getLatestTimes(lastVisits);

        if (lastVisits.length === 1) {
          // Set badge text to "NV" if there is only one visit
          chrome.action.setBadgeText({ text: "NV" });
        } else {
          // Set badge text based on the time difference between the two latest visits
          chrome.action.setBadgeText({
            text: getLastVisitText(today, ...lastVisits.slice(0, 2)),
          });
        }

        const ul = document.getElementById("lastVisits");

        // Display each visit in the UI
        lastVisits.forEach((lv) => {
          const timeDiff = getTimeDifference(lv, today);
          const li = document.createElement("li");
          li.textContent = `${timeDiff} ago, ${lv.toLocaleString()}`;
          ul.appendChild(li);
        });
      });
    });
  }
}

// Calculates the time difference between two dates in days, months, or years
function getTimeDifference(startDate, endDate) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  const diff = endTime - startTime;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));

  if (days > 0) {
    return `${days}D`;
  } else if (months > 0) {
    return `${months}M`;
  } else if (years > 0) {
    return `${years}Y`;
  } else {
    return "NT"; // "NT" stands for "No Time"
  }
}

// Determines the text to display for the last visit based on time difference
function getLastVisitText(today, lastVisit, lastVisit2) {
  const timeDiff = getTimeDifference(lastVisit, today);
  const timeDiff2 = getTimeDifference(lastVisit2, today);
  return timeDiff !== "NT" ? timeDiff : timeDiff2;
}

// Retrieves the latest times from an array of dates
async function getLatestTimes(dates) {
  const latestTimes = {};

  for (const date of dates) {
    const dateKey = date.toDateString();
    latestTimes[dateKey] = date;
  }

  const result = Object.values(latestTimes).sort((a, b) => b - a);

  return result;
}

window.addEventListener("load", updateLastVisited);

// Register the event listener
chrome.tabs.onActivated.addListener(function (activeInfo) {
  updateLastVisited();
});

// Add event listener for tab updates
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // Check if the URL has changed
  if (changeInfo.url) {
    updateLastVisited();
  }
});
