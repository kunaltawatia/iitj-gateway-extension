const fetchTimeout = (url, ms, { signal, ...options } = {}) => {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal, ...options });
  if (signal) signal.addEventListener("abort", () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), ms);
  return promise.finally(() => clearTimeout(timeout));
};

function getIPaddress() {
  return fetchTimeout('https://api.ipify.org/?format=json', 2000, {
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

let authGroupId = null, authTabIds = [];
function openGateway() {
  return chrome.tabs.create({
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
      authGroupId = groupId;
      chrome.tabGroups?.update(groupId, {
        collapsed: true, title: "Auth", color: "green"
      });
    })
  });
}
function closeAuthTabs() {
  authGroupId = null;
  authTabIds = [];
  chrome.tabs.remove(authTabIds);
}
chrome.tabGroups.onRemoved.addListener((group) => {
  if (group.id == authGroupId) authGroupId = null;
})

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
}, 30000);