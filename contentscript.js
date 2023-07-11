async function beginOperations() {
  // Query the active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  const currentUrl = activeTab.url;
  const currentTitle = activeTab.title;
  var trackedURLs = JSON.parse(localStorage.getItem("jobsUrlTracking")) || {};

  updateLastVisits(currentUrl, currentTitle);
  displayTrackedURLs(currentUrl, currentTitle, trackedURLs);
}

// Updates the last visited history and displays it in the extension badge and UI.
async function updateLastVisits(currentUrl, currentTitle) {
  const today = new Date();
  var beforeTodayVisitDiff;

  // Get the last visits for the current URL
  const lastVisits = await new Promise((resolve) => {
    chrome.history.getVisits({ url: currentUrl }, (lastVisits) => {
      resolve(lastVisits);
    });
  });

  // Extract the visit times from the visits array
  const latestTimes = lastVisits.slice(0, -1).map((v) => new Date(v.visitTime));

  // Determine the latest visit times
  const lastVisitsResult = await getLatestTimes(latestTimes, today);
  const todayVisit = lastVisitsResult.todayVisit;
  const beforeTodayVisit = lastVisitsResult.beforeTodayVisit;

  // Set badge text based on the number of visits and latest visit time
  // if (lastVisits.length === 0) {
  //   // Set badge text to "NV" if there is no visit
  //   chrome.action.setBadgeText({ text: "NV" });
  // } else if (beforeTodayVisit === undefined) {
  //   // Set badge text to "NT" if there is no visit before today
  //   chrome.action.setBadgeText({ text: "NT" });
  // } else {
  //   // Calculate the time difference between the latest visit and today
  //   beforeTodayVisitDiff = getTimeDifference(beforeTodayVisit, today);
  //   // Set badge text based on the time difference
  //   chrome.action.setBadgeText({ text: beforeTodayVisitDiff });
  // }

  // Display the last visit information in a table
  if (todayVisit !== undefined || beforeTodayVisit !== undefined) {
    beforeTodayVisitDiff = getTimeDifference(beforeTodayVisit, today);
    const ul = document.getElementById("lastVisits");
    ul.textContent = "";
    const currentUrlVisitData = {
      title: `${currentTitle} visits`,
      columns: ["Last visit", "Timestamp"],
      data: [],
    };
    if (todayVisit) {
      currentUrlVisitData.data.push(["Today", todayVisit.toLocaleString()]);
    }
    if (beforeTodayVisit) {
      currentUrlVisitData.data.push([
        beforeTodayVisitDiff,
        beforeTodayVisit.toLocaleString(),
      ]);
    }
    ul.appendChild(createTable(currentUrlVisitData));
    ul.style.removeProperty("display");
  }
}

// Displays the UI to save URL to be tracked
function displaySaveUrlOption(currentUrl, currentTitle) {
  const urlInput = document.getElementById("urlInput");
  urlInput.value = currentUrl;
  const urlTitleInput = document.getElementById("urlTitleInput");
  urlTitleInput.value = currentTitle;
  const addURL = document.getElementById("addURLButton");
  addURL.onclick = () => {
    saveURL();
  };
  const addURLdiv = document.getElementById("addURLdiv");
  addURLdiv.style.removeProperty("display");
}

function displayTrackedURLs(currentUrl, currentTitle, trackedURLs) {
  const ul = document.getElementById("urlsToVisit");
  const today = new Date();
  var trackedURLsArray = [];
  var shouldDisplaySaveOption = true;

  ul.textContent = "";

  // Get the keys of the JSON object
  const keys = Object.keys(trackedURLs);

  if (keys.length > 0) {
    // Loop through the keys
    for (let i = 0; i < keys.length; i++) {
      const value = trackedURLs[keys[i]];
      if (currentUrl.startsWith(value.url)) {
        value.lastVisited = new Date().getTime();
        trackedURLs[keys[i]].lastVisited = new Date().getTime();
        shouldDisplaySaveOption = false;
      }
      trackedURLsArray.push([
        value.lastVisited,
        value.url,
        value.title,
        getTimeDifference(new Date(value.lastVisited), today),
      ]);
    }

    localStorage.setItem("jobsUrlTracking", JSON.stringify(trackedURLs));

    if (shouldDisplaySaveOption) {
      displaySaveUrlOption(currentUrl, currentTitle);
    }
    trackedURLsArray.sort((a, b) => a[0] - b[0]);

    const rowsForTable = trackedURLsArray.map((urlData) => [
      urlData[3],
      `<a href="${urlData[1]}">${urlData[2]}</a>`,
    ]);
    const dataForTable = {
      title: "Pages to visit",
      columns: ["Last visit", "Link"],
      data: rowsForTable,
    };

    ul.appendChild(createTable(dataForTable));
    ul.style.removeProperty("display");
  } else {
    displaySaveUrlOption(currentUrl, currentTitle);
  }
}

// Calculates the time difference between two dates in days, months, or years
function getTimeDifference(startDate, endDate) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  const diff = endTime - startTime;

  const days =
    Math.floor(diff / (1000 * 60 * 60 * 24)) ||
    endDate.getDate() - startDate.getDate();
  const months = days > 30 ? endDate.getMonth() - startDate.getMonth() : 0;
  const years =
    Math.floor(diff / (1000 * 60 * 60 * 24 * 12)) > 12
      ? endDate.getFullYear() - startDate.getFullYear()
      : 0;

  if (years > 0) {
    return `${years}y ago`;
  } else if (months > 0) {
    return `${months}m ago`;
  } else if (days > 0) {
    return `${days}d ago`;
  } else {
    return "Today";
  }
}

// Retrieves the latest times from an array of dates
async function getLatestTimes(dates, today) {
  const todayKey = today.toDateString();
  var todayVisit;
  var beforeTodayVisit;

  for (const date of dates) {
    const dateKey = date.toDateString();
    if (today.getTime() - date.getTime() > 300000) {
      if (dateKey === todayKey) {
        todayVisit = date;
      } else {
        beforeTodayVisit = date;
      }
    }
  }

  return {
    todayVisit: todayVisit,
    beforeTodayVisit: beforeTodayVisit,
  };
}

function createTable(tableData) {
  // Create a table element
  const table = document.createElement("table");
  const header = table.createTHead();
  const body = table.createTBody();
  var firstCell = true;
  var rowHeight = "10px";

  // Set the table's styles
  table.style.border = "1px solid black";
  table.style.borderRadius = "5px";
  table.style.borderCollapse = "separate";
  table.style.width = "21em";

  // Create a header row
  const headerRow = document.createElement("tr");

  // create title row
  const titleCell = document.createElement("th");
  titleCell.textContent = tableData.title;
  titleCell.colSpan = tableData.columns.length;
  titleCell.style.borderBottom = "1px solid black";
  titleCell.style.textAlign = "center";
  header.appendChild(titleCell);

  // Add the header row's cells
  for (const column of tableData.columns) {
    const headerCell = document.createElement("th");
    headerCell.style.textAlign = "center";
    headerCell.textContent = column;
    if (firstCell) {
      firstCell = false;
    } else {
      headerCell.style.borderLeft = "1px solid black";
    }
    headerRow.appendChild(headerCell);
  }

  // Add the header row to the table
  header.appendChild(headerRow);

  // Create rows for each data item
  for (const item of tableData.data) {
    const row = document.createElement("tr");
    firstCell = true;
    // Add the data item's values to the row's cells
    for (const value of item) {
      const cell = document.createElement("td");
      cell.style.borderTop = "1px solid black";
      cell.style.textAlign = "center";
      if (firstCell) {
        firstCell = false;
      } else {
        cell.style.borderLeft = "1px solid black";
      }
      cell.innerHTML = value;
      row.appendChild(cell);
    }
    // Add the row to the table
    body.appendChild(row);

    rowHeight = row.clientHeight;
  }

  // Return the table element
  return table;
}

function saveURL() {
  const urlInput = document.getElementById("urlInput");
  const urlToSave = urlInput.value;
  const urlTitleInput = document.getElementById("urlTitleInput");
  const titleToSave = urlTitleInput.value;
  const trackedURLs = JSON.parse(localStorage.getItem("jobsUrlTracking")) || {};
  trackedURLs[urlToSave] = {
    url: urlToSave,
    title: titleToSave,
    lastVisited: new Date().getTime(),
  };
  localStorage.setItem("jobsUrlTracking", JSON.stringify(trackedURLs));
  const urlAdded = document.getElementById("urlAdded");
  urlAdded.style.removeProperty("display");

  displayTrackedURLs(urlToSave, "", trackedURLs);
}

if (chrome.tabs) {
  window.addEventListener("load", beginOperations);
  // Register the event listener
  chrome.tabs.onActivated.addListener(function (activeInfo) {
    beginOperations();
  });

  // Add event listener for tab updates
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Check if the URL has changed
    if (changeInfo.url) {
      beginOperations();
    }
  });
}
