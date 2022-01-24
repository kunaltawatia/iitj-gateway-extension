function save() {
  console.log('Saving');
  chrome.storage.sync.set({
    un: document.getElementById("un").value ?? '',
    pd: document.getElementById("pd").value ?? '',
  }).then(() => console.log('Saved'));
}
document.getElementById("save").addEventListener("click", save);

window.onload = () => {
  chrome.storage.sync.get(['un', 'pd'])
    .then(({ un, pd }) => {
      document.getElementById("un").value = un ?? '';
      document.getElementById("pd").value = pd ?? '';
    })
}