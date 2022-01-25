const fetchTimeout = (url, ms, { signal, ...options } = {}) => {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal, ...options });
  if (signal) signal.addEventListener("abort", () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), ms);
  return promise.finally(() => clearTimeout(timeout));
};

function getIPaddress() {
  return fetchTimeout('https://api.ipify.org/?format=json', 4000, {
    mode: "cors",
  })
    .then(res => res.json())
    .then(data => data.ip)
}

function validateIPaddress(ip) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip))
    return true;
  return false;
}

function isConnected() {
  return getIPaddress()
    .then(ip => validateIPaddress(ip))
    .catch(() => false);
}

let authTabIds = [];
const authGroupOptions = {
  title: "Auth", color: "green"
};
function openGateway() {
  return chrome.tabGroups.query(authGroupOptions).then((tabGroups) => {
    authGroupId = tabGroups[0]?.id ?? null;
    chrome.tabs.create({
      url: "http://www.gstatic.com/generate_204",
      active: false,
      index: 0
    }).then(tab => {
      console.log('Tab created', tab.id);
      chrome.tabs.group({
        tabIds: tab.id,
        groupId: authGroupId,
      }, groupId => {
        console.log('Group tapped', groupId);
        authTabIds.push(tab.id);
        chrome.tabGroups?.update(groupId, { ...authGroupOptions, collapsed: true });
      })
    });
  })
}
function closeEmptyAuthTabs() {
  chrome.tabs.query({ status: "complete" }, (tabs) => {
    tabs.map((tab) => {
      if ((tab.url === "" && tab.pendingUrl == "http://www.gstatic.com/generate_204") ||
        (tab.url === "https://gateway.iitj.ac.in:1003/")) {
        chrome.tabs.remove(tab.id, () => console.log('Removed', tab.id));
      }
    });
  });
}
setInterval(closeEmptyAuthTabs, 2000);

function getCredentials() {
  return chrome.storage.sync.get(['un', 'pd'])
    .then(({ un, pd }) => [un, pd])
}

const enterGateway = (username, password) => {
  console.log('Extension accessed')
  usernameInput = document.getElementById("ft_un");
  usernameInput.value = username;
  passwordInput = document.getElementById("ft_pd");
  passwordInput.value = password;
  document.forms[0].submit();
}

let polling = false;
function poll() {
  if (!polling) console.log('Polling started');
  polling = true;
  isConnected().then(connected => {
    if (connected) {
      console.log('Connected');
      setTimeout(poll, 1000);
    }
    else {
      console.log('Connection lost');
      polling = false;
      openGateway();
    }
  });
}

let token = null;
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (info.status === "complete") {
    if (tab.url.startsWith("https://gateway.iitj.ac.in")) {
      if (tab.url.includes("fgtauth")) {
        getCredentials().then(([username, password]) => {
          if (username && password)
            chrome.scripting.executeScript({
              target: { tabId: id },
              func: enterGateway,
              args: [username, password]
            });
        });
      }
      else if (tab.url.includes("keepalive")) {
        if (!polling) poll();
        token = tab.url.split('?')[1];
        // closeAuthTabs();
      }
      else if (tab.url.includes("logout")) {
        token = null;
      }
    }
    if (tab.url == "http://www.gstatic.com/generate_204") {
      chrome.tabs.remove(tab.id);
    }
  }
});
function logout() {
  chrome.tabs.create({
    url: `https://gateway.iitj.ac.in:1003/logout?${token}`,
  })
}

poll();
// MACRO Polling
setInterval(() => {
  if (!polling) {
    poll();
  }
}, 15000);