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
        chrome.tabGroups?.update(groupId, { ...authGroupOptions, collapsed: true });
      })
    });
  })
}

function getState() {
  return chrome.storage.sync.get(['state'])
    .then(({ state = {} }) => state);
}

function getAutoNavigateSetting() {
  return getState()
    .then(state => state['auto-navigate']);
}

function getAutoLoginSetting() {
  return getState()
    .then(state => state['auto-login']);
}

function getCredentials() {
  return getState()
    .then(state => [state.username, state.password]);
}

const enterGateway = (username, password) => {
  console.log('Extension accessed')
  usernameInput = document.getElementById("ft_un");
  usernameInput.value = username;
  passwordInput = document.getElementById("ft_pd");
  passwordInput.value = password;
  document.forms[0].submit();
}

function logout() {
  chrome.tabs.create({
    url: `https://gateway.iitj.ac.in:1003/logout?${token}`,
  })
}