importScripts('rxjs/rxjs.umd.min.js');
importScripts('utility/connected.js');
importScripts('utility/gateway.js');

const { interval, from, merge } = rxjs;
const {
  map,
  mergeMap,
  filter,
  throttleTime,
  bufferTime,
  pairwise,
} = rxjs.operators;

const heartBeat = interval(1500);

const networkCheckObesrvable_v1 = heartBeat.pipe(
  mergeMap(() => from(isConnected(2000)))
);
const networkCheckObesrvable_v2 = heartBeat.pipe(
  mergeMap(() => from(isConnected_v2(2000)))
);

const onErrorObservable = rxjs.Observable.create(observer => {
  const listener = chrome.webRequest.onErrorOccurred.addListener(
    (details) => { observer.next(details) },
    { urls: ["<all_urls>"] }
  );
  return () => chrome.webRequest.onErrorOccurred.removeListener(listener);
});

const failedObservable = merge(
  onErrorObservable.pipe(
    filter(details => (details.error === "net::ERR_CERT_COMMON_NAME_INVALID")),
    map((details) => ({ observable: 'onError', details, time: new Date().toTimeString() }))
  ),
  networkCheckObesrvable_v1.pipe(
    filter(connected => (!connected)),
    map((connected) => ({ observable: 'network check v1', details: { connected }, time: new Date().toTimeString() }))
  ),
  networkCheckObesrvable_v2.pipe(
    filter(connected => (!connected)),
    map((connected) => ({ observable: 'network check v2', details: { connected }, time: new Date().toTimeString() }))
  )
);

failedObservable.subscribe((error) => {
  console.log('Failed observable emitted:', error);
});

const navigatorOnlineObservable = interval(100).pipe(
  map(() => navigator.onLine),
  pairwise(),
  filter(([prev_value, new_value]) => (new_value && prev_value !== new_value)),
)
navigatorOnlineObservable.subscribe(console.log);

const majorObservable = merge(
  failedObservable.pipe(
    bufferTime(1500),
    filter(failureList => ((failureList.length > 1) && navigator.onLine)),
    throttleTime(15000),
    map((failureList) => ({ observable: 'failed observable', failureList, time: new Date().toTimeString() }))
  ),
  navigatorOnlineObservable.pipe(
    map(() => ({ observable: 'window navigator online', time: new Date().toTimeString() }))
  )
);

majorObservable.subscribe((details) => {
  console.log('Major observable emitted:', details);
  getAutoNavigateSetting().then(navigate => {
    if (navigate) openGateway();
  })
});

// const onCompletedObservable = rxjs.Observable.create(observer => {
//   const listener = chrome.webRequest.onCompleted.addListener(
//     (details) => { observer.next(details) },
//     { urls: ["<all_urls>"] }
//   );
//   return () => chrome.webRequest.onCompleted.removeListener(listener);
// });

// onCompletedObservable.pipe(
//   filter(details => (!details.fromCache))
// ).subscribe(console.log);

// Clear empty tabs for the attempt of gateway
function closeEmptyAuthTabs() {
  chrome.tabs.query({ status: "complete" }, (tabs) => {
    tabs.map((tab) => {
      if ((tab.url === "" && tab.pendingUrl == "http://www.gstatic.com/generate_204") ||
        (tab.title.startsWith("www.gstatic.com") && tab.url == "http://www.gstatic.com/generate_204") ||
        (tab.url === "https://gateway.iitj.ac.in:1003/")) {
        chrome.tabs.remove(tab.id, () => console.log('Removed', tab.id));
      }
    });
  });
}
heartBeat.subscribe(closeEmptyAuthTabs);

// Handle loaded tabs of the gateway
let token = null;
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (info.status === "complete") {
    if (tab.url.startsWith("https://gateway.iitj.ac.in")) {
      if (tab.url.includes("fgtauth")) {
        getAutoLoginSetting().then(autoLogin => {
          if (autoLogin) getCredentials().then(([username, password]) => {
            if (username && password)
              chrome.scripting.executeScript({
                target: { tabId: id },
                func: enterGateway,
                args: [username, password]
              });
          });
        })
      }
      else if (tab.url.includes("keepalive")) {
        token = tab.url.split('?')[1];
      }
      else if (tab.url.includes("logout")) {
        token = null;
      }
    }
  }
});