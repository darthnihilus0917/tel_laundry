import { STATUS_FLOW } from "../data/seedData.js";

export function nextStatus(status) {
  const i = STATUS_FLOW.indexOf(status);
  if (i === -1 || i === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

export function personName(list, id) {
  const found = list.find((x) => x.id === id);
  return found ? found.name : "—";
}
