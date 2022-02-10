const { interval, from } = rxjs;
const { flatMap } = rxjs.operators;

const heartBeat = interval(2000);

const networkCheckObesrvable = heartBeat.pipe(
  flatMap(() => from(isConnected()))
);

networkCheckObesrvable.subscribe(console.log);