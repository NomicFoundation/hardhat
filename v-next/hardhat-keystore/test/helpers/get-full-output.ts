export function getFullOutput(mockF: any, totCalls: number): string {
  const list = [];
  for (let i = 0; i < totCalls; i++) {
    list.push(mockF.mock.calls[i].arguments[0]);
  }

  return list.join("\n");
}
