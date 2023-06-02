// Save the current page to local storage.
function updateLastVisited() {
  if (chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // since only one tab should be active and in the current window at once
      // the return variable should only have one entry
      var activeTab = tabs[0];
      const currentUrl = activeTab.url;
      console.log(currentUrl);

      const lastVisitedTimes =
        JSON.parse(localStorage.getItem("lastVisitedTimes" + currentUrl)) || [];

      const today = new Date();
      const todayJson = {
        d: today.getDate(),
        m: today.getMonth(),
        y: today.getFullYear(),
      };

      // If there are no last 10 visited pages, then create a new array.
      if (lastVisitedTimes.length === 0) {
        chrome.action.setBadgeText({ text: "NV" });
      } else {
        const lastVisitJson = lastVisitedTimes[0][1];
        const lastVisitJson2 =
          lastVisitedTimes.length > 1
            ? lastVisitedTimes[1][1]
            : lastVisitedTimes[0][1];
        const st = getLastVisitText(todayJson, lastVisitJson, lastVisitJson2);
        chrome.action.setBadgeText({ text: st });
        if (getTimeDifference(todayJson, lastVisitJson) == "NT") {
          lastVisitedTimes.splice(0, 1);
        }
      }

      // Remove the oldest page from the last 10 visited pages array if it is more than 10 items long.
      if (lastVisitedTimes.length >= 10) {
        lastVisitedTimes.pop();
      }

      const formattedDate = today.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Add the current page to the last 10 visited pages array.
      lastVisitedTimes.unshift([formattedDate, todayJson]);

      // Create a new div element for each visited page.
      const ul = document.getElementById("lastVisits");
      ul.innerHTML = ""; // Clear the previous list
      for (let i = 0; i < lastVisitedTimes.length; i++) {
        const timeDiff = getTimeDifference(todayJson, lastVisitedTimes[i][1]);
        const li = document.createElement("li");
        li.textContent = `${timeDiff} ago, ${lastVisitedTimes[i][0]}`;
        ul.appendChild(li);
      }

      // Save the last 10 visited pages to local storage.
      localStorage.setItem(
        "lastVisitedTimes" + currentUrl,
        JSON.stringify(lastVisitedTimes)
      );
    });
  }
}

// Calculate the time difference between two dates.
function getTimeDifference(date1, date2) {
  const yearDiff = date1.y - date2.y;
  const monthDiff = date1.m - date2.m;
  const dayDiff = date1.d - date2.d;

  if (yearDiff > 0) {
    return `${yearDiff}Y`;
  } else if (monthDiff > 0) {
    return `${monthDiff}M`;
  } else if (dayDiff > 0) {
    return `${dayDiff}D`;
  } else {
    return "NT";
  }
}

// Get the text to display on the badge based on the last visit.
function getLastVisitText(todayJson, lastVisitJson, lastVisitJson2) {
  const timeDiff = getTimeDifference(todayJson, lastVisitJson);
  const timeDiff2 = getTimeDifference(todayJson, lastVisitJson2);
  return timeDiff !== "NT" ? timeDiff : timeDiff2 !== "NT" ? timeDiff2 : "NV";
}

// Listen for the "page load" event.
window.addEventListener("load", updateLastVisited);
