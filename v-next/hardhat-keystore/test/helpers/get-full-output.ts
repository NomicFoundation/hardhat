export function getFullOutput(mockF: any, totCalls: number): string {
  const list: string[] = [];
  for (let i = 0; i < totCalls; i++) {
    list.push(mockF.mock.calls[i].arguments[1]);
  }

  return list.join("\n");
}
