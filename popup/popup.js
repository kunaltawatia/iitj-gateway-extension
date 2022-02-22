const TEXT_INPUT_IDS = ["username", "password"];
const SWITCH_INPUT_IDS = ["auto-login", "auto-navigate"];
const ALL_INPUT_IDS = TEXT_INPUT_IDS.concat(SWITCH_INPUT_IDS)

function extractStateFromDocument() {
  const state = {};
  for (const id of TEXT_INPUT_IDS) {
    state[id] = document.getElementById(id).value ?? '';
  }
  for (const id of SWITCH_INPUT_IDS) {
    state[id] = document.getElementById(id).checked ?? false;
  }
  return state;
}

function embedStateToDocument(state) {
  for (const id of TEXT_INPUT_IDS) {
    document.getElementById(id).value = state[id] ?? '';
  }
  for (const id of SWITCH_INPUT_IDS) {
    document.getElementById(id).checked = state[id] ?? false;
  }
}

function save() {
  console.log('Saving');
  chrome.storage.sync.set({
    state: extractStateFromDocument()
  }).then(() => console.log('Saved'));
}

window.onload = () => {
  chrome.storage.sync.get(['state'])
    .then(({ state = {} }) => {
      embedStateToDocument(state);
      syncLDAP(state['auto-login']);
    }).finally(stopLoading);
}

for (const id of ALL_INPUT_IDS) {
  document.getElementById(id).addEventListener("change", save);
}

document.getElementById("auto-login").addEventListener("change", (element) => {
  syncLDAP(element.target.checked);
});

function syncLDAP(autoLoginValue) { (autoLoginValue ? showLDAP : hideLDAP)(); }

function hideLDAP() {
  document.getElementById("LDAP").classList.add('hidden');
}

function showLDAP() {
  document.getElementById("LDAP").classList.remove('hidden');
}

function stopLoading() {
  document.getElementById("loading-container").classList.add('hidden');
  document.getElementById("form-container").classList.remove('hidden');
}

document.getElementById('open-gateway').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'OPEN_GATEWAY' }, (err) => {
    if (err) console.error(err);
  })
});