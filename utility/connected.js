const fetchTimeout = (url, ms, { signal, ...options } = {}) => {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal, ...options });
  if (signal) signal.addEventListener("abort", () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), ms);
  return promise.finally(() => clearTimeout(timeout));
};

function getIPaddress(timeout = 4000) {
  return fetchTimeout('https://api.ipify.org/?format=json', timeout, {
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

function isConnected(timeout = 4000) {
  return getIPaddress(timeout)
    .then(ip => validateIPaddress(ip))
    .catch(() => false);
}

function getGoogleStatus(timeout = 4000) {
  return fetchTimeout('https://www.google.com/favicon.ico', timeout, { mode: "no-cors", method: "HEAD" });
}

function checkStatus(res) {
  return res.status === 200;
}

function isConnected_v2(timeout = 4000) {
  return getGoogleStatus(timeout)
    .then(res => checkStatus(res))
    .catch(() => false);
}
